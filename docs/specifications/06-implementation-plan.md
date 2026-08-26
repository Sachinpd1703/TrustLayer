# Implementation Plan
## Project: TrustLayer — Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay

---

## 1. Project Overview & Execution Strategy

This implementation plan provides a phased, actionable checklist to build, test, and deploy **TrustLayer** for the **Razorpay Buildathon (Track 01: AI Growth & Agentic Commerce)**.

The project is structured into **5 distinct phases**, ensuring that an AI coding agent or engineering team can implement each piece sequentially with zero ambiguity.

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 1    │ ──> │   Phase 2    │ ──> │   Phase 3    │ ──> │   Phase 4    │ ──> │   Phase 5    │
│ Architecture │     │ Core Engine  │     │ Razorpay &   │     │ Dashboard &  │     │ Demo Suite & │
│  & DB Setup  │     │  & Policies  │     │ HITL Queues  │     │  Audit UI    │     │ Presentation │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. Phase-by-Phase Task Breakdown

### Phase 1: Environment & Core Database Initialization
* **Task 1.1:** Initialize Next.js 14/15 TypeScript application with Tailwind CSS and Lucide React.
* **Task 1.2:** Install core dependencies:
  * `razorpay` (Official Node SDK)
  * `@prisma/client`, `prisma` (Database ORM)
  * `zod` (Schema validation)
  * `framer-motion`, `clsx`, `tailwind-merge` (UI components)
* **Task 1.3:** Setup `prisma/schema.prisma` with models: `Agent`, `PolicyRule`, `Transaction`, `PendingApproval`, `AuditLog`.
* **Task 1.4:** Generate Prisma Client and create seed script (`prisma/seed.ts`) with default agents (`agent_procure_v2`, `agent_saas_renew`), initial policies, and sample audit data.

---

### Phase 2: TrustLayer Gating & Policy Engine Implementation
* **Task 2.1:** Implement cryptographic Agent IAM Attestation module (`lib/security/agent-auth.ts`).
* **Task 2.2:** Implement deterministic Attribute-Based Policy Evaluator (`lib/engine/policy-evaluator.ts`):
  * Per-order spend cap evaluation.
  * Rolling 24-hour spend velocity calculator.
  * Merchant ID and Merchant Category Code (MCC) allowlist check.
  * Risk and prompt anomaly score calculation.
* **Task 2.3:** Implement cryptographic SHA-256 Hash Chaining module for the Audit Vault (`lib/security/audit-chain.ts`).
* **Task 2.4:** Build Gateway API endpoint `POST /api/v1/agent/propose-payment` with Zod validation and three-state decision router (`ALLOW`, `REQUIRE_APPROVAL`, `DENY`).

---

### Phase 3: Razorpay Test-Mode Integration & Step-Up Approvals
* **Task 3.1:** Implement Razorpay client wrapper (`lib/razorpay/client.ts`) with `createOrder` and `createPaymentLink` methods.
* **Task 3.2:** Connect `ALLOW` branch of Gateway directly to Razorpay Orders API (`POST /v1/orders`).
* **Task 3.3:** Implement Human-in-the-Loop Step-Up Approval state machine (`lib/engine/approval-service.ts`):
  * `GET /api/v1/approvals` (List pending requests)
  * `POST /api/v1/approvals/[id]/decide` (Approve or Reject with instant Razorpay execution upon approval)
* **Task 3.4:** Setup Razorpay Webhook listener (`/api/v1/webhooks/razorpay`) with HMAC signature verification to close order audit lifecycles.

---

### Phase 4: Modern Real-Time Dashboard & UI
* **Task 4.1:** Build Global Layout & Navigation (`app/layout.tsx`, `components/header.tsx`) with dark mode fintech theme.
* **Task 4.2:** Build **Live Traffic Stream Dashboard** (`app/page.tsx`):
  * Summary Bento Grid (Gated Volume, Auto-Approved %, Blocked Anomalies, Pending Approvals).
  * Real-time scrolling transaction feed with expandable Explainability Drawers (Agent Intent, Reasoning Hash, Policy Matrix).
* **Task 4.3:** Build **Human Approval Review Center** (`app/approvals/page.tsx`) with 1-click contextual Approve/Reject modals.
* **Task 4.4:** Build **Policy & Spend Guardrails Manager** (`app/policies/page.tsx`) for real-time spend limit updates.
* **Task 4.5:** Build **Agent Registry & Kill-Switch Page** (`app/agents/page.tsx`) with instant agent suspension controls.
* **Task 4.6:** Build **Cryptographic Audit Explorer** (`app/audit/page.tsx`) with hash-chain integrity verification badge.

---

### Phase 5: AI Agent Simulator & Hackathon Demo Package
* **Task 5.1:** Build Interactive **Agent Simulator Component** (`components/agent-simulator.tsx`):
  * Preset 1: Auto-Allowed Order (₹1,600 Slack License Renewal).
  * Preset 2: Gated Step-Up Approval (₹35,000 High-Value Server Purchase).
  * Preset 3: Blocked Hallucination / Rogue Merchant (₹75,000 Untrusted Crypto Transfer).
  * Custom Prompt Input for dynamic live testing.
* **Task 5.2:** Verify end-to-end integration with live Razorpay Test Mode keys.
* **Task 5.3:** Create README, architecture overview, and 2-minute video pitch presentation script for submission.

---

## 3. Implementation Verification Checklist

| Milestone | Expected Output | Verification Method |
| :--- | :--- | :--- |
| **M1: Database & Seed** | PostgreSQL DB initialized with test agents & policies | `npx prisma studio` shows seeded records |
| **M2: Policy Gating API** | `/api/v1/agent/propose-payment` returns `ALLOW` / `REQUIRE_APPROVAL` / `DENY` | Automated unit tests & Postman/curl requests |
| **M3: Razorpay Test Exec** | Real Razorpay order IDs (`order_xxxx`) generated in Razorpay Dashboard | Razorpay Test Mode dashboard inspection |
| **M4: Human Approval Flow** | Pending transaction holds until approved; executes Razorpay order immediately on approval | End-to-end UI click test |
| **M5: Graceful Failure Handling** | Hallucinated or rogue merchant orders blocked with 0 money spent and logged in Audit Vault | Simulator Preset 3 execution |
| **M6: Hash Chain Integrity** | Audit Vault passes cryptographic verification | Audit page shows green valid ledger status |
