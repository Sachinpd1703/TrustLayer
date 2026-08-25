# System Architecture — TrustLayer for Agentic Commerce

## 1. Architectural Overview

TrustLayer provides a zero-trust, high-throughput authorization and policy gating layer that isolates autonomous AI Buyer Agents from direct access to Razorpay Payment APIs.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          1. AGENT COMMERCE LAYER                            │
│  Autonomous AI Buyers | Personal Assistants | Procurement Bots | MCP Tools  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1. Signed Intent & Payment Proposal
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       2. TRUSTLAYER GATEWAY PLATFORM                        │
│                                                                             │
│   ┌───────────────────────────┐         ┌───────────────────────────────┐   │
│   │   Agent IAM & Attestation │         │ Policy Decision Point (PDP)   │   │
│   │   - Ed25519 Signature Val │         │ - Spend Cap & Velocity Engine │   │
│   │   - Principal & Token Ver │         │ - Merchant Allowlist / MCC    │   │
│   └─────────────┬─────────────┘         └──────────────┬────────────────┘   │
│                 │                                      │                    │
│                 ▼                                      ▼                    │
│   ┌───────────────────────────┐         ┌───────────────────────────────┐   │
│   │   Real-Time Risk Engine   │         │ Human Approval Gateway (HITL) │   │
│   │   - Anomaly & Hallucination│        │ - Webhook / Slack Escalation  │   │
│   │   - Prompt-Injection Guard│         │ - Dual-Custody State Machine  │   │
│   └─────────────┬─────────────┘         └──────────────┬────────────────┘   │
│                 │                                      │                    │
│                 ▼                                      ▼                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │             Tamper-Evident Hash-Chained Audit Vault                 │   │
│   │             - Agent Intent + Reasoning Hash + Policy Trace          │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ 2. Authorized & Signed Payload
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       3. EXECUTION & SETTLEMENT LAYER                       │
│      Razorpay Test-Mode APIs (Orders, Payment Links, Subscriptions)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 Agent IAM & Identity Attestation
* **Function:** Validates the cryptographic identity of the calling agent.
* **Mechanism:** Every agent request includes an `X-Agent-Signature` generated using the agent's private Ed25519 key. TrustLayer validates this against the registered public key stored in the Agent Registry.
* **Credential Isolation:** The AI agent never receives or manages Razorpay API keys (`rzp_test_...`). Razorpay credentials remain locked in TrustLayer's secure KMS enclave.

### 2.2 Policy Decision Point (PDP) & Policy Engine
* **Function:** Evaluates fine-grained Attribute-Based Access Control (ABAC) policies.
* **Core Rule Checks:**
  1. `PerTransactionLimit`: Rejects if $\text{amount} > \text{cap}$.
  2. `VelocityLimit`: Queries Redis sliding-window counter for cumulative spend in the last 1hr / 24hrs.
  3. `MerchantAllowlist`: Validates target Razorpay Merchant ID against authorized partners.
  4. `CategoryRestriction`: Blocks prohibited Merchant Category Codes (MCC).

### 2.3 Real-Time Risk & Prompt-Injection Guard
* **Function:** Analyzes LLM reasoning traces and payload structure for anomalies.
* **Checks:** Flags unexpected quantity multipliers, suspicious payee metadata, or known prompt injection jailbreak strings embedded in input prompts.

### 2.4 Human-in-the-Loop (HITL) Approval Gateway
* **Function:** Manages asynchronous escalation for transactions exceeding autonomous thresholds.
* **Lifecycle:**
  * Status: `PENDING_HUMAN_APPROVAL`
  * Action: Generates temporary cryptographically-signed approval link and pushes webhook to manager.
  * Timeout: If unapproved within expiration window (e.g. 15 minutes), state auto-transitions to `EXPIRED_DENIED`.

### 2.5 Razorpay Execution Adapter
* **Function:** Formulates and dispatches authenticated HTTP requests to Razorpay APIs (`/v1/orders`, `/v1/payment_links`, etc.) using securely injected merchant secrets.
* **Idempotency:** Generates deterministic `receipt` and idempotency keys to prevent duplicate billing.

### 2.6 Tamper-Evident Audit Vault
* **Function:** Records full lineage of every transaction attempt.
* **Data Stored:**
  * Timestamp, `agent_id`, `merchant_id`, `amount`, `currency`
  * Agent's declared `intent` and `reasoning_hash`
  * Detailed policy evaluation breakdown
  * Razorpay Order ID and transaction status
  * Merkle tree node hash linking to previous log entry

---

## 3. High-Performance Runtime Budget

To ensure frictionless agentic commerce, TrustLayer's hot path is engineered for ultra-low latency:

| Step | Operation | Target Latency |
| :--- | :--- | :--- |
| 1 | Ed25519 Signature & Token Verification | $2\text{ms}$ |
| 2 | In-Memory Policy Evaluation (Cedar / OPA Engine) | $5\text{ms}$ |
| 3 | Redis Sliding-Window Velocity Lookup | $3\text{ms}$ |
| 4 | Asynchronous Audit Log Dispatch | $< 1\text{ms}$ (Non-blocking) |
| **Total** | **TrustLayer Internal Overhead** | **$< 15\text{ms}$** |
| 5 | Downstream Razorpay API Execution | $100\text{ms} - 250\text{ms}$ |

---

## 4. Architectural Summary

TrustLayer transforms unconstrained, non-deterministic AI agent tool calls into **deterministic, policy-compliant, explainable, and auditable financial transactions on Razorpay**.
