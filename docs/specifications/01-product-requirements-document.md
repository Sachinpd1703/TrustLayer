# Product Requirements Document (PRD)
## Project: TrustLayer — Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In 2026, commerce is transitioning from human-initiated checkouts to autonomous AI agent-initiated commerce. Personal shopping assistants, procurement bots, and autonomous SaaS management agents are directly interacting with merchant storefronts and payment gateways.

### 1.2 The Core Problem
Autonomous AI agents are driven by non-deterministic Large Language Models (LLMs). When given direct access to payment credentials or APIs, they introduce catastrophic failure modes:
1. **Hallucinated Transactions:** Misinterpreting tiers, quantities, or prices (e.g., ordering ₹50,000 annual licenses instead of ₹5,000 monthly).
2. **Prompt Injection & Hijacking:** Malicious web content injecting commands into buyer agents to redirect payments to unauthorized merchant accounts.
3. **Runaway Velocity Loops:** A recursive loop executing dozens of checkouts in seconds, draining corporate balances or credit lines.
4. **Lack of Explainability & Auditability:** No proof of why the agent took the action, making chargeback defense and compliance impossible.

### 1.3 The Solution: TrustLayer
TrustLayer is an in-line, policy-driven authorization and governance gateway between autonomous AI agents and Razorpay Payment APIs.
> **Core Value Proposition:** *"AI agents propose transactions. TrustLayer authorizes and gates policies. Razorpay executes money movement."*

---

## 2. Product Goals & Success Metrics

### 2.1 Product Goals
* **P-Goal 1:** Eliminate unauthorized agent transactions through deterministic policy evaluation.
* **P-Goal 2:** Provide zero-friction autonomous checkout for low-risk, pre-approved purchases under strict spend caps.
* **P-Goal 3:** Enable seamless Human-in-the-Loop (HITL) step-up approval workflows for high-value or anomalous transactions.
* **P-Goal 4:** Provide 100% explainability and tamper-evident audit trails for every agent reasoning step and financial action.
* **P-Goal 5:** Seamlessly integrate with Razorpay Test Mode APIs (Orders, Payment Links, Subscriptions) without exposing raw API keys to LLMs.

### 2.2 Success Metrics (KPIs)
* **Zero Unauthorized Capital Loss:** 100% of out-of-bounds orders blocked or routed to human approval.
* **Low Latency Overhead:** Policy evaluation completed in $< 15\text{ms}$.
* **Audit Lineage Completeness:** 100% of executed and rejected requests have complete cryptographic audit chains and LLM intent hashes.
* **Zero API Key Leakage:** 0% exposure of Razorpay secret keys to agent runtimes or prompts.

---

## 3. User Personas & Target Users

### Persona 1: Enterprise Finance & Security Admin (Sachin)
* **Role:** Sets financial guardrails, spending limits, vendor allowlists, and kill-switches for organizational AI agents.
* **Needs:** Real-time visibility, policy-as-code controls, instant revocation capabilities, and compliance reports.

### Persona 2: Human Approver / Business Lead (Sunidhi)
* **Role:** Reviews step-up approval requests for purchases exceeding autonomous agent thresholds.
* **Needs:** 1-click contextual approval via dashboard/Slack with clear reasoning why the agent wants to spend money.

### Persona 3: AI Buyer Agent Developer (prasad)
* **Role:** Builds autonomous shopping assistants, procurement tools, or SaaS managers using LangChain, OpenAI, Claude, or MCP.
* **Needs:** A simple, reliable SDK / REST API / MCP Tool interface to propose payments without managing sensitive payment gateway secrets.

---

## 4. Feature Requirements & User Stories

### Feature 1: Agent IAM & Identity Registry
* **US-1.1:** As an Admin, I want to register AI agents with unique cryptographic keys (Ed25519) so that only authorized agents can communicate with TrustLayer.
* **US-1.2:** As an Admin, I want an emergency **Kill-Switch** to instantly suspend an agent across all edge nodes in $< 100\text{ms}$.

### Feature 2: Policy-as-Code & Spend Bounding Engine
* **US-2.1:** As an Admin, I want to configure per-transaction caps (e.g., max ₹5,000) and rolling 24-hour velocity limits (e.g., max ₹20,000).
* **US-2.2:** As an Admin, I want to enforce Merchant Allowlists and Merchant Category Code (MCC) filters to prevent rogue transfers.
* **US-2.3:** As an Admin, I want to define time-of-day and currency restrictions (e.g., INR only).

### Feature 3: Three-State Policy Gating Decision Engine
* **State 1 — ALLOW:** Transaction is within all spend and security bounds $\rightarrow$ TrustLayer executes Razorpay API directly and returns Order details.
* **State 2 — REQUIRE_APPROVAL:** Transaction exceeds autonomous limits (e.g., ₹25,000) $\rightarrow$ Queued in pending state; alerts human approver.
* **State 3 — DENY:** Hard policy violation (e.g., unlisted merchant, blacklisted MCC, budget exceeded) $\rightarrow$ Immediate block with structured error code.

### Feature 4: Human-in-the-Loop (HITL) Step-Up Gateway
* **US-4.1:** As a Human Approver, I want to receive real-time notifications with the agent's declared intent, amount, and reasoning.
* **US-4.2:** As a Human Approver, I want to Approve or Reject the transaction in 1 click, automatically triggering or aborting the Razorpay order.

### Feature 5: Explainability & Tamper-Evident Audit Vault
* **US-5.1:** As a Compliance Officer, I want to inspect the exact prompt/goal, LLM reasoning hash, and policy evaluation trace for any transaction.
* **US-5.2:** As an Auditor, I want a cryptographically hash-chained log ($H_n = \text{SHA256}(H_{n-1} + \text{Payload})$) to guarantee zero retroactive tampering.

### Feature 6: Razorpay Test-Mode Gateway Integration
* **US-6.1:** Native creation of Razorpay Orders (`/v1/orders`) and Payment Links (`/v1/payment_links`).
* **US-6.2:** Ingestion of Razorpay Webhooks (`order.paid`, `payment.captured`) with HMAC signature verification.

---

## 5. Scope & Hackathon MVP Deliverables

### In-Scope for Buildathon MVP:
1. **Core TrustLayer Engine:** REST API for Agent Payment Proposals (`POST /api/v1/agent/propose-payment`).
2. **Deterministic Policy Evaluator:** ABAC spend limit, MCC check, velocity rate-limiting.
3. **Razorpay Test-Mode Adapter:** Real API execution using Razorpay Test Keys.
4. **Live Interactive Dashboard:**
   * Live Transaction Stream & Explainability Trace.
   * Interactive Policy Manager.
   * Human Step-Up Approval Queue with live SSE/WebSocket updates.
   * Agent Identity & Kill-Switch Controller.
   * Cryptographic Audit Trail Explorer.
5. **Interactive AI Agent Simulator:** Built-in test runner demonstrating:
   * Scenario 1: Auto-Allowed Purchase (₹1,600 Slack Renewal).
   * Scenario 2: Gated Step-Up Approval (₹25,000 Server License).
   * Scenario 3: Blocked Hallucination / Rogue Merchant (₹75,000 Crypto Transfer).

### Out-of-Scope for MVP:
* Multi-tenant enterprise billing infrastructure (Single tenant / organization sandbox is sufficient).
* Physical credit card manufacturing (Focus is purely on digital Agentic Commerce APIs).

---

## 6. Assumptions & Dependencies

1. **Razorpay Test Mode:** System will operate using standard Razorpay Test Mode credentials (`rzp_test_key` / `rzp_test_secret`).
2. **Agent Communication:** AI Agents interact via standard JSON REST API or MCP Tool calling interface.
3. **Deterministic Fail-Closed:** Any network failure, database timeout, or policy evaluation error defaults immediately to `DENY`.
