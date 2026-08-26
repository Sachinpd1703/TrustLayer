import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { EventBus } from "@/lib/events/event-bus";

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await req.json().catch(() => ({}));
    const newStatus = body.status || "REVOKED"; // REVOKED or ACTIVE

    const agent = await prisma.agent.update({
      where: { agentId },
      data: { status: newStatus },
    });

    EventBus.broadcast({
      id: `kill_${agentId}_${Date.now()}`,
      type: "KILL_SWITCH_TRIGGERED",
      timestamp: new Date().toISOString(),
      agentId,
      amountPaise: 0,
      currency: "INR",
      merchantId: "N/A",
      intent: `Agent status transitioned to ${newStatus}`,
      decision: newStatus === "REVOKED" ? "DENY" : "ALLOW",
      reason: `Kill-switch modified by Administrator: ${newStatus}`,
      riskScore: newStatus === "REVOKED" ? 1.0 : 0.0,
    });

    return NextResponse.json({
      status: "SUCCESS",
      agentId,
      agentStatus: agent.status,
      message: `Agent '${agentId}' is now ${agent.status}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
