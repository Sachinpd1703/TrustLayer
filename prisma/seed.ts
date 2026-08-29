import "dotenv/config";
import { PrismaClient, DepartmentRole } from "@prisma/client";
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
  console.log("🌱 Starting TrustLayer v0.2.2 Database Seeding (Supabase PostgreSQL)...");

  // 1. Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.pendingApproval.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.policyRule.deleteMany({});
  await prisma.agentToken.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.webhookIntegration.deleteMany({});

  // 2. Seed Departments
  const deptEng = await prisma.department.create({
    data: {
      code: DepartmentRole.ENGINEERING,
      name: "Engineering & Cloud Infrastructure",
      description: "Handles AWS, GitHub, Cloudflare, CI/CD runners, and developer tooling.",
    },
  });

  const deptMkt = await prisma.department.create({
    data: {
      code: DepartmentRole.MARKETING,
      name: "Growth & Digital Marketing",
      description: "Autonomous ad campaigns, design tooling, and content marketing subscriptions.",
    },
  });

  const deptSales = await prisma.department.create({
    data: {
      code: DepartmentRole.SALES,
      name: "Sales & Customer Success",
      description: "CRM software, communication pipelines, and travel logistics.",
    },
  });

  console.log("✅ Seeded Departments: Engineering, Marketing, Sales.");

  // 3. Seed AI Buyer Agents
  const agent1 = await prisma.agent.create({
    data: {
      agentId: "agent_procure_v2",
      name: "DevOps Procurement Bot",
      description: "Handles automated SaaS subscription renewals and cloud resource procurement.",
      publicKey: "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29",
      status: "ACTIVE",
      role: "BUYER_AGENT",
      ownerEmail: "procurement@enterprise.internal",
      departmentId: deptEng.id,
      maxPerOrderCap: 500000,   // ₹5,000 auto-allow threshold
      dailySpendCap: 2000000,    // ₹20,000 daily velocity limit
      monthlyBudgetCap: 10000000, // ₹1,00,000 monthly limit
    },
  });

  const agent2 = await prisma.agent.create({
    data: {
      agentId: "agent_marketing_v1",
      name: "Ad-Spend Growth Bot",
      description: "Autonomous ad spend manager and marketing collateral buyer.",
      publicKey: "9f8e7d6c5b4a32101234567890abcdef9f8e7d6c5b4a32101234567890abcdef",
      status: "ACTIVE",
      role: "MARKETING_AGENT",
      ownerEmail: "growth@enterprise.internal",
      departmentId: deptMkt.id,
      maxPerOrderCap: 300000,   // ₹3,000 auto-allow
      dailySpendCap: 1500000,   // ₹15,000 daily
      monthlyBudgetCap: 5000000, // ₹50,000 monthly
    },
  });

  const agent3 = await prisma.agent.create({
    data: {
      agentId: "agent_shop_assistant",
      name: "Travel & Concierge Buyer",
      description: "Customer-facing conversational shopping assistant for hotel & travel checkout.",
      publicKey: "e10adc3949ba59abbe56e057f20f883e1234567890abcdef1234567890abcdef",
      status: "ACTIVE",
      role: "SHOPPING_AGENT",
      ownerEmail: "sachin@trustlayer.internal",
      departmentId: deptSales.id,
      maxPerOrderCap: 400000,   // ₹4,000 auto-allow
      dailySpendCap: 1000000,   // ₹10,000 daily
      monthlyBudgetCap: 4000000, // ₹40,000 monthly
    },
  });

  // Seed Agent Tokens
  await prisma.agentToken.create({
    data: {
      agentId: agent1.id,
      tokenPrefix: "tl_live_sec_eng01",
      tokenHash: computeInitialHash("tl_live_sec_eng01_secret_token_value"),
      name: "Claude Desktop Production Token",
    },
  });

  console.log(`✅ Seeded Agents: ${agent1.agentId}, ${agent2.agentId}, ${agent3.agentId}`);

  // 4. Seed Multi-Tier Hierarchical Spend Policies
  const globalPolicy = await prisma.policyRule.create({
    data: {
      name: "GlobalEnterpriseSaaSPolicy",
      description: "Standard autonomous 4-tier spend policy for SaaS licenses and cloud infrastructure.",
      isActive: true,
      departmentId: deptEng.id,
      tier1MaxOrderPaise: 500000,   // Tier 1: Auto-Allow (<= ₹5,000)
      tier2ThresholdPaise: 2500000,  // Tier 2: Single Manager (<= ₹25,000)
      tier3ThresholdPaise: 10000000, // Tier 3: Dual-Custody (<= ₹1,00,000)
      hardCeilingPaise: 10000000,    // Tier 4: Absolute Block (> ₹1,00,000)
      dailySpendLimitPaise: 2000000, // Rolling 24h limit (₹20,000)
      allowedCurrencies: ["INR"],
      allowedMccs: ["5734", "7372", "4816", "7011", "4511"],
      blockedMccs: ["6051", "7995", "4829"],
      allowedMerchants: [
        "mid_slack_01",
        "mid_figma_01",
        "mid_aws_01",
        "mid_github_01",
        "mid_cloudflare_01",
      ],
      enforceWorkingHours: false,
      riskScoreThreshold: 0.35,
    },
  });

  console.log(`✅ Seeded Multi-Tier Policy: ${globalPolicy.name}`);

  // 5. Seed Initial Historical Transaction
  const genesisTxn = await prisma.transaction.create({
    data: {
      agentId: "agent_procure_v2",
      amountPaise: 160000, // ₹1,600
      currency: "INR",
      merchantId: "mid_slack_01",
      merchantCategory: "SaaS_Subscription",
      mccCode: "5734",
      intent: "Renew 2 Slack developer seats for Q3",
      reasoningHash: "sha256:7b52009b64fd0a2a49e6d8a939753077792b0554ee56f5a34e0624d772986f34",
      reasoningText: "Evaluated active team seats. 2 seats required renewal. Price ₹1,600 is within autonomous threshold.",
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

  // 6. Create Genesis Audit Log
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
        mccCheck: "PASSED",
        velocityCheck: "PASSED",
        riskScoreCheck: "PASSED",
      },
      previousLogHash: genesisHash,
      currentLogHash: currentHash,
    },
  });

  console.log("✅ Seeded Genesis Audit Block #1 with cryptographic hash verification.");
  console.log("🎉 Seeding v0.2.2 completed successfully on Supabase PostgreSQL!");
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
