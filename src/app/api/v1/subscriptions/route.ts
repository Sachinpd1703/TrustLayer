import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const seats = await prisma.subscriptionSeat.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(seats);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch subscriptions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
