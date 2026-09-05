# Step-by-Step Development Plan — TrustLayer v0.3.0 (Enterprise Commercial Grade)

**Document Version:** 0.3.0  
**Target:** Engineering Execution Blueprint for Employee Metadata, Automated Webhook Fulfillment, Single-Use Virtual Cards & Subscription Lifecycle  
**Status:** Approved Technical Execution Plan  

---

## 1. Executive Technical Scope

TrustLayer v0.3.0 evolves the gateway from a pure payment policy router into a **Closed-Loop Autonomous Fulfillment & Spend Management System**.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        v0.3.0 CLOSED-LOOP ARCHITECTURE                                 │
│                                                                                        │
│  [1. PROPOSAL & METADATA] ──► [2. PDP GATING] ──► [3. RAZORPAY / VIRTUAL CARDS]       │
│  • Employee Email & ID        • 4-Tier Policy      • Ephemeral 10-min Single-Use Card │
│  • Org Workspace ID           • Budget Caps        • Razorpay Order + Notes Metadata   │
│  • License SKU                • Anomaly Check                                          │
│                                                          │                             │
│  [5. SEAT RECONCILIATION] ◄── [4. POST-PAYMENT FULFILLMENT WEBHOOK] ◄─────────────────┘
│  • Churned User Pruning       • Machine-Readable Fulfillment                           │
│  • Downgrade Inactive Seats   • Automatic License Activation                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Implementation Sequence

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               6-STEP IMPLEMENTATION ROADMAP                            │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ STEP 1: DATA & SCHEMA    │ STEP 2: METADATA ROUTER  │ STEP 3: FULFILLMENT WEBHOOK      │
│ • Beneficiary Metadata   │ • Zod Schema Expansion   │ • Vendor Webhook Simulator       │
│ • VirtualCard Model      │ • Order Notes Forwarding │ • Automatic License Provisioning │
│ • SubscriptionSeat Model │ • Audit Chain Attachment │ • HMAC Webhook Security          │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ STEP 4: SEAT RECONCILER  │ STEP 5: UI/UX DASHBOARD  │ STEP 6: MCP & E2E VERIFICATION   │
│ • Active Seat Counter    │ • Subscriptions Manager  │ • Claude Desktop Tools Upgrade   │
│ • Zombie License Pruner  │ • Virtual Cards Viewer   │ • End-to-End Verification Test   │
│ • Dynamic Mandate Adjust │ • Employee License Table │ • Production Build Certification │
└─────────────────────────┴───────────────────────────┴──────────────────────────────────┘
```

---

### Step 1: Database Schema Expansion (Prisma 7 + PostgreSQL)
**Objective:** Store beneficiary employee identities, virtual cards, and active subscription seats.

* **Models to Add/Upgrade in `prisma/schema.prisma`:**
  1. `BeneficiaryMetadata`: Links transactions to employee email, name, employee ID, and workspace slug.
  2. `VirtualCard`: Ephemeral 16-digit tokenized cards with single-use caps and 10-minute TTL.
  3. `SubscriptionSeat`: Tracks active seats, allocated employee emails, renewal dates, and usage stats.
* **Deliverables:**
  * Update `prisma/schema.prisma`
  * Run `npx prisma db push`
  * Update `prisma/seed.ts` with default subscription and beneficiary seeds.

---

### Step 2: Structured Employee Metadata & Proposal Gateway
**Objective:** Allow AI agents to pass employee email, employee ID, and license SKU in payment proposals.

* **Files to Modify:**
  * `src/lib/types/schemas.ts`: Expand `ProposePaymentSchema` to include optional `beneficiary: { email, employeeId, workspaceId, licenseType }`.
  * `src/app/api/v1/agent/propose-payment/route.ts`: Forward beneficiary metadata into Razorpay `notes` and attach to the immutable `AuditLog` block.
* **Deliverables:**
  * Auto-forward `notes.beneficiary_email` to Razorpay Order API.
  * Record employee context in SHA-256 hash chaining formula.

---

### Step 3: Post-Payment Fulfillment & Vendor Webhook Simulator
**Objective:** Automatically activate the employee's license when Razorpay payment settles.

* **New Endpoints & Modules:**
  * `src/app/api/v1/webhooks/razorpay/route.ts`: Ingests `payment.authorized` and `order.paid` webhooks from Razorpay.
  * `src/lib/fulfillment/vendor-provisioner.ts`: Simulates / executes vendor license activation (e.g. Figma/Slack API calls to upgrade user from "Viewer" to "Editor").
  * `src/lib/security/webhook-verifier.ts`: Verifies HMAC-SHA256 signature from Razorpay.
* **Deliverables:**
  * Automated license status transition (`PENDING_PROVISIONING` $\rightarrow$ `ACTIVE_PROVISIONED`).
  * Live EventBus broadcast `LICENSE_PROVISIONED` to dashboard feed.

---

### Step 4: Autonomous SaaS Seat Reconciler & Zombie License Pruner
**Objective:** Prevent wasted software spend by identifying inactive seats before renewal.

* **New Modules:**
  * `src/lib/engine/subscription-reconciler.ts`: Evaluates active employee usage against provisioned seats.
  * `src/app/api/v1/subscriptions/reconcile/route.ts`: Automatically identifies churned/inactive users and scales down the next renewal mandate.
* **Deliverables:**
  * Automated detection of inactive employee licenses.
  * Proactive calculation of cost savings (e.g., *"Pruned 3 inactive seats, saving ₹2,400/mo"*).

---

### Step 5: Enterprise Subscriptions & Virtual Cards Dashboard UI
**Objective:** Provide CFOs and Department Leads full visibility into employee licenses and virtual cards.

* **New/Updated Pages:**
  * `src/app/(dashboard)/subscriptions/page.tsx`: Interactive SaaS Subscription & Seat Manager.
  * `src/app/(dashboard)/virtual-cards/page.tsx`: Live Virtual Cards Viewer with single-use status and auto-destruction timer.
  * Upgraded Sidebar Navigation in `src/components/layout/sidebar.tsx`.
* **Deliverables:**
  * Employee License Allocation Table with 1-click Revoke/Reassign.
  * Real-time countdown meters for active 10-minute virtual cards.

---

### Step 6: MCP Server Upgrade & End-to-End Verification
**Objective:** Allow Claude Desktop to provision employee-specific licenses conversationally.

* **Updates:**
  * `src/mcp/cli.ts`: Add `beneficiary_email`, `employee_id`, and `workspace_id` parameters to `propose_razorpay_payment`.
  * Add `list_active_subscriptions` and `reconcile_seats` MCP tools.
  * Run `npm run build:mcp`, `npx tsc --noEmit`, and `npm run build`.
* **Deliverables:**
  * Claude conversational prompt: *"Provision a Figma Editor seat for rohit@company.com"* $\rightarrow$ Executes, gates, pays on Razorpay, and auto-provisions!

---

## 3. Critical Edge Cases & Mitigation Strategies

| # | Edge Case Scenario | Potential Impact | Deterministic Architectural Mitigation |
| :---: | :--- | :--- | :--- |
| **E1** | **Duplicate License Allocation:**<br>Agent submits 2 simultaneous requests to provision a Figma seat for the exact same employee email. | Double billing (₹1,600 charged twice for 1 user). | **Idempotent Beneficiary Key:** Unique database constraint on `(merchantId, beneficiaryEmail, status = 'ACTIVE')`. Duplicate requests immediately return existing active license. |
| **E2** | **Employee Exits Before Subscription Renews:**<br>Employee leaves company on 12th; subscription scheduled to renew on 15th. | Paying for orphaned seat. | **48h Pre-Renewal Directory Sync:** Reconciler checks employee directory prior to renewal; if user is marked inactive/churned, seat is marked `PENDING_DEPROVISION` and excluded from renewal amount. |
| **E3** | **Vendor Webhook Dropped / Network Timeout:**<br>Razorpay executes payment, but Figma fulfillment webhook fails or times out. | Payment deducted, but license not activated. | **Automated Retry Queue with Exponential Backoff:** Failed fulfillment tasks are enqueued into a resilient retry queue (attempts at $1\text{m}, 5\text{m}, 15\text{m}, 1\text{h}$) with alerts on persistent failures. |
| **E4** | **Beneficiary Email Typo / Non-Corporate Domain:**<br>Agent requests license for `user@gmail.com` instead of `@company.com`. | Company funds used for personal account. | **Domain Whitelist Validator:** Gateway verifies `beneficiary.email.endsWith('@' + tenant.corporateDomain)` before policy evaluation. |
| **E5** | **License Downgrade / Pruning Disputed by Employee:**<br>Reconciler auto-downgrades an employee who was on vacation. | Work blocked on return. | **1-Click Self-Serve Reactivation:** Deprovisioned users can request instant reinstatement through Slack bot, which auto-provisions within policy boundaries in $< 30\text{s}$. |

---

## 4. Verification & Milestone Checklist

```text
[ ] Step 1: Database schema migrated on Supabase (BeneficiaryMetadata, VirtualCard, SubscriptionSeat).
[ ] Step 2: ProposePayment API updated with beneficiary metadata & Razorpay notes forwarding.
[ ] Step 3: Webhook fulfillment engine ingesting payment events and activating licenses.
[ ] Step 4: Subscription reconciler calculating active vs zombie seats.
[ ] Step 5: Subscriptions & Virtual Cards UI pages live on Next.js App Router.
[ ] Step 6: MCP tools updated for Claude Desktop with end-to-end zero-error build verification.
```
