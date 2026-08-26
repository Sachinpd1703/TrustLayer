import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "crypto";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to run seed script.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function computeInitialHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function main() {
  console.log("🌱 Starting TrustLayer Database Seeding (Supabase PostgreSQL)...");

  // 1. Clean existing records
  await prisma.auditLog.deleteMany({});
  await prisma.pendingApproval.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.policyRule.deleteMany({});
  await prisma.agent.deleteMany({});

  // 2. Create Default AI Buyer Agents
  const agent1 = await prisma.agent.create({
    data: {
      agentId: "agent_procure_v2",
      name: "Autonomous Procurement Bot",
      description: "Handles automated SaaS subscription renewals and cloud resource procurement.",
      publicKey: "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29",
      status: "ACTIVE",
      role: "BUYER_AGENT",
      ownerEmail: "procurement@enterprise.internal",
      maxPerOrderCap: 500000, // ₹5,000
      dailySpendCap: 2000000, // ₹20,000
    },
  });

  const agent2 = await prisma.agent.create({
    data: {
      agentId: "agent_shop_assistant",
      name: "In-App Conversational Buyer",
      description: "Customer-facing conversational shopping assistant for automated hotel & travel checkout.",
      publicKey: "e10adc3949ba59abbe56e057f20f883e1234567890abcdef1234567890abcdef",
      status: "ACTIVE",
      role: "SHOPPING_AGENT",
      ownerEmail: "user_sachin@trustlayer.internal",
      maxPerOrderCap: 300000, // ₹3,000
      dailySpendCap: 1000000, // ₹10,000
    },
  });

  console.log(`✅ Seeded Agents: ${agent1.agentId}, ${agent2.agentId}`);

  // 3. Create Default Gating Policy
  const defaultPolicy = await prisma.policyRule.create({
    data: {
      name: "GlobalEnterpriseSaaSPolicy",
      description: "Standard autonomous spend policy for SaaS licenses and cloud infrastructure.",
      isActive: true,
      maxOrderPaise: 500000, // ₹5,000 auto-allow
      hardCeilingPaise: 5000000, // ₹50,000 hard ceiling
      dailySpendLimitPaise: 2000000, // ₹20,000 daily
      allowedCurrencies: ["INR"],
      allowedMccs: ["5734", "7372", "4816"], // Software, Cloud SaaS, Data Services
      allowedMerchants: [
        "mid_slack_01",
        "mid_figma_01",
        "mid_aws_01",
        "mid_github_01",
        "mid_cloudflare_01",
      ],
      riskScoreThreshold: 0.35,
    },
  });

  console.log(`✅ Seeded Policy: ${defaultPolicy.name}`);

  // 4. Create Initial Seed Transaction (Historical Reference)
  const genesisTxn = await prisma.transaction.create({
    data: {
      agentId: "agent_procure_v2",
      amountPaise: 160000, // ₹1,600
      currency: "INR",
      merchantId: "mid_slack_01",
      merchantCategory: "SaaS_Subscription",
      intent: "Renew 2 Slack developer seats for Q3",
      reasoningHash: "sha256:7b52009b64fd0a2a49e6d8a939753077792b0554ee56f5a34e0624d772986f34",
      reasoningText: "Evaluated current active seats. 2 seats required renewal. Price ₹1,600 is within autonomous threshold.",
      decision: "ALLOW",
      decisionReason: "Auto-approved: within ₹5,000 per-order spend cap & approved SaaS vendor.",
      razorpayOrderId: "order_RZP10000001",
      status: "EXECUTED",
      riskScore: 0.05,
      rawRequestPayload: {
        amount: 160000,
        currency: "INR",
        merchant: "mid_slack_01",
      },
      rawResponsePayload: {
        id: "order_RZP10000001",
        status: "created",
      },
    },
  });

  // 5. Create Genesis Audit Log
  const genesisHash = computeInitialHash("GENESIS_BLOCK_TRUSTLAYER_2026");
  const currentHash = computeInitialHash(
    `${genesisHash}|1|${genesisTxn.id}|agent_procure_v2|160000|ALLOW|${genesisTxn.reasoningHash}`
  );

  await prisma.auditLog.create({
    data: {
      logIndex: 1,
      transactionId: genesisTxn.id,
      agentId: "agent_procure_v2",
      amountPaise: 160000,
      decision: "ALLOW",
      intent: genesisTxn.intent,
      reasoningHash: genesisTxn.reasoningHash,
      policyEvaluationJson: {
        spendCapCheck: "PASSED",
        merchantCheck: "PASSED",
        velocityCheck: "PASSED",
        riskScoreCheck: "PASSED",
      },
      previousLogHash: genesisHash,
      currentLogHash: currentHash,
    },
  });

  console.log("✅ Seeded Genesis Audit Block #1 with cryptographic hash verification.");
  console.log("🎉 Seeding completed successfully on Supabase PostgreSQL!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
