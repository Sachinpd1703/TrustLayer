import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { VirtualCardManager } from "@/lib/cards/virtual-card-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cards = await prisma.virtualCard.findMany({
      include: { agent: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(cards);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch virtual cards";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, spendLimitPaise, currency, cardholderName } = body;

    if (!agentId || !spendLimitPaise) {
      return NextResponse.json({ error: "agentId and spendLimitPaise are required" }, { status: 400 });
    }

    const card = await VirtualCardManager.issueSingleUseCard({
      agentId,
      spendLimitPaise: Number(spendLimitPaise),
      currency,
      cardholderName,
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to issue virtual card";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
