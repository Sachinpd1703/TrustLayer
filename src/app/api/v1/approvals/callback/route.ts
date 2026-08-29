import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { OmnichannelNotifier } from "@/lib/notifications/omnichannel";
import { executeRazorpayOrder } from "@/lib/razorpay/client";
import { VelocityTracker } from "@/lib/engine/velocity-tracker";
import { computeAuditLogHash, computeSha256 } from "@/lib/security/audit-chain";
import { EventBus } from "@/lib/events/event-bus";
import { env } from "@/lib/config";
import { TransactionStatus, DecisionType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new Response("<h3>Missing Action Token</h3>", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const verification = OmnichannelNotifier.verifyActionToken(
      token,
      env.TRUSTLAYER_ENCLAVE_SECRET
    );

    if (!verification.isValid || !verification.approvalId || !verification.action) {
      return new Response("<h3>Invalid or Expired Action Token</h3>", {
        status: 403,
        headers: { "Content-Type": "text/html" },
      });
    }

    const { approvalId, action } = verification;

    const approval = await prisma.pendingApproval.findUnique({
      where: { id: approvalId },
      include: { transaction: true, agent: true },
    });

    if (!approval) {
      return new Response("<h3>Approval Record Not Found</h3>", {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (approval.status !== "PENDING") {
      return new Response(
        `<h3>Approval Already Resolved: ${approval.status}</h3>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }

    const nowIso = new Date().toISOString();

    if (action === "REJECT") {
      await prisma.pendingApproval.update({
        where: { id: approval.id },
        data: {
          status: "REJECTED",
          approverEmail: "mobile_approver@enterprise.internal",
          decisionNotes: "Rejected via 1-click mobile notification link",
          resolvedAt: new Date(),
        },
      });

      await prisma.transaction.update({
        where: { id: approval.transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          decision: DecisionType.DENY,
          decisionReason: "Rejected via 1-click mobile notification link",
        },
      });

      return new Response(
        `<div style="font-family:sans-serif;padding:30px;max-width:500px;margin:40px auto;border:1px solid #ddd;border-radius:12px;text-align:center;">
          <h2 style="color:#e11d48;">❌ Transaction Rejected</h2>
          <p>The transaction for <b>₹${(approval.amountPaise / 100).toLocaleString()}</b> has been rejected and terminated.</p>
        </div>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }

    // ACTION === "APPROVE"
    const rzpOrder = await executeRazorpayOrder({
      amountPaise: approval.amountPaise,
      currency: approval.currency,
      receipt: `appr_mob_${Date.now()}`,
      notes: {
        agentId: approval.agentId,
        intent: approval.transaction.intent,
        source: "1-Click Mobile Callback",
      },
    });

    await prisma.pendingApproval.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        approverEmail: "mobile_approver@enterprise.internal",
        approverSignature: `sig_mobile_click_${Date.now()}`,
        decisionNotes: "Approved via 1-click mobile notification link",
        resolvedAt: new Date(),
      },
    });

    await prisma.transaction.update({
      where: { id: approval.transactionId },
      data: {
        status: TransactionStatus.EXECUTED,
        decision: DecisionType.ALLOW,
        razorpayOrderId: rzpOrder.id,
        decisionReason: `Approved via 1-click mobile notification -> Razorpay Order ${rzpOrder.id}`,
      },
    });

    VelocityTracker.recordSpend(approval.agentId, approval.amountPaise);
    await prisma.agent.update({
      where: { agentId: approval.agentId },
      data: { totalSpentPaise: { increment: approval.amountPaise } },
    });

    // Append Audit Block
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { logIndex: "desc" },
    });
    const prevHash = lastLog?.currentLogHash || computeSha256("GENESIS_BLOCK_TRUSTLAYER_2026");
    const nextIndex = (lastLog?.logIndex || 0) + 1;

    const currentHash = computeAuditLogHash({
      previousLogHash: prevHash,
      logIndex: nextIndex,
      transactionId: approval.transactionId,
      agentId: approval.agentId,
      amountPaise: approval.amountPaise,
      decision: "ALLOW",
      reasoningHash: approval.transaction.reasoningHash,
      timestamp: nowIso,
    });

    await prisma.auditLog.create({
      data: {
        logIndex: nextIndex,
        transactionId: approval.transactionId,
        agentId: approval.agentId,
        amountPaise: approval.amountPaise,
        decision: DecisionType.ALLOW,
        intent: approval.transaction.intent,
        reasoningHash: approval.transaction.reasoningHash,
        policyEvaluationJson: {
          action: "1_CLICK_MOBILE_APPROVED",
          razorpayOrderId: rzpOrder.id,
        },
        previousLogHash: prevHash,
        currentLogHash: currentHash,
      },
    });

    EventBus.broadcast({
      id: approval.transactionId,
      type: "APPROVAL_DECISION",
      timestamp: nowIso,
      agentId: approval.agentId,
      amountPaise: approval.amountPaise,
      currency: approval.currency,
      merchantId: approval.merchantId,
      intent: approval.transaction.intent,
      decision: "ALLOW",
      reason: `Approved via Mobile Click -> Order ${rzpOrder.id}`,
      razorpayOrderId: rzpOrder.id,
      riskScore: approval.transaction.riskScore,
    });

    return new Response(
      `<div style="font-family:sans-serif;padding:30px;max-width:500px;margin:40px auto;border:1px solid #10b981;border-radius:12px;text-align:center;background:#f0fdf4;">
        <h2 style="color:#059669;">✅ Transaction Approved & Executed!</h2>
        <p><b>Razorpay Order Created:</b> <code style="background:#e5e7eb;padding:4px 8px;border-radius:4px;">${rzpOrder.id}</code></p>
        <p>Amount: <b>₹${(approval.amountPaise / 100).toLocaleString()}</b></p>
      </div>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`<h3>Gateway Error: ${msg}</h3>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
