# Technical Requirements Document (TRD)
## Project: TrustLayer — Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay

---

## 1. System Architecture & Tech Stack

### 1.1 Technology Stack Choices & Rationale
* **Application Framework:** **Next.js 14/15 (App Router, TypeScript, React 18/19, Node.js runtime)**.
  * *Rationale:* Provides a unified full-stack architecture with server-side API routes for high-speed policy evaluation and a modern React frontend with React Server Components / Client components for real-time dashboards.
* **Styling & Components:** **Tailwind CSS + shadcn/ui + Lucide Icons + Framer Motion**.
  * *Rationale:* Production-grade, accessible, dark-mode ready financial dashboard components.
* **Database & ORM:** **PostgreSQL (for Development, Demo & Production via Neon, Supabase, Docker, or Cloud SQL) via Prisma ORM**.
  * *Rationale:* ACID compliance, relational integrity, native JSONB support, and strict sequential hash-chaining for the audit ledger.
* **State & Caching / Velocity Engine:** **In-memory Sliding Window Store (with Redis-compatible interface)**.
  * *Rationale:* Sub-millisecond evaluation of rolling 1-hour and 24-hour spend limits.
* **Payment Gateway SDK:** Official **`razorpay` Node.js SDK (`npm install razorpay`)**.
  * *Rationale:* Native authentication, order creation, payment link generation, and webhook HMAC verification.
* **Cryptographic & Hash Engine:** Node.js native `crypto` module (Ed25519 signature verification, SHA-256 hash chaining).

---

## 2. Technical Component Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client / Agent Layer                              │
│   - AI Buyer Agent (MCP Tool / REST Client)                                 │
│   - Next.js Web Dashboard (Admin / Approver UI)                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST / SSE
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Next.js API Gateway                               │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 1. Agent IAM & Authentication Module                                │   │
│   │    - Validates X-Agent-ID, Ed25519 signature & Active Status        │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 2. Policy Engine (ABAC & Bounded Gating)                            │   │
│   │    - Per-Order Spend Cap Evaluation                                 │   │
│   │    - Merchant ID & MCC Whitelist Verification                       │   │
│   │    - In-Memory / Redis Sliding-Window Velocity Rate Limiter         │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 3. Risk & Anomaly Scoring Service                                   │   │
│   │    - Prompt injection keyword scanner & Price multiplier anomaly    │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 4. Decision Router & State Machine                                 │   │
│   │    - ALLOW -> Forward to Razorpay Client                            │   │
│   │    - REQUIRE_APPROVAL -> Store in Approval Queue + Trigger SSE      │   │
│   │    - DENY -> Return 403 Forbidden with Structured Error Trace       │   │
│   └──────────────────┬───────────────────────────────┬──────────────────┘   │
│                      ▼                               ▼                      │
│   ┌────────────────────────────────────┐ ┌──────────────────────────────┐   │
│   │ 5. Razorpay Execution Client       │ │ 6. Tamper-Evident Audit      │   │
│   │    - Razorpay Node SDK             │ │    Vault                     │   │
│   │    - Injects secure test-mode keys │ │    - SHA-256 Hash Chain      │   │
│   │    - Creates Orders / Links        │ │    - Lineage Store (Prisma)  │   │
│   └────────────────────────────────────┘ └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Technical Specifications

### 3.1 Agent Authentication & Attestation
* **Header Structure:**
  * `X-Agent-ID`: String (e.g. `agent_procure_v2`)
  * `X-Agent-Signature`: Hex-encoded signature of request payload
  * `X-Timestamp`: ISO 8601 string (must be within $\pm 60\text{ seconds}$ to prevent replay attacks)
* **Verification Routine:**
  1. Retrieve Agent record from DB by `agent_id`.
  2. If `status !== "ACTIVE"`, immediately abort with `HTTP 403 (AGENT_DISABLED)`.
  3. Verify signature: `crypto.verify(null, payloadBuffer, publicKey, signatureBuffer)`.

### 3.2 Policy Decision Point (PDP) Logic
The policy engine evaluates rules synchronously with zero async I/O bottlenecks:
```typescript
interface PolicyEvaluationContext {
  agentId: string;
  amountPaise: number;
  currency: string;
  merchantId: string;
  category: string;
  rolling24hSpendPaise: number;
  riskScore: number;
}

interface DecisionResult {
  decision: "ALLOW" | "REQUIRE_APPROVAL" | "DENY";
  reason: string;
  violations: string[];
  appliedPolicyId: string;
}
```

### 3.3 Sliding-Window Velocity Rate Limiter
* **Algorithm:** Sliding-window log using timestamped entries in memory / Redis.
* **Formula:** $\text{CurrentVelocity} = \sum_{\tau = t - 86400}^t \text{Amount}_\tau$
* **Thresholds:**
  * Rolling 1-Hour Cap: ₹10,000
  * Rolling 24-Hour Cap: ₹20,000
  * Request Frequency Cap: Max 5 payment proposals per minute.

### 3.4 Tamper-Evident Audit Hash-Chaining
* Every audit log row contains `previousLogHash` and `currentLogHash`.
* **Hash Calculation:**
  $$\text{currentLogHash} = \text{SHA-256}\left(\text{previousLogHash} + \text{id} + \text{timestamp} + \text{agentId} + \text{amount} + \text{decision} + \text{reasoningHash}\right)$$
* Enables one-click integrity verification across the entire transaction database.

---

## 4. Razorpay Integration Specifications

### 4.1 Environment Configuration
```env
# Razorpay Credentials
RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere"
RAZORPAY_KEY_SECRET="YourKeySecretHere"
RAZORPAY_WEBHOOK_SECRET="YourWebhookSecretHere"

# TrustLayer Master Security
TRUSTLAYER_ENCLAVE_SECRET="super_secure_random_key_64_bytes"
```

### 4.2 API Call: Create Order
```typescript
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function executeRazorpayOrder(params: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}) {
  return await razorpay.orders.create({
    amount: params.amountPaise,
    currency: params.currency,
    receipt: params.receipt,
    notes: params.notes,
  });
}
```

---

## 5. Security & Failure Modes

1. **Fail-Closed Default:** Any uncaught exception, missing parameter, or validation error results in `HTTP 500 / 400` with `decision: "DENY"`.
2. **Replay Protection:** Nonce and timestamp validation prevents re-executing captured payload packets.
3. **Secret Isolation:** Raw Razorpay keys are never serialized into response JSON or logged in audit tables.
4. **Input Sanitization:** Strict Zod schema validation on every inbound request payload.
