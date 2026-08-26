# Backend Schema Document
## Project: TrustLayer — Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay

---

## 1. Database Architecture & Technology

* **Database Engine:** SQLite (Local Development/Hackathon MVP) / PostgreSQL (Production).
* **ORM / Query Builder:** Prisma ORM (`prisma/schema.prisma`).
* **Design Principles:**
  * Strict Foreign Key relations.
  * Tamper-evident hash chaining across `AuditLog` rows.
  * Sub-millisecond indexed queries on `agentId`, `status`, `decision`, and `razorpayOrderId`.

---

## 2. Prisma Schema Definition (`schema.prisma`)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// --------------------------------------------------------
// 1. Agent IAM & Identity
// --------------------------------------------------------
model Agent {
  id              String         @id @default(cuid())
  agentId         String         @unique // e.g. "agent_procure_v2"
  name            String
  description     String?
  publicKey       String         // Ed25519 public key hex
  status          String         @default("ACTIVE") // ACTIVE, SUSPENDED, REVOKED
  role            String         @default("BUYER_AGENT")
  ownerEmail      String
  maxPerOrderCap  Int            @default(500000) // in paise (₹5,000)
  dailySpendCap   Int            @default(2000000) // in paise (₹20,000)
  totalSpentPaise Int            @default(0)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  transactions    Transaction[]
  approvals       PendingApproval[]
  auditLogs       AuditLog[]
}

// --------------------------------------------------------
// 2. Policy & Guardrails Configuration
// --------------------------------------------------------
model PolicyRule {
  id              String         @id @default(cuid())
  name            String         @unique // e.g. "GlobalSaaSPolicy"
  description     String?
  isActive        Boolean        @default(true)
  maxOrderPaise   Int            @default(500000) // ₹5,000 auto-allow threshold
  hardCeilingPaise Int           @default(5000000) // ₹50,000 absolute block
  dailySpendLimitPaise Int       @default(2000000) // ₹20,000
  allowedCurrencies String       @default("INR") // comma-separated e.g. "INR,USD"
  allowedMccs     String         @default("5734,7372") // Software, Cloud SaaS
  allowedMerchants String        @default("mid_slack_01,mid_figma_01,mid_aws_01")
  riskScoreThreshold Float       @default(0.35)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

// --------------------------------------------------------
// 3. Transactions & Gating Records
// --------------------------------------------------------
model Transaction {
  id                  String           @id @default(cuid())
  agentId             String
  agent               Agent            @relation(fields: [agentId], references: [agentId])
  amountPaise         Int              // e.g. 160000 (₹1,600)
  currency            String           @default("INR")
  merchantId          String           // Target Razorpay Merchant ID
  merchantCategory    String?          // e.g. "SaaS_Subscription"
  intent              String           // Human-readable declared intent
  reasoningHash       String           // SHA256 of LLM reasoning payload
  reasoningText       String?          // Detailed reasoning string
  decision            String           // ALLOW, REQUIRE_APPROVAL, DENY
  decisionReason      String           // e.g. "Auto-approved within spend cap"
  razorpayOrderId     String?          // e.g. "order_RZP10293847"
  razorpayPaymentId   String?
  status              String           // EXECUTED, PENDING_APPROVAL, BLOCKED, FAILED
  riskScore           Float            @default(0.1)
  rawRequestPayload   String           // JSON string
  rawResponsePayload  String?          // JSON string
  createdAt           DateTime         @default(now())

  pendingApproval     PendingApproval?
  auditLog            AuditLog?
}

// --------------------------------------------------------
// 4. Human Step-Up Approvals Queue (Dual-Custody)
// --------------------------------------------------------
model PendingApproval {
  id                  String       @id @default(cuid())
  transactionId       String       @unique
  transaction         Transaction  @relation(fields: [transactionId], references: [id])
  agentId             String
  agent               Agent        @relation(fields: [agentId], references: [agentId])
  amountPaise         Int
  currency            String
  merchantId          String
  triggerReason       String       // e.g. "Amount ₹35,000 exceeds ₹5,000 autonomous limit"
  status              String       @default("PENDING") // PENDING, APPROVED, REJECTED, EXPIRED
  approverEmail       String?
  approverSignature   String?      // Digital signature / session hash
  decisionNotes       String?
  expiresAt           DateTime
  createdAt           DateTime     @default(now())
  resolvedAt          DateTime?
}

// --------------------------------------------------------
// 5. Tamper-Evident Hash-Chained Audit Ledger
// --------------------------------------------------------
model AuditLog {
  id                  String       @id @default(cuid())
  logIndex            Int          @unique // Sequential integer 1, 2, 3...
  transactionId       String       @unique
  transaction         Transaction  @relation(fields: [transactionId], references: [id])
  agentId             String
  agent               Agent        @relation(fields: [agentId], references: [agentId])
  timestamp           DateTime     @default(now())
  amountPaise         Int
  decision            String       // ALLOW, REQUIRE_APPROVAL, DENY
  intent              String
  reasoningHash       String
  policyEvaluationJson String      // JSON breakdown of all policy checks
  previousLogHash     String       // SHA256 hash of logIndex - 1
  currentLogHash      String       // SHA256(previousLogHash + payload)
}
```

---

## 3. Core REST API Request & Response Schemas (Zod)

### 3.1 Propose Payment Schema
```typescript
import { z } from "zod";

export const ProposePaymentSchema = z.object({
  agentId: z.string().min(3),
  intent: z.string().min(5),
  reasoningText: z.string().optional(),
  reasoningHash: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
  orderPayload: z.object({
    amountPaise: z.number().int().positive(),
    currency: z.string().default("INR"),
    merchantId: z.string().min(3),
    category: z.string().default("General"),
    receipt: z.string().optional(),
    notes: z.record(z.string()).optional(),
  }),
});

export type ProposePaymentInput = z.infer<typeof ProposePaymentSchema>;
```

### 3.2 Approval Decision Schema
```typescript
export const ApprovalDecisionSchema = z.object({
  approvalId: z.string(),
  decision: z.enum(["APPROVE", "REJECT"]),
  approverEmail: z.string().email(),
  decisionNotes: z.string().optional(),
});
```

---

## 4. Hash Chain Integrity Verification Routine

```typescript
import crypto from "crypto";

export function computeAuditLogHash(params: {
  previousLogHash: string;
  logIndex: number;
  transactionId: string;
  agentId: string;
  amountPaise: number;
  decision: string;
  reasoningHash: string;
  timestamp: string;
}): string {
  const content = `${params.previousLogHash}|${params.logIndex}|${params.transactionId}|${params.agentId}|${params.amountPaise}|${params.decision}|${params.reasoningHash}|${params.timestamp}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}
```
