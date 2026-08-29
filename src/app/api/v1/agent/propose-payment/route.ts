import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ProposePaymentSchema } from "@/lib/types/schemas";
import { verifyAgentSignature, verifyAntiReplayNonce } from "@/lib/security/agent-auth";
import { PolicyEvaluator } from "@/lib/engine/policy-evaluator";
import { computeAuditLogHash, computeSha256 } from "@/lib/security/audit-chain";
import { VelocityTracker } from "@/lib/engine/velocity-tracker";
import { executeRazorpayOrder } from "@/lib/razorpay/client";
import { EventBus } from "@/lib/events/event-bus";
import { DecisionType, TransactionStatus, ApprovalTier } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Zod Schema Validation
    const parsed = ProposePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_PROPOSAL_PAYLOAD",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { agentId, intent, reasoningText, reasoningHash, orderPayload } = parsed.data;

    // 2. Fetch Agent from Database
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      include: { department: true },
    });

    if (!agent) {
      return NextResponse.json(
        {
          error: "AGENT_NOT_REGISTERED",
          message: `Agent '${agentId}' is not registered in TrustLayer IAM.`,
        },
        { status: 401 }
      );
    }

    // 3. Emergency Kill-Switch & Status Gate
    if (agent.status !== "ACTIVE") {
      EventBus.broadcast({
        id: `kill_${Date.now()}`,
        type: "KILL_SWITCH_TRIGGERED",
        timestamp: new Date().toISOString(),
        agentId,
        amountPaise: orderPayload.amountPaise,
        currency: orderPayload.currency,
        merchantId: orderPayload.merchantId,
        intent,
        decision: "DENY",
        reason: `Agent '${agentId}' has been ${agent.status} by administrator.`,
        riskScore: 1.0,
      });

      return NextResponse.json(
        {
          error: "AGENT_REVOKED",
          message: `Agent '${agentId}' has been ${agent.status} by administrator. Kill-switch active.`,
          status: "BLOCKED",
          decision: "DENY",
        },
        { status: 403 }
      );
    }

    // 4. Fetch Active Multi-Tier Policy
    let activePolicy = await prisma.policyRule.findFirst({
      where: { isActive: true },
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

    // -------------------------------------------------------------
    // 6. EXECUTION ROUTING
    // -------------------------------------------------------------
    if (evaluation.decision === "ALLOW") {
      // Execute Razorpay Order API
      const rzpOrder = await executeRazorpayOrder({
        amountPaise: orderPayload.amountPaise,
        currency: orderPayload.currency,
        receipt: orderPayload.receipt || `rcpt_${Date.now()}`,
        notes: {
          agentId,
          intent,
          merchantId: orderPayload.merchantId,
          ...orderPayload.notes,
        },
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

    // 8. If Step-Up Approval Required -> Create PendingApproval Record
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

    // 9. Append Hash-Chained Audit Record
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
        policyEvaluationJson: JSON.parse(JSON.stringify(evaluation.evaluation)),
        previousLogHash: prevHash,
        currentLogHash: currentHash,
      },
    });

    // 10. Broadcast Real-Time Event via EventBus
    EventBus.broadcast({
      id: transaction.id,
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

    // 11. Return Response
    if (evaluation.decision === "ALLOW") {
      return NextResponse.json({
        status: "EXECUTED",
        decision: "ALLOW",
        approvalTier: evaluation.approvalTier,
        transactionId: transaction.id,
        razorpayOrderId,
        amountPaise: orderPayload.amountPaise,
        currency: orderPayload.currency,
        message: evaluation.reason,
        policyEvaluation: evaluation.evaluation,
      });
    }

    if (evaluation.decision === "REQUIRE_APPROVAL") {
      return NextResponse.json(
        {
          status: "PENDING_APPROVAL",
          decision: "REQUIRE_APPROVAL",
          approvalTier: evaluation.approvalTier,
          transactionId: transaction.id,
          approvalId,
          amountPaise: orderPayload.amountPaise,
          currency: orderPayload.currency,
          message: evaluation.reason,
          policyEvaluation: evaluation.evaluation,
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        status: "BLOCKED",
        decision: "DENY",
        approvalTier: evaluation.approvalTier,
        transactionId: transaction.id,
        error_code: "POLICY_VIOLATION",
        message: evaluation.reason,
        violations: evaluation.violations,
        policyEvaluation: evaluation.evaluation,
      },
      { status: 403 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Propose Payment Error:", err);
    return NextResponse.json(
      {
        error: "INTERNAL_GATEWAY_ERROR",
        decision: "DENY",
        message: msg,
      },
      { status: 500 }
    );
  }
}
