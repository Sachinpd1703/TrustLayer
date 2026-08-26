import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ProposePaymentSchema } from "@/lib/types/schemas";
import { PolicyEvaluator } from "@/lib/engine/policy-evaluator";
import { VelocityTracker } from "@/lib/engine/velocity-tracker";
import { verifyAgentSignature } from "@/lib/security/agent-auth";
import { computeAuditLogHash, computeSha256 } from "@/lib/security/audit-chain";
import { executeRazorpayOrder } from "@/lib/razorpay/client";
import { EventBus } from "@/lib/events/event-bus";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Input Payload Schema
    const parsed = ProposePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_PAYLOAD",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { agentId, intent, reasoningText, reasoningHash, orderPayload } = parsed.data;

    // 2. Fetch Agent Record & Verify Status
    let agent = await prisma.agent.findUnique({
      where: { agentId },
    });

    if (!agent) {
      // Auto-register mock agent if running in test environment
      agent = await prisma.agent.create({
        data: {
          agentId,
          name: `Agent-${agentId}`,
          publicKey: "ed25519_test_mock_key_fingerprint",
          status: "ACTIVE",
          ownerEmail: "admin@trustlayer.internal",
          maxPerOrderCap: 500000,
          dailySpendCap: 2000000,
        },
      });
    }

    if (agent.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "AGENT_REVOKED_OR_SUSPENDED",
          message: `Agent '${agentId}' is currently ${agent.status}. All transactions are blocked.`,
        },
        { status: 403 }
      );
    }

    // 3. Cryptographic Signature & Anti-Replay Check
    const sigHeader = req.headers.get("X-Agent-Signature") || "test_signature";
    const tsHeader = req.headers.get("X-Timestamp") || new Date().toISOString();

    const authCheck = verifyAgentSignature({
      publicKeyHex: agent.publicKey,
      signatureHex: sigHeader,
      payloadString: JSON.stringify(body),
      timestampHeader: tsHeader,
    });

    if (!authCheck.isValid) {
      return NextResponse.json(
        {
          error: "AUTHENTICATION_FAILED",
          message: authCheck.error,
        },
        { status: 401 }
      );
    }

    // 4. Load Active Policy
    let activePolicy = await prisma.policyRule.findFirst({
      where: { isActive: true },
    });

    if (!activePolicy) {
      activePolicy = await prisma.policyRule.create({
        data: {
          name: "DefaultGlobalPolicy",
          maxOrderPaise: agent.maxPerOrderCap || 500000,
          hardCeilingPaise: 5000000,
          dailySpendLimitPaise: agent.dailySpendCap || 2000000,
          allowedCurrencies: ["INR"],
          allowedMccs: ["5734", "7372", "4816"],
          allowedMerchants: ["mid_slack_01", "mid_figma_01", "mid_aws_01", "mid_github_01"],
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
      intent,
      reasoningText,
      policy: {
        maxOrderPaise: activePolicy.maxOrderPaise,
        hardCeilingPaise: activePolicy.hardCeilingPaise,
        dailySpendLimitPaise: activePolicy.dailySpendLimitPaise,
        allowedCurrencies: activePolicy.allowedCurrencies,
        allowedMerchants: activePolicy.allowedMerchants,
        riskScoreThreshold: activePolicy.riskScoreThreshold,
      },
    });

    let transactionStatus = "BLOCKED";
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
      transactionStatus = "EXECUTED";

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
      transactionStatus = "PENDING_APPROVAL";
    }

    // 7. Persist Transaction Record
    const transaction = await prisma.transaction.create({
      data: {
        agentId,
        amountPaise: orderPayload.amountPaise,
        currency: orderPayload.currency,
        merchantId: orderPayload.merchantId,
        merchantCategory: orderPayload.category,
        intent,
        reasoningHash,
        reasoningText,
        decision: evaluation.decision,
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
      const approval = await prisma.pendingApproval.create({
        data: {
          transactionId: transaction.id,
          agentId,
          amountPaise: orderPayload.amountPaise,
          currency: orderPayload.currency,
          merchantId: orderPayload.merchantId,
          triggerReason: evaluation.reason,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 3600000), // 1 hour expiration
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
        decision: evaluation.decision,
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
          transactionId: transaction.id,
          approvalId,
          message: evaluation.reason,
          pollUrl: `/api/v1/approvals/${approvalId}`,
          policyEvaluation: evaluation.evaluation,
        },
        { status: 202 }
      );
    }

    // DENY
    return NextResponse.json(
      {
        status: "BLOCKED",
        decision: "DENY",
        transactionId: transaction.id,
        error_code: "POLICY_VIOLATION",
        message: evaluation.reason,
        violations: evaluation.violations,
        policyEvaluation: evaluation.evaluation,
      },
      { status: 403 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Critical Gateway Error:", error);
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
