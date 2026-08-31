# TrustLayer — Gated & Explainable Authorization Gateway for Agentic Commerce on Razorpay

> **Razorpay Buildathon — Track 01: AI Growth & Agentic Commerce**  
> *"AI agents propose money transactions. TrustLayer authorizes and gates policies. Razorpay executes money movement."*

---

##  The Core Problem

As commerce transitions to autonomous AI buyer and procurement agents, non-deterministic Large Language Models (LLMs) pose severe financial risks:
1. **Hallucinated Orders & Amounts:** AI agents miscalculating unit prices or ordering annual enterprise tiers instead of monthly seats.
2. **Prompt Injection & Rogue Payees:** Malicious product descriptions hijacking buyer agents to route funds to untrusted merchant accounts.
3. **Runaway Velocity Loops:** A recursive loop executing dozens of checkouts in seconds, draining corporate credit lines.
4. **Zero Explainability:** No record of *why* the agent initiated the payment, making dispute defense and compliance impossible.

---

## The Solution: TrustLayer

TrustLayer sits as an in-line, zero-trust **Policy Enforcement Point (PEP)** and **Policy Decision Point (PDP)** between autonomous AI agents and Razorpay Payment APIs:

```text
Autonomous AI Buyer Agent (Claude / OpenAI / AutoGPT)
           │
           ▼ 1. Signed Payment Proposal (Intent + Reasoning Hash)
┌─────────────────────────────────────────────────────────────┐
│                     TRUSTLAYER GATEWAY                      │
│   - Cryptographic Agent Identity & Attestation (Ed25519)    │
│   - Attribute-Based Policy Evaluation (ABAC)                │
│   - Financial Spend Bounds & Velocity Throttling            │
│   - Merchant Allowlist & MCC Code Filtering                 │
│   - Risk Scoring & Prompt-Injection Safeguards              │
│   - Step-Up Human Approval Queue (Dual-Custody)             │
│   - Tamper-Evident Hash-Chained Audit Logging               │
└─────────────────────────────────────────────────────────────┘
           │ 2. Authorized & Signed Execution Payload
           ▼
Razorpay Payment APIs (/v1/orders, /v1/payment_links)
```

---

## Key Features & Capabilities

* **Deterministic Spend Caps & Velocity Bounds:** Hard per-order limits (e.g. ₹5,000 auto-allow) and rolling 24-hour spend limits.
* **Dual-Custody Human-in-the-Loop (HITL):** High-value or anomalous transactions held in a pending state with 1-click Slack / Dashboard approval.
* **Tamper-Evident Cryptographic Ledger:** SHA-256 hash-chaining ($H_n = \text{SHA256}(H_{n-1} + \text{Payload})$) ensuring zero retroactive log alteration.
* **Instant Emergency Kill-Switch:** Suspend or revoke any compromised agent across all edge nodes in $< 50\text{ms}$.
* **Razorpay Test-Mode Integration:** Native order creation and HMAC webhook signature verification.
* **Dual-Theme UI:** Warm Linen (`#FFFBF4`) Light Mode and Midnight Obsidian (`#0B0F19`) Dark Mode.

---

## Quick Start & Local Setup

### 1. Prerequisites
* Node.js >= 18
* Docker (for PostgreSQL) or local PostgreSQL instance

### 2. Start PostgreSQL Database
```bash
docker compose up -d
```

### 3. Install Dependencies & Setup Environment
```bash
npm install
cp .env.example .env
```

### 4. Push Database Schema & Seed Mock Data
```bash
npm run db:push
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Interactive Agent Simulator & Demo Scenarios

TrustLayer includes a built-in AI Agent Simulator (`/simulator`) to test the 3 primary evaluation pathways:

1. **Preset 1 (Auto-Allowed):** Agent renews ₹1,600 Figma subscription $\rightarrow$ Within spend cap $\rightarrow$ **Razorpay Order Created Instantly**.
2. **Preset 2 (Step-Up Human Approval):** Agent requests ₹35,000 AWS reserved instance $\rightarrow$ Exceeds ₹5,000 autonomous threshold $\rightarrow$ **Held in Pending Approvals Queue**.
3. **Preset 3 (Blocked Anomaly):** Agent attempts ₹75,000 transfer to untrusted merchant $\rightarrow$ Fails merchant whitelist & hard ceiling $\rightarrow$ **Hard Denied with Zero Money Spent**.

---

## Specifications & Architecture Blueprint

Complete engineering specifications are available in [`docs/specifications/`](file:///C:/Users/sachi/Desktop/TrustLayer/docs/specifications/):
* [`01-product-requirements-document.md`](file:///C:/Users/sachi/Desktop/TrustLayer/docs/specifications/01-product-requirements-document.md)
* [`02-technical-requirements-document.md`](file:///C:/Users/sachi/Desktop/TrustLayer/docs/specifications/02-technical-requirements-document.md)
* [`03-app-flow-document.md`](file:///C:/Users/sachi/Desktop/TrustLayer/docs/specifications/03-app-flow-document.md)
* [`04-ui-ux-design-brief.md`](file:///C:/Users/sachi/Desktop/TrustLayer/docs/specifications/04-ui-ux-design-brief.md)
* [`05-backend-schema-document.md`](file:///C:/Users/sachi/Desktop/TrustLayer/docs/specifications/05-backend-schema-document.md)
* [`06-implementation-plan.md`](file:///C:/Users/sachi/Desktop/TrustLayer/docs/specifications/06-implementation-plan.md)
* [`07-repository-architecture-and-folder-structure.md`](file:///C:/Users/sachi/Desktop/TrustLayer/docs/specifications/07-repository-architecture-and-folder-structure.md)
