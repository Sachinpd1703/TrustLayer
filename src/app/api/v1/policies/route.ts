import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { PolicyRuleSchema } from "@/lib/types/schemas";

export async function GET() {
  try {
    const policy = await prisma.policyRule.findFirst({
      where: { isActive: true },
    });
    return NextResponse.json(policy || {});
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PolicyRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_POLICY_DATA", details: parsed.error.format() }, { status: 400 });
    }

    const existing = await prisma.policyRule.findFirst({
      where: { isActive: true },
    });

    if (existing) {
      const updated = await prisma.policyRule.update({
        where: { id: existing.id },
        data: parsed.data,
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.policyRule.create({
        data: parsed.data,
      });
      return NextResponse.json(created);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
