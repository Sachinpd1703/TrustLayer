import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch all transactions
    const [transactions, pendingCount] = await Promise.all([
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.pendingApproval.count({
        where: { status: "PENDING" },
      }),
    ]);

    // 2. Compute Real Aggregates
    let totalVolumePaise = 0;
    let allowedCount = 0;
    let blockedCount = 0;

    for (const t of transactions) {
      if (t.decision === "ALLOW" && t.status === "EXECUTED") {
        totalVolumePaise += t.amountPaise;
        allowedCount++;
      } else if (t.decision === "DENY" || t.status === "BLOCKED") {
        blockedCount++;
      } else if (t.decision === "REQUIRE_APPROVAL") {
        // Count as evaluated
      }
    }

    const totalTxns = transactions.length;
    const passRate = totalTxns > 0 ? Math.round((allowedCount / totalTxns) * 100) : 100;

    // 3. Map to LiveStreamEvent format for feed
    const feed = transactions.map((t) => ({
      id: t.id,
      type: "TRANSACTION_PROPOSAL" as const,
      timestamp: t.createdAt.toISOString(),
      agentId: t.agentId,
      amountPaise: t.amountPaise,
      currency: t.currency,
      merchantId: t.merchantId,
      intent: t.intent,
      decision: t.decision as "ALLOW" | "REQUIRE_APPROVAL" | "DENY",
      reason: t.decisionReason,
      razorpayOrderId: t.razorpayOrderId || undefined,
      riskScore: t.riskScore,
    }));

    return NextResponse.json({
      metrics: {
        totalVolumePaise,
        allowedCount,
        blockedCount,
        totalTxns,
        passRate,
        pendingCount,
      },
      feed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Dashboard Stats API Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
