import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { logIndex: "desc" },
      take: 50,
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
    });

    return NextResponse.json(logs);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Audit API Fetch Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
