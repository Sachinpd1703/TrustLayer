# Technical Requirements Document (TRD) — TrustLayer v0.2.2

**Document Version:** 0.2.2  
**Target Architecture:** Next.js 14/15 App Router + Prisma 7 + PostgreSQL + Official Razorpay Node SDK + Model Context Protocol (MCP)  
**Status:** Approved Technical Architecture  

---

## 1. System Architecture Diagram

```text
                                       INBOUND AGENT COMMERCE TRAFFIC
                         (Claude Desktop / Cursor MCP / REST API / OpenAI Agents)
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TRUSTLAYER ZERO-TRUST GATEWAY                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. IAM & ATTESTATION LAYER                                                                       │
│    • Ed25519 Cryptographic Signature Verification                                                │
│    • API Bearer Token Hash Matching (SHA-256)                                                    │
│    • Anti-Replay Nonce & Clock Skew Guard (±300s window)                                         │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. POLICY DECISION POINT (PDP) — Deterministic In-Memory Evaluator                              │
│    • Dynamic Agent Scope & Department Policy Fetch                                               │
│    • Multi-Tier Spend Threshold Check (Tier 1: Auto, Tier 2: Single, Tier 3: Dual, Tier 4: Deny)  │
│    • Sliding-Window Velocity Throttler (Rolling 24h & Monthly Budget)                            │
│    • MCC Category Code Allow/Deny Matcher (5734, 7372, 4816 vs 6051, 7995)                       │
│    • Temporal Operating Window Validator (Working Hours vs Weekend/Night Mode)                   │
│    • Heuristic Risk & Prompt-Injection Scorer                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. DECISION ROUTER & EXECUTION CONTROLLER                                                        │
│   ┌───────────────────────────┬───────────────────────────────┬───────────────────────────────┐  │
│   │     DECISION: "ALLOW"     │ DECISION: "REQUIRE_APPROVAL"  │       DECISION: "DENY"        │  │
│   │                           │                               │                               │  │
│   │ Razorpay Node SDK Client  │ Omnichannel Dispatcher:       │ Fail-Closed Immediate Reject  │  │
│   │ POST /v1/orders           │ • Telegram Interactive Bot    │ HTTP 403 Forbidden            │  │
│   │ (Generates rzp_order_id)  │ • WhatsApp Webhook Alert      │ (Zero money movement)         │  │
│   │                           │ • Dashboard /approvals Queue  │                               │  │
│   └───────────────────────────┴───────────────────────────────┴───────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. CRYPTOGRAPHIC AUDIT VAULT & EVENT STREAM                                                      │
│    • SHA-256 Chained Block: $H_n = \text{SHA256}(H_{n-1} \parallel n \parallel \text{Payload})$   │
│    • Real-Time Server-Sent Events (SSE) Broadcast via EventBus                                   │
│    • PostgreSQL Persistence (Prisma 7 + @prisma/adapter-pg)                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Stack Specifications

| Layer / Component | Technology | Version / Standard |
| :--- | :--- | :--- |
| **Framework** | Next.js App Router (Full-Stack TS) | `^14.2.18` / `^15.0.0` |
| **Database & ORM** | PostgreSQL (Supabase / Local Docker) + Prisma ORM | `@prisma/client@^7.8.0`, `@prisma/adapter-pg@^7.8.0` |
| **Connection Pooling** | `pg.Pool` Serverless Connection Manager | `pg@^8.21.0` |
| **Payment Execution** | Official Razorpay Node SDK | `razorpay@^2.9.4` |
| **Styling & Design System** | Tailwind CSS + Lucide Icons + Next Themes | `tailwindcss@^3.4.15`, Dual-Theme HSL Variables |
| **Agent Protocol** | Anthropic Model Context Protocol (MCP) | JSON-RPC 2.0 Standard |
| **Validation & Security** | Zod Schema Validation, Node.js `crypto` | `zod@^3.23.8`, SHA-256, Ed25519 |

---

## 3. Cryptographic Specification & Hash-Chaining Formula

To prevent retroactive tampering by unauthorized administrators or malicious actors, every evaluated transaction is appended to an immutable, sequential audit chain:

$$\text{Block Hash } H_n = \text{SHA256}(H_{n-1} \parallel n \parallel \text{txnId} \parallel \text{agentId} \parallel \text{amountPaise} \parallel \text{decision} \parallel \text{reasoningHash} \parallel \text{timestamp})$$

* **Genesis Block ($H_0$):** `SHA256("GENESIS_BLOCK_TRUSTLAYER_2026")`
* **Verification Algorithm:**
  $$\forall i \in [1, N]: H_i \stackrel{?}{=} \text{SHA256}(H_{i-1} \parallel i \parallel \text{Payload}_i)$$
  If any discrepancy occurs, the integrity status immediately switches to `INTEGRITY_COMPROMISED`.

---

## 4. Multi-Tier Decision Algorithm Specification

The Policy Decision Point (PDP) executes synchronously in memory according to the following deterministic rules:

```typescript
function evaluatePolicy(params: PolicyEvaluationContext): DecisionResult {
  const { amountPaise, currency, merchantId, mcc, timestamp, riskScore, agent, policy } = params;

  // 1. Hard Security Denials
  if (agent.status !== "ACTIVE") {
    return { decision: "DENY", reason: `Agent is ${agent.status}` };
  }
  if (!policy.allowedCurrencies.includes(currency)) {
    return { decision: "DENY", reason: "Unsupported currency" };
  }
  if (!isMerchantAllowed(merchantId, policy.allowedMerchants)) {
    return { decision: "DENY", reason: "Merchant not on approved whitelist" };
  }
  if (policy.blockedMccs.includes(mcc)) {
    return { decision: "DENY", reason: `MCC code ${mcc} is blocked by enterprise policy` };
  }
  if (amountPaise > policy.hardCeilingPaise) {
    return { decision: "DENY", reason: "Amount exceeds absolute hard safety ceiling" };
  }
  if (riskScore >= 0.70) {
    return { decision: "DENY", reason: "Critical prompt-injection / anomaly risk detected" };
  }

  // 2. Temporal Guardrail Check (Working Hours vs After-Hours)
  const isAfterHours = isOutsideWorkingHours(timestamp, policy.workingHours);
  if (isAfterHours && policy.enforceWorkingHours) {
    return {
      decision: "REQUIRE_APPROVAL",
      approvalTier: "TIER_SINGLE_MANAGER",
      reason: "After-hours transaction requires human approval.",
    };
  }

  // 3. Multi-Tier Threshold Routing
  if (amountPaise > policy.tier3ThresholdPaise) {
    // ₹25,000 - ₹1,00,000 -> Dual-Custody Multi-Signatory
    return {
      decision: "REQUIRE_APPROVAL",
      approvalTier: "TIER_DUAL_CUSTODY",
      reason: "High-value purchase requires dual-custody approval (Department Lead + Finance).",
    };
  }

  if (amountPaise > policy.tier2ThresholdPaise || isVelocityCapExceeded(agent, amountPaise)) {
    // ₹5,000 - ₹25,000 or Daily Velocity Overflow -> Single Manager Approval
    return {
      decision: "REQUIRE_APPROVAL",
      approvalTier: "TIER_SINGLE_MANAGER",
      reason: "Amount or daily velocity exceeds autonomous limit.",
    };
  }

  // 4. Autonomous Auto-Approval (Tier 1: < ₹5,000)
  return {
    decision: "ALLOW",
    approvalTier: "TIER_AUTONOMOUS",
    reason: "Auto-approved within spend caps and verified merchant whitelist.",
  };
}
```

---

## 5. Omnichannel Webhook & Notification Architecture

When `decision === "REQUIRE_APPROVAL"`:
1. TrustLayer generates a cryptographic single-use action token (`action_jwt_...`).
2. An asynchronous HTTP POST is dispatched to configured integration webhooks (Telegram Bot API, WhatsApp Cloud API, Slack Incoming Webhooks).
3. The interactive card contains deep-linked action endpoints:
   * `POST /api/v1/approvals/callback?token=...&action=APPROVE`
   * `POST /api/v1/approvals/callback?token=...&action=REJECT`
4. The callback endpoint verifies the cryptographic JWT signature, resolves the approval, creates the Razorpay Order, appends the Audit Log, and broadcasts the SSE event in $< 200\text{ms}$.

---

## 6. Performance, Reliability & Latency Budgets

```text
Inbound Agent Proposal Request
  ├── JSON Parsing & Zod Schema Validation       : < 3 ms
  ├── Agent IAM & Signature Authentication        : < 5 ms
  ├── Deterministic Policy & Velocity Evaluation  : < 8 ms
  ├── Razorpay Order API Invocation (HTTP)        : ~ 25-35 ms
  ├── PostgreSQL Transaction & Audit Log Append   : < 10 ms
  └── Real-Time SSE Broadcast                     : < 2 ms
─────────────────────────────────────────────────────────────
Total End-to-End Latency Target (p99)            : < 65 ms
```
