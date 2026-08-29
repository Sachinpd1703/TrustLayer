import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { RegisterAgentSchema } from "@/lib/types/schemas";
import crypto from "crypto";
import { EventBus } from "@/lib/events/event-bus";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        department: true,
        tokens: {
          select: {
            id: true,
            tokenPrefix: true,
            name: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
      },
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
      return NextResponse.json(
        { error: "INVALID_AGENT_DATA", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      agentId,
      name,
      description,
      publicKey: providedKey,
      role,
      ownerEmail,
      departmentId,
      maxPerOrderCap,
      dailySpendCap,
      monthlyBudgetCap,
      generateToken,
    } = parsed.data;

    // 1. Generate or use provided Ed25519 public key
    let publicKey = providedKey;
    let generatedPrivateKey: string | undefined = undefined;

    if (!publicKey) {
      const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync("ed25519");
      publicKey = pubKeyObj.export({ type: "spki", format: "der" }).toString("hex");
      generatedPrivateKey = privKeyObj.export({ type: "pkcs8", format: "pem" }) as string;
    }

    // 2. Create Agent record
    const agent = await prisma.agent.create({
      data: {
        agentId,
        name,
        description,
        publicKey,
        role,
        ownerEmail,
        departmentId: departmentId || undefined,
        maxPerOrderCap,
        dailySpendCap,
        monthlyBudgetCap,
      },
      include: {
        department: true,
      },
    });

    // 3. Generate Secret API Bearer Token if requested
    let rawApiToken: string | undefined = undefined;
    if (generateToken) {
      const randomSecret = crypto.randomBytes(24).toString("hex");
      rawApiToken = `tl_live_sec_${randomSecret}`;
      const tokenHash = crypto.createHash("sha256").update(rawApiToken).digest("hex");

      await prisma.agentToken.create({
        data: {
          agentId: agent.id,
          tokenPrefix: rawApiToken.slice(0, 16) + "...",
          tokenHash,
          name: `${name} Initial API Key`,
        },
      });
    }

    EventBus.broadcast({
      id: agent.id,
      type: "AGENT_PROVISIONED",
      timestamp: new Date().toISOString(),
      agentId: agent.agentId,
      amountPaise: 0,
      currency: "INR",
      merchantId: "SYSTEM",
      intent: `Provisioned agent ${agent.name} (${agent.agentId})`,
      decision: "ALLOW",
      reason: `Agent provisioned with ₹${(maxPerOrderCap / 100).toLocaleString()} limit`,
      riskScore: 0,
    });

    return NextResponse.json({
      ...agent,
      totalSpentPaise: Number(agent.totalSpentPaise),
      credentials: {
        publicKey,
        privateKeyPem: generatedPrivateKey,
        apiBearerToken: rawApiToken,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Agent Registration Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
