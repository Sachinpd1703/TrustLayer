import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ApprovalDecisionSchema } from "@/lib/types/schemas";
import { executeRazorpayOrder } from "@/lib/razorpay/client";
import { VelocityTracker } from "@/lib/engine/velocity-tracker";
import { EventBus } from "@/lib/events/event-bus";
import { computeAuditLogHash, computeSha256 } from "@/lib/security/audit-chain";

import { VendorProvisioner } from "@/lib/fulfillment/vendor-provisioner";

export const dynamic = "force-dynamic";

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
      include: {
        transaction: {
          include: { beneficiary: true },
        },
        agent: true,
      },
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

    // -------------------------------------------------------------
    // DECISION === "REJECT"
    // -------------------------------------------------------------
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
          decision: "DENY",
          decisionReason: `Rejected by human approver (${approverEmail}): ${decisionNotes || "No notes"}`,
        },
      });

      // Append Audit Log for Rejection
      const lastLog = await prisma.auditLog.findFirst({
        orderBy: { logIndex: "desc" },
      });
      const prevHash = lastLog?.currentLogHash || computeSha256("GENESIS_BLOCK_TRUSTLAYER_2026");
      const nextIndex = (lastLog?.logIndex || 0) + 1;
      const nowIso = new Date().toISOString();

      const currentHash = computeAuditLogHash({
        previousLogHash: prevHash,
        logIndex: nextIndex,
        transactionId: approval.transactionId,
        agentId: approval.agentId,
        amountPaise: approval.amountPaise,
        decision: "DENY",
        reasoningHash: approval.transaction.reasoningHash,
        timestamp: nowIso,
      });

      await prisma.auditLog.create({
        data: {
          logIndex: nextIndex,
          transactionId: approval.transactionId,
          agentId: approval.agentId,
          amountPaise: approval.amountPaise,
          decision: "DENY",
          intent: approval.transaction.intent,
          reasoningHash: approval.transaction.reasoningHash,
          policyEvaluationJson: {
            approvalId: approval.id,
            action: "HUMAN_REJECTED",
            approverEmail,
            notes: decisionNotes,
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

    // 1. Update approval status
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

    // 2. Update transaction status & decision to ALLOW
    await prisma.transaction.update({
      where: { id: approval.transactionId },
      data: {
        status: "EXECUTED",
        decision: "ALLOW",
        razorpayOrderId: rzpOrder.id,
        decisionReason: `Approved by human approver (${approverEmail}) and executed on Razorpay.`,
      },
    });

    // 3. Record velocity & total spend
    VelocityTracker.recordSpend(approval.agentId, approval.amountPaise);
    await prisma.agent.update({
      where: { agentId: approval.agentId },
      data: { totalSpentPaise: { increment: approval.amountPaise } },
    });

    // 3.1 If transaction had beneficiary metadata, activate SaaS license seat
    if (approval.transaction.beneficiary) {
      await VendorProvisioner.activateLicense({
        transactionId: approval.transaction.id,
        merchantId: approval.merchantId,
        merchantName: approval.transaction.merchantCategory || "Verified SaaS Merchant",
        sku: approval.transaction.beneficiary.licenseType || "seat_monthly",
        amountPaise: approval.amountPaise,
        beneficiary: {
          employeeEmail: approval.transaction.beneficiary.employeeEmail,
          employeeName: approval.transaction.beneficiary.employeeName || undefined,
          employeeId: approval.transaction.beneficiary.employeeId || undefined,
          departmentCode: approval.transaction.beneficiary.departmentCode || undefined,
          workspaceId: approval.transaction.beneficiary.workspaceId || undefined,
          licenseType: approval.transaction.beneficiary.licenseType || undefined,
        },
      });
    }

    // 4. Append Audit Log for Approved Execution
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { logIndex: "desc" },
    });
    const prevHash = lastLog?.currentLogHash || computeSha256("GENESIS_BLOCK_TRUSTLAYER_2026");
    const nextIndex = (lastLog?.logIndex || 0) + 1;
    const nowIso = new Date().toISOString();

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
        decision: "ALLOW",
        intent: approval.transaction.intent,
        reasoningHash: approval.transaction.reasoningHash,
        policyEvaluationJson: {
          approvalId: approval.id,
          action: "HUMAN_APPROVED_AND_EXECUTED",
          approverEmail,
          razorpayOrderId: rzpOrder.id,
          notes: decisionNotes,
        },
        previousLogHash: prevHash,
        currentLogHash: currentHash,
      },
    });

    // 5. Broadcast Real-time Event
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
