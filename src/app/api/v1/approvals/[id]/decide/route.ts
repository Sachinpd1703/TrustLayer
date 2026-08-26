import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ApprovalDecisionSchema } from "@/lib/types/schemas";
import { executeRazorpayOrder } from "@/lib/razorpay/client";
import { VelocityTracker } from "@/lib/engine/velocity-tracker";
import { EventBus } from "@/lib/events/event-bus";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const parsed = ApprovalDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_DECISION_PAYLOAD", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { decision, approverEmail, decisionNotes } = parsed.data;

    const approval = await prisma.pendingApproval.findUnique({
      where: { id },
      include: { transaction: true, agent: true },
    });

    if (!approval) {
      return NextResponse.json({ error: "APPROVAL_RECORD_NOT_FOUND" }, { status: 404 });
    }

    if (approval.status !== "PENDING") {
      return NextResponse.json(
        { error: `Approval is already resolved with status '${approval.status}'` },
        { status: 400 }
      );
    }

    if (decision === "REJECT") {
      await prisma.pendingApproval.update({
        where: { id },
        data: {
          status: "REJECTED",
          approverEmail,
          decisionNotes,
          resolvedAt: new Date(),
        },
      });

      await prisma.transaction.update({
        where: { id: approval.transactionId },
        data: {
          status: "REJECTED",
          decisionReason: `Rejected by human approver (${approverEmail}): ${decisionNotes || "No notes"}`,
        },
      });

      EventBus.broadcast({
        id: approval.transactionId,
        type: "APPROVAL_DECISION",
        timestamp: new Date().toISOString(),
        agentId: approval.agentId,
        amountPaise: approval.amountPaise,
        currency: approval.currency,
        merchantId: approval.merchantId,
        intent: approval.transaction.intent,
        decision: "DENY",
        reason: `Rejected by human approver: ${approverEmail}`,
        riskScore: approval.transaction.riskScore,
      });

      return NextResponse.json({
        status: "REJECTED",
        message: "Transaction rejected successfully by human approver.",
      });
    }

    // -------------------------------------------------------------
    // DECISION === "APPROVE"
    // -------------------------------------------------------------
    const rzpOrder = await executeRazorpayOrder({
      amountPaise: approval.amountPaise,
      currency: approval.currency,
      receipt: `appr_rcpt_${Date.now()}`,
      notes: {
        agentId: approval.agentId,
        intent: approval.transaction.intent,
        approverEmail,
        approvalId: approval.id,
      },
    });

    // Update approval status
    await prisma.pendingApproval.update({
      where: { id },
      data: {
        status: "APPROVED",
        approverEmail,
        approverSignature: `sig_approved_by_${approverEmail}`,
        decisionNotes,
        resolvedAt: new Date(),
      },
    });

    // Update transaction status
    await prisma.transaction.update({
      where: { id: approval.transactionId },
      data: {
        status: "EXECUTED",
        razorpayOrderId: rzpOrder.id,
        decisionReason: `Approved by human approver (${approverEmail}) and executed on Razorpay.`,
      },
    });

    // Record velocity & total spend
    VelocityTracker.recordSpend(approval.agentId, approval.amountPaise);
    await prisma.agent.update({
      where: { agentId: approval.agentId },
      data: { totalSpentPaise: { increment: approval.amountPaise } },
    });

    EventBus.broadcast({
      id: approval.transactionId,
      type: "APPROVAL_DECISION",
      timestamp: new Date().toISOString(),
      agentId: approval.agentId,
      amountPaise: approval.amountPaise,
      currency: approval.currency,
      merchantId: approval.merchantId,
      intent: approval.transaction.intent,
      decision: "ALLOW",
      reason: `Approved by ${approverEmail} -> Razorpay Order Created (${rzpOrder.id})`,
      razorpayOrderId: rzpOrder.id,
      riskScore: approval.transaction.riskScore,
    });

    return NextResponse.json({
      status: "APPROVED_AND_EXECUTED",
      razorpayOrderId: rzpOrder.id,
      message: `Transaction approved and successfully created on Razorpay (${rzpOrder.id})`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
