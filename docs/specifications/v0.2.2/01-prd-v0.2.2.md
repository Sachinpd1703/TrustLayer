# Product Requirements Document (PRD) — TrustLayer v0.2.2

**Document Version:** 0.2.2  
**Target Release:** Razorpay AI Buildathon (Track 01: AI Growth & Agentic Commerce)  
**Author:** TrustLayer Architecture Team  
**Status:** Approved & Ready for Implementation  

---

## 1. Executive Summary & Problem Context

### 1.1 The Agentic Commerce Shift
As the global software ecosystem transitions towards autonomous AI agents (OpenAI GPTs, Anthropic Claude, AutoGPT, enterprise procurement bots, and customer-facing shopping concierges), non-deterministic Large Language Models (LLMs) are tasked with initiating high-frequency, autonomous financial transactions.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE TRUST GAP IN COMMERCE                               │
│                                                                                         │
│   Autonomous AI Agents                                           Razorpay Payment APIs  │
│   [Non-Deterministic LLM]   ═════[ UNGATED & UNPROTECTED ]═════▶  [Real Money Debits]   │
│   - Hallucinated Orders                                           - Unbounded Drain     │
│   - Prompt Injections                                             - Zero Explainability │
│   - Infinite Runaway Loops                                        - Legal Liability     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

Without an authoritative, zero-trust gating gateway:
1. **Unbounded Financial Drain:** AI loops can trigger hundreds of recurring payments in seconds.
2. **Prompt-Injection Payee Spoofing:** Adversaries inject malicious prompts into product descriptions, redirecting checkout funds to unverified rogue accounts.
3. **Absence of Governance & Explainability:** Traditional merchant gateways receive payments without cryptographic attestation of *why* the AI made the purchase, violating audit and compliance standards.

---

## 2. Strategic Objectives for Track 01

TrustLayer v0.2.2 delivers a production-ready, zero-trust **Policy Decision Point (PDP)** and **Policy Enforcement Point (PEP)** between autonomous agents and Razorpay:

* **Merchant Revenue Growth:** Make merchants sellable to AI buyers by exposing machine-readable catalogs (`/.well-known/ai-commerce.json`).
* **Deterministic Financial Gating:** Guarantee that every single transaction is explainable, bounded by dynamic spend caps, and validated against merchant allowlists.
* **Dual-Custody Human-in-the-Loop (HITL):** High-value or anomalous transactions automatically escalate to real-time omnichannel approval queues (Telegram, WhatsApp, Slack, Dashboard).
* **Cryptographic Tamper-Evidence:** Maintain an immutable, SHA-256 hash-chained audit ledger ($H_n = \text{SHA256}(H_{n-1} + \text{Payload})$).
* **Open Standard Interoperability:** Provide full Model Context Protocol (MCP) server support for Claude Desktop and Cursor IDE.

---

## 3. User Personas & Core Journeys

| Persona | Role & Objectives | Key Platform Touchpoints |
| :--- | :--- | :--- |
| **Enterprise CFO / Finance Lead** | Sets corporate spend limits, manages department budgets, reviews dual-custody high-value payments ($> ₹25,000$), downloads audit certificates. | Policy & Limits (`/policies`), Pending Approvals (`/approvals`), Audit Vault (`/audit`). |
| **Engineering / DevOps Lead** | Provisions AI buyer agents, sets API scopes, defines temporal after-hours rules, triggers emergency kill-switches. | Agent Registry (`/agents`), Agent Simulator (`/simulator`). |
| **Merchant Store Owner** | Sells products to autonomous AI agents, inspects inbound agent traffic, monitors conversion velocity. | Live Stream Feed (`/`), Merchant Discovery (`/.well-known/ai-commerce.json`). |
| **Autonomous AI Buyer Agent** | Proposes purchases on behalf of users, passes cryptographic intent hashes, and consumes machine-readable invoices. | REST Gateway (`/api/v1/agent/propose-payment`), MCP Tool Server. |
| **Compliance & Tax Auditor** | Verifies retroactive transaction logs, inspects LLM reasoning traces, verifies cryptographic Merkle root proofs. | Cryptographic Audit Explorer (`/audit`), Verification API (`/api/v1/audit/verify`). |

---

## 4. Feature Epics & Detailed Functional Scope

### Epic 1: Dynamic Multi-Agent IAM & Token Provisioning
* **Custom Agent Registration:** Admins can dynamically provision unlimited AI Buyer Agents with custom names, personas, department tags (`ENGINEERING`, `MARKETING`, `SALES`, `OPERATIONS`, `EXECUTIVE`), and owner emails.
* **Cryptographic Credential Generation:** 1-Click generation of Ed25519 public/private keypairs and secure API bearer tokens (`tl_live_sec_...`).
* **Live Budget Tracking:** Real-time visual spend progress meters tracking daily and monthly budget utilization.
* **Sub-50ms Kill-Switch:** Instant status transitions between `ACTIVE`, `PAUSED`, and `REVOKED`.

### Epic 2: Next-Gen Hierarchical Spend Guardrails & Policy Engine
* **Multi-Tier Approval Escalation Matrix:**
  * **Tier 1 (₹0 - ₹5,000):** $100\%$ Autonomous Auto-Approval $\rightarrow$ Instant Razorpay Order.
  * **Tier 2 (₹5,000 - ₹25,000):** Single Manager Approval $\rightarrow$ Held in HITL queue.
  * **Tier 3 (₹25,000 - ₹1,00,000):** Dual-Custody Multi-Signatory $\rightarrow$ Requires both Department Lead + Finance Manager approval.
  * **Tier 4 (> ₹1,00,000):** Hard Safety Block $\rightarrow$ Zero financial movement.
* **MCC (Merchant Category Code) Gating:** Strict allow/deny filtering by MCC codes (e.g. Allow `5734 Software`, `7372 Cloud SaaS`; Block `6051 Crypto`, `7995 Gambling`).
* **Temporal Guardrails (Working Hours vs After-Hours):** Define autonomous operating windows (e.g. Mon-Fri 9:00 AM - 7:00 PM). After-hours purchases automatically escalate to Step-Up Approval.
* **Sliding-Window Velocity Throttles:** Rolling 24-hour spend limits per agent and per department.

### Epic 3: Omnichannel Real-Time HITL (Telegram, WhatsApp, Slack)
* **Instant Notification Dispatch:** When Step-Up Approval triggers, TrustLayer dispatches interactive notification cards to Telegram/WhatsApp/Slack.
* **1-Click Inline Decisions:** Managers can click `[Approve ✅]` or `[Reject ❌]` directly on mobile $\rightarrow$ Webhook callback securely validates HMAC and executes the Razorpay Order.
* **Live In-App Modals:** Dashboard and `/approvals` center synchronize with instant feedback upon resolution.

### Epic 4: Red-Team Hacker Sandbox & Attack Arena
* **Interactive Threat Simulation:** Dedicated arena in `/simulator` allowing judges and security engineers to inject adversarial prompts (e.g. Prompt Injection, Rogue Merchant Spoofing, Velocity Denial of Service).
* **Live Risk Scoring Breakdown:** Visual explainability radar showing heuristic prompt score, sentiment anomaly score, and MCC violation triggers.

### Epic 5: Model Context Protocol (MCP) Server & Merchant Discoverability
* **Official MCP Server:** Claude Desktop and Cursor IDE can directly connect to TrustLayer tools (`propose_razorpay_payment`, `get_policy_limits`, `check_spend_budget`).
* **Merchant AI Commerce Catalog (`.well-known/ai-commerce.json`):** Machine-readable catalog enabling autonomous discovery and 1-click checkout for AI agents.

---

## 5. Non-Functional & Security Requirements

1. **In-Line Decision Latency:** PDP Policy evaluation latency must remain under $45\text{ms}$ at p99.
2. **Fail-Closed Architecture:** Any unhandled exception, network partition, or malformed signature results in a deterministic `500 INTERNAL_GATEWAY_ERROR` with `decision: "DENY"` (Zero Money Movement).
3. **Data Protection:** Secrets and private keys must never be logged or returned in client payloads.
4. **Theme Fidelity:** Strict dual-theme compliance: Warm Linen (`#FFFBF4` + `#F1EBE0`) Light Mode and Midnight Obsidian (`#0B0F19`) Dark Mode.

---

## 6. Success Metrics & Judge Evaluation Scorecard

* **Auto-Allow Execution Accuracy:** $100\%$ legitimate low-risk orders executed on Razorpay without human friction.
* **Anomaly Interception Rate:** $100\%$ prompt injections, unlisted merchants, and hard ceiling violations blocked.
* **HITL Response Latency:** Sub-second dispatch to omnichannel approval channels.
* **Audit Ledger Verification:** Zero cryptographic hash breaks across thousands of sequential blocks.
