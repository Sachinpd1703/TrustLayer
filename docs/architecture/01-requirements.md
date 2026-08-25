# System Requirements — TrustLayer for Agentic Commerce

## 1. Overview

This document defines the functional, security, governance, authorization, audit, and non-functional requirements for **TrustLayer: The Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay** (Razorpay Buildathon — Track 01).

TrustLayer operates as an in-line, policy-driven security proxy between autonomous AI Buyer/Merchant Agents and Razorpay Payment APIs.

```text
Autonomous AI Buyer Agent
           ↓ (Proposes Commerce Action + Intent + Reasoning)
┌─────────────────────────────────────────────────────────────┐
│                     TRUSTLAYER GATEWAY                      │
│   - Cryptographic Agent Identity & Attestation              │
│   - Attribute-Based Policy Evaluation (ABAC)                │
│   - Financial Spend Bounds & Velocity Throttling            │
│   - Merchant Allowlist & MCC Code Filtering                 │
│   - Risk Scoring & Prompt-Injection Safeguards              │
│   - Step-Up Human Approval Queue (Dual-Custody)             │
│   - Tamper-Evident Hash-Chained Audit Logging               │
└─────────────────────────────────────────────────────────────┘
           ↓ (Only Authorized & Signed Requests)
Razorpay Payment APIs (Orders, Payment Links, Subscriptions)
```

---

## 2. Core Functional Requirements

### 2.1 Agent Identity & Credential Registry (FR-01)
* **FR-01.1 Unique Agent Identity:** Every AI agent must have a globally unique `agent_id`, cryptographic public key (Ed25519), and registered owner.
* **FR-01.2 Scoped Authorization Tokens:** Agents never touch raw Razorpay API secrets (`rzp_test_secret`). Instead, agents sign transaction requests with their private key, which TrustLayer validates before issuing short-lived Razorpay execution calls.
* **FR-01.3 Instant Kill-Switch:** Administrators can instantaneously revoke or suspend an agent's transacting authority in $< 100\text{ms}$.

### 2.2 Financial Policy & Bounded Gating Engine (FR-02)
* **FR-02.1 Per-Transaction Spend Cap:** Configurable hard limit on maximum allowable amount per single checkout (e.g., max ₹5,000).
* **FR-02.2 Velocity & Time-Window Bounds:** Rolling caps on spend per hour, per day, and per billing cycle.
* **FR-02.3 Merchant Allowlist & Category Restriction:** Transactions restricted to approved Razorpay Merchant IDs (`mid_xxxx`) or specific Merchant Category Codes (e.g., Software/SaaS only, blocking Gambling/Crypto).
* **FR-02.4 Currency & Regional Gating:** Explicit restrictions on allowable currencies (e.g., `INR` only) and domestic vs cross-border transactions.

### 2.3 Risk-Aware Human-in-the-Loop (HITL) Gateway (FR-03)
* **FR-03.1 Three-State Decision Model:** TrustLayer returns exactly one of three deterministic decisions:
  1. `ALLOW`: Executed immediately on Razorpay.
  2. `REQUIRE_APPROVAL`: Transaction queued; instant notification sent to administrator (Slack / Webhook / Dashboard). Held until signed human approval is received.
  3. `DENY`: Hard block with structured error reason returned to the AI agent.
* **FR-03.2 Anomaly & Hallucination Triggers:** Automatic escalation to `REQUIRE_APPROVAL` if amount exceeds agent's baseline average by $> 300\%$ or if prompt injection markers are detected.

### 2.4 Explainability & Tamper-Evident Audit Trails (FR-04)
* **FR-04.1 Intent & Reasoning Capture:** Agent must submit `intent` (human-readable objective) and `reasoning_hash` (LLM rationale) with every payment proposal.
* **FR-04.2 Policy Evaluation Trace:** Full record of which policy rules evaluated to true/false, contextual parameters, and decision timestamps.
* **FR-04.3 Immutable Audit Chain:** Cryptographic hash-chaining ($H_n = \text{SHA256}(H_{n-1} + \text{Payload})$) ensuring audit records cannot be retroactively altered.

### 2.5 Razorpay Integration Layer (FR-05)
* **FR-05.1 Test-Mode API Forwarder:** Native adapter for Razorpay Orders (`/v1/orders`), Payment Links (`/v1/payment_links`), and Subscriptions (`/v1/subscriptions`).
* **FR-05.2 Webhook Signature Verification:** Real-time event ingestion (`order.paid`, `payment.captured`) with HMAC-SHA256 verification to close transaction lifecycles.

---

## 3. Non-Functional Requirements (NFR)

* **NFR-01 Low Latency Overhead:** TrustLayer policy evaluation must add $< 25\text{ms}$ p99 latency to the payment pipeline.
* **NFR-02 Fail-Closed Architecture:** Any internal error, timeout, or database disconnection must default to `DENY`.
* **NFR-03 Zero-Trust Credential Isolation:** Raw payment gateway keys are stored exclusively in secure KMS/Vault and never exposed to LLMs or agent environments.
* **NFR-04 Scalability:** High-throughput stateless policy decision point capable of evaluating $> 5,000\text{ RPS}$.
