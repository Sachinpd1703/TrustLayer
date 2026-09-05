import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ProposePaymentSchema } from "@/lib/types/schemas";
import { PolicyEvaluator } from "@/lib/engine/policy-evaluator";
import { executeRazorpayOrder } from "@/lib/razorpay/client";
import { computeAuditLogHash, computeSha256 } from "@/lib/security/audit-chain";
import { VelocityTracker } from "@/lib/engine/velocity-tracker";
import { EventBus } from "@/lib/events/event-bus";
import { VendorProvisioner } from "@/lib/fulfillment/vendor-provisioner";
import { VirtualCardManager } from "@/lib/cards/virtual-card-manager";
import { DecisionType, TransactionStatus, ApprovalTier } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Input Payload
    const parsed = ProposePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_PROPOSAL_SCHEMA",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { agentId, intent, reasoningText, reasoningHash, orderPayload, beneficiary } = parsed.data;

    // 2. Fetch Agent Profile
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      include: { department: true },
    });

    if (!agent) {
      return NextResponse.json(
        {
          error: "AGENT_NOT_FOUND",
          message: `Agent identity '${agentId}' is not registered in TrustLayer IAM registry.`,
        },
        { status: 404 }
      );
    }

    // 3. Immediate Kill-Switch Check
    if (agent.status === "REVOKED" || agent.status === "SUSPENDED") {
      EventBus.broadcast({
        id: `ev_${Date.now()}`,
        type: "KILL_SWITCH_TRIGGERED",
        timestamp: new Date().toISOString(),
        agentId,
        amountPaise: orderPayload.amountPaise,
        currency: orderPayload.currency,
        merchantId: orderPayload.merchantId,
        intent,
        decision: "DENY",
        reason: `Transaction blocked by emergency kill-switch. Agent '${agentId}' status is ${agent.status}.`,
        riskScore: 1.0,
      });

      return NextResponse.json(
        {
          decision: "DENY",
          approvalTier: "TIER_DENY",
          reason: `Agent identity '${agentId}' has been revoked/suspended. Financial access neutralized.`,
          violations: ["AGENT_STATUS_REVOKED"],
          evaluation: {
            spendCapCheck: "EXCEEDED_HARD_CEILING",
            merchantWhitelistCheck: "FAILED_UNAUTHORIZED_MERCHANT",
            mccCheck: "FAILED_BLOCKED_MCC",
            temporalCheck: "FLAGGED_AFTER_HOURS",
            velocityCheck: "FAILED_VELOCITY_CAP_EXCEEDED",
            budgetCheck: "EXCEEDED_MONTHLY_BUDGET",
            currencyCheck: "FAILED_UNSUPPORTED_CURRENCY",
            riskScoreCheck: "FLAGGED_HIGH_RISK",
            details: {
              requestedAmountPaise: orderPayload.amountPaise,
              tier1MaxOrderPaise: 0,
              tier2ThresholdPaise: 0,
              tier3ThresholdPaise: 0,
              hardCeilingPaise: 0,
              rolling24hSpendPaise: 0,
              dailySpendLimitPaise: 0,
              agentTotalSpentPaise: Number(agent.totalSpentPaise),
              agentMonthlyBudgetCap: agent.monthlyBudgetCap,
              merchantId: orderPayload.merchantId,
              mccCode: orderPayload.mccCode || "5734",
              riskScore: 1.0,
              approvalTier: "TIER_DENY",
            },
          },
        },
        { status: 403 }
      );
    }

    // 4. Fetch Active Policy
    let activePolicy = await prisma.policyRule.findFirst({
      where: {
        isActive: true,
        OR: [{ departmentId: agent.departmentId }, { departmentId: null }],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activePolicy) {
      activePolicy = await prisma.policyRule.create({
        data: {
          name: "GlobalEnterpriseSaaSPolicy",
          tier1MaxOrderPaise: 500000,
          tier2ThresholdPaise: 2500000,
          tier3ThresholdPaise: 10000000,
          hardCeilingPaise: 10000000,
          dailySpendLimitPaise: 2000000,
          allowedCurrencies: ["INR"],
          allowedMccs: ["5734", "7372", "4816", "7011", "4511"],
          blockedMccs: ["6051", "7995", "4829"],
          allowedMerchants: [
            "mid_slack_01",
            "mid_figma_01",
            "mid_aws_01",
            "mid_github_01",
            "mid_cloudflare_01",
            "mid_taj_hotels",
            "mid_indigo_air",
          ],
          riskScoreThreshold: 0.35,
        },
      });
    }

    // 5. Run Policy Decision Point (PDP)
    const evaluation = PolicyEvaluator.evaluate({
      agentId,
      amountPaise: orderPayload.amountPaise,
      currency: orderPayload.currency,
      merchantId: orderPayload.merchantId,
      mccCode: orderPayload.mccCode || "5734",
      intent,
      reasoningText,
      timestamp: new Date(),
      agentProfile: {
        totalSpentPaise: Number(agent.totalSpentPaise),
        monthlyBudgetCap: agent.monthlyBudgetCap,
        dailySpendCap: agent.dailySpendCap,
        maxPerOrderCap: agent.maxPerOrderCap,
      },
      policy: {
        tier1MaxOrderPaise: activePolicy.tier1MaxOrderPaise,
        tier2ThresholdPaise: activePolicy.tier2ThresholdPaise,
        tier3ThresholdPaise: activePolicy.tier3ThresholdPaise,
        hardCeilingPaise: activePolicy.hardCeilingPaise,
        dailySpendLimitPaise: activePolicy.dailySpendLimitPaise,
        allowedCurrencies: activePolicy.allowedCurrencies,
        allowedMccs: activePolicy.allowedMccs,
        blockedMccs: activePolicy.blockedMccs,
        allowedMerchants: activePolicy.allowedMerchants,
        enforceWorkingHours: activePolicy.enforceWorkingHours,
        workingDays: activePolicy.workingDays,
        startHourUtc: activePolicy.startHourUtc,
        endHourUtc: activePolicy.endHourUtc,
        riskScoreThreshold: activePolicy.riskScoreThreshold,
      },
    });

    let transactionStatus: TransactionStatus = TransactionStatus.BLOCKED;
    let razorpayOrderId: string | undefined = undefined;
    let approvalId: string | undefined = undefined;
    let issuedVirtualCard = null;

    // -------------------------------------------------------------
    // 6. EXECUTION ROUTING
    // -------------------------------------------------------------
    if (evaluation.decision === "ALLOW") {
      // Auto-forward beneficiary metadata into Razorpay notes
      const razorpayNotes: Record<string, string> = {
        agentId,
        intent,
        merchantId: orderPayload.merchantId,
        ...(orderPayload.notes || {}),
      };

      if (beneficiary) {
        razorpayNotes.beneficiary_email = beneficiary.employeeEmail;
        if (beneficiary.employeeId) razorpayNotes.employee_id = beneficiary.employeeId;
        if (beneficiary.workspaceId) razorpayNotes.workspace_id = beneficiary.workspaceId;
        if (beneficiary.licenseType) razorpayNotes.license_type = beneficiary.licenseType;
      }

      // Execute Razorpay Order API
      const rzpOrder = await executeRazorpayOrder({
        amountPaise: orderPayload.amountPaise,
        currency: orderPayload.currency,
        receipt: orderPayload.receipt || `rcpt_${Date.now()}`,
        notes: razorpayNotes,
      });

      razorpayOrderId = rzpOrder.id;
      transactionStatus = TransactionStatus.EXECUTED;

      // Record velocity
      VelocityTracker.recordSpend(agentId, orderPayload.amountPaise);

      // Increment agent total spend
      await prisma.agent.update({
        where: { agentId },
        data: {
          totalSpentPaise: {
            increment: orderPayload.amountPaise,
          },
        },
      });

      // Issue ephemeral Virtual Card if requested
      if (orderPayload.issueVirtualCard) {
        issuedVirtualCard = await VirtualCardManager.issueSingleUseCard({
          agentId,
          spendLimitPaise: orderPayload.amountPaise,
          currency: orderPayload.currency,
          cardholderName: `TrustLayer - ${agent.name}`,
        });
      }
    } else if (evaluation.decision === "REQUIRE_APPROVAL") {
      transactionStatus = TransactionStatus.PENDING;
    }

    // 7. Persist Transaction Record
    const transaction = await prisma.transaction.create({
      data: {
        agentId,
        amountPaise: orderPayload.amountPaise,
        currency: orderPayload.currency,
        merchantId: orderPayload.merchantId,
        merchantCategory: orderPayload.category,
        mccCode: orderPayload.mccCode || "5734",
        intent,
        reasoningHash,
        reasoningText,
        decision: evaluation.decision as DecisionType,
        decisionReason: evaluation.reason,
        razorpayOrderId,
        status: transactionStatus,
        riskScore: evaluation.evaluation.details.riskScore,
        rawRequestPayload: body,
        rawResponsePayload: razorpayOrderId ? { razorpayOrderId } : {},
      },
    });

    // 8. Attach Beneficiary Metadata if provided
    if (beneficiary) {
      await prisma.beneficiaryMetadata.create({
        data: {
          transactionId: transaction.id,
          employeeEmail: beneficiary.employeeEmail,
          employeeName: beneficiary.employeeName,
          employeeId: beneficiary.employeeId,
          departmentCode: beneficiary.departmentCode || agent.department?.code || "ENGINEERING",
          workspaceId: beneficiary.workspaceId,
          licenseType: beneficiary.licenseType || orderPayload.sku || "STANDARD_SEAT",
          provisioningStatus: evaluation.decision === "ALLOW" ? "ACTIVE" : "PENDING",
          provisionedAt: evaluation.decision === "ALLOW" ? new Date() : null,
        },
      });

      // If auto-approved, trigger automatic license activation & seat upsert
      if (evaluation.decision === "ALLOW") {
        await VendorProvisioner.activateLicense({
          transactionId: transaction.id,
          merchantId: orderPayload.merchantId,
          merchantName: orderPayload.category || "Verified SaaS Merchant",
          sku: orderPayload.sku || "seat_monthly",
          amountPaise: orderPayload.amountPaise,
          beneficiary,
        });
      }
    }

    // 9. If Step-Up Approval Required -> Create PendingApproval Record
    if (evaluation.decision === "REQUIRE_APPROVAL") {
      const approvalTier: ApprovalTier =
        evaluation.approvalTier === "TIER_DUAL_CUSTODY"
          ? ApprovalTier.TIER_DUAL_CUSTODY
          : ApprovalTier.TIER_SINGLE_MANAGER;

      const approval = await prisma.pendingApproval.create({
        data: {
          transactionId: transaction.id,
          agentId,
          amountPaise: orderPayload.amountPaise,
          currency: orderPayload.currency,
          merchantId: orderPayload.merchantId,
          tier: approvalTier,
          triggerReason: evaluation.reason,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 86400000), // 24 hour expiration
        },
      });
      approvalId = approval.id;
    }

    // 10. Append Hash-Chained Audit Record
    const lastAudit = await prisma.auditLog.findFirst({
      orderBy: { logIndex: "desc" },
    });

    const nextIndex = (lastAudit?.logIndex || 0) + 1;
    const prevHash = lastAudit?.currentLogHash || computeSha256("GENESIS_BLOCK_TRUSTLAYER_2026");
    const currentHash = computeAuditLogHash({
      previousLogHash: prevHash,
      logIndex: nextIndex,
      transactionId: transaction.id,
      agentId,
      amountPaise: orderPayload.amountPaise,
      decision: evaluation.decision,
      reasoningHash,
      timestamp: transaction.createdAt.toISOString(),
    });

    await prisma.auditLog.create({
      data: {
        logIndex: nextIndex,
        transactionId: transaction.id,
        agentId,
        amountPaise: orderPayload.amountPaise,
        decision: evaluation.decision as DecisionType,
        intent,
        reasoningHash,
        policyEvaluationJson: {
          ...evaluation.evaluation,
          beneficiary: beneficiary || null,
        },
        previousLogHash: prevHash,
        currentLogHash: currentHash,
      },
    });

    // 11. Broadcast Real-Time SSE Event
    EventBus.broadcast({
      id: `ev_${Date.now()}`,
      type: "TRANSACTION_PROPOSAL",
      timestamp: transaction.createdAt.toISOString(),
      agentId,
      amountPaise: orderPayload.amountPaise,
      currency: orderPayload.currency,
      merchantId: orderPayload.merchantId,
      intent,
      decision: evaluation.decision,
      reason: evaluation.reason,
      razorpayOrderId,
      riskScore: evaluation.evaluation.details.riskScore,
    });

    // 12. Return Standard Response
    const statusCode = evaluation.decision === "ALLOW" ? 200 : evaluation.decision === "REQUIRE_APPROVAL" ? 202 : 403;

    return NextResponse.json(
      {
        transactionId: transaction.id,
        decision: evaluation.decision,
        approvalTier: evaluation.approvalTier,
        reason: evaluation.reason,
        violations: evaluation.violations,
        razorpayOrderId,
        approvalId,
        virtualCard: issuedVirtualCard
          ? {
              cardToken: issuedVirtualCard.cardToken,
              maskedPan: issuedVirtualCard.maskedPan,
              spendLimitInr: issuedVirtualCard.spendLimitPaise / 100,
              expiresAt: issuedVirtualCard.expiresAt,
            }
          : undefined,
        beneficiary: beneficiary
          ? {
              email: beneficiary.employeeEmail,
              provisioningStatus: evaluation.decision === "ALLOW" ? "ACTIVE" : "PENDING",
            }
          : undefined,
        evaluation: evaluation.evaluation,
      },
      { status: statusCode }
    );
  } catch (error: unknown) {
    console.error("Critical Error in /api/v1/agent/propose-payment:", error);
    const msg = error instanceof Error ? error.message : "Internal PDP evaluation failure";
    return NextResponse.json(
      {
        error: "INTERNAL_GATEWAY_ERROR",
        message: msg,
      },
      { status: 500 }
    );
  }
}
