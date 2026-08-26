import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { RegisterAgentSchema } from "@/lib/types/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Serialize BigInt
    const serialized = agents.map((a) => ({
      ...a,
      totalSpentPaise: Number(a.totalSpentPaise),
    }));
    return NextResponse.json(serialized);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_AGENT_DATA", details: parsed.error.format() }, { status: 400 });
    }

    const agent = await prisma.agent.create({
      data: parsed.data,
    });

    return NextResponse.json({
      ...agent,
      totalSpentPaise: Number(agent.totalSpentPaise),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
