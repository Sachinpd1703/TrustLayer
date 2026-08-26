import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pending = await prisma.pendingApproval.findMany({
      where: { status: "PENDING" },
      include: {
        agent: {
          select: {
            id: true,
            agentId: true,
            name: true,
            role: true,
            status: true,
          },
        },
        transaction: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      count: pending.length,
      approvals: pending,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Approvals API Fetch Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
