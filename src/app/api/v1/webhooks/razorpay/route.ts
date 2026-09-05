import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { VendorProvisioner } from "@/lib/fulfillment/vendor-provisioner";
import { EventBus } from "@/lib/events/event-bus";
import { computeAuditLogHash, computeSha256 } from "@/lib/security/audit-chain";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "tl_whsec_test_demo_secret";

/**
 * Razorpay Post-Payment Webhook Ingestion Gateway
 * Handles payment.authorized, order.paid, and triggers automated SaaS license activation.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // 1. Verify HMAC-SHA256 Signature
    if (!signature) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "MISSING_WEBHOOK_SIGNATURE: x-razorpay-signature header is strictly required." },
          { status: 401 }
        );
      }
    } else {
      const expectedSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      const isSignatureMatch =
        signature === expectedSignature ||
        (process.env.NODE_ENV !== "production" && signature.startsWith("mock_"));

      if (!isSignatureMatch) {
        return NextResponse.json(
          { error: "INVALID_WEBHOOK_SIGNATURE: Cryptographic HMAC-SHA256 verification failed." },
          { status: 401 }
        );
      }
    }


    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity || payload.payload?.order?.entity;

    if (!paymentEntity) {
      return NextResponse.json({ received: true, ignored: "No payment entity found" });
    }

    const orderId = paymentEntity.order_id || paymentEntity.id;
    const notes = paymentEntity.notes || {};
    const beneficiaryEmail = notes.beneficiary_email;

    // 2. Find matching Transaction by Razorpay Order ID
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ razorpayOrderId: orderId }, { id: notes.transactionId }],
      },
      include: { beneficiary: true, agent: true },
    });

    if (transaction) {
      // If payment is authorized or paid -> mark EXECUTED and activate license
      if (event === "payment.authorized" || event === "order.paid" || event === "payment.captured") {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "EXECUTED",
            razorpayPaymentId: paymentEntity.id,
          },
        });

        // 3. Automated License Fulfillment if beneficiary email exists
        if (beneficiaryEmail || transaction.beneficiary) {
          await VendorProvisioner.activateLicense({
            transactionId: transaction.id,
            merchantId: transaction.merchantId,
            merchantName: transaction.merchantCategory || "Verified SaaS Merchant",
            sku: notes.license_type || transaction.beneficiary?.licenseType || "seat_monthly",
            amountPaise: transaction.amountPaise,
            beneficiary: {
              employeeEmail: beneficiaryEmail || transaction.beneficiary?.employeeEmail || "unknown@enterprise.internal",
              employeeName: notes.employee_name || transaction.beneficiary?.employeeName || undefined,
              employeeId: notes.employee_id || transaction.beneficiary?.employeeId || undefined,
              departmentCode: transaction.agent?.departmentId || undefined,
              licenseType: notes.license_type || transaction.beneficiary?.licenseType || undefined,
            },
          });
        }

        // 4. Append Settlement Audit Log Block
        const lastAudit = await prisma.auditLog.findFirst({
          orderBy: { logIndex: "desc" },
        });
        const nextIndex = (lastAudit?.logIndex || 0) + 1;
        const prevHash = lastAudit?.currentLogHash || computeSha256("GENESIS_BLOCK_TRUSTLAYER_2026");
        const nowIso = new Date().toISOString();

        const currentHash = computeAuditLogHash({
          previousLogHash: prevHash,
          logIndex: nextIndex,
          transactionId: transaction.id,
          agentId: transaction.agentId,
          amountPaise: transaction.amountPaise,
          decision: "ALLOW",
          reasoningHash: transaction.reasoningHash,
          timestamp: nowIso,
        });

        await prisma.auditLog.create({
          data: {
            logIndex: nextIndex,
            transactionId: transaction.id,
            agentId: transaction.agentId,
            amountPaise: transaction.amountPaise,
            decision: "ALLOW",
            intent: `Webhook Settlement: ${event}`,
            reasoningHash: transaction.reasoningHash,
            policyEvaluationJson: {
              webhookEvent: event,
              paymentId: paymentEntity.id,
              orderId,
              beneficiaryEmail,
              settlementStatus: "CONFIRMED",
            },
            previousLogHash: prevHash,
            currentLogHash: currentHash,
          },
        });

        EventBus.broadcast({
          id: `wh_${Date.now()}`,
          type: "LICENSE_PROVISIONED",
          timestamp: nowIso,
          agentId: transaction.agentId,
          amountPaise: transaction.amountPaise,
          currency: transaction.currency,
          merchantId: transaction.merchantId,
          intent: `Webhook confirmed payment for ${beneficiaryEmail || transaction.agentId}`,
          decision: "ALLOW",
          reason: `Settlement verified -> Razorpay Payment ID: ${paymentEntity.id}`,
          razorpayOrderId: orderId,
          riskScore: 0,
        });
      }
    }

    return NextResponse.json({
      received: true,
      event,
      orderId,
      status: "PROCESSED",
    });
  } catch (error: unknown) {
    console.error("Error processing Razorpay webhook:", error);
    const msg = error instanceof Error ? error.message : "Webhook processing error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
