import { NextRequest, NextResponse } from "next/server";
import { SubscriptionReconciler } from "@/lib/engine/subscription-reconciler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const analysis = await SubscriptionReconciler.analyzeSeats();
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to analyze seats";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seatIds } = body;

    if (!Array.isArray(seatIds) || !seatIds.length) {
      return NextResponse.json({ error: "seatIds array is required" }, { status: 400 });
    }

    const result = await SubscriptionReconciler.pruneZombieSeats(seatIds);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to prune seats";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
