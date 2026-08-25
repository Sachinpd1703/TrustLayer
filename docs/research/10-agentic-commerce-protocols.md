# Agentic Commerce Protocols — UAP, AP2, ACP, x402 & MCP

## 1. Overview

As AI agents evolve from conversational tools to autonomous economic actors, the need for standardized machine-to-machine commerce and payment protocols has become critical. In 2026, the industry is witnessing a rapid protocol race to define how AI agents discover services, exchange payment mandates, authorize transactions, and settle funds.

This research document analyzes the key protocols shaping the agentic commerce landscape and explains how **TrustLayer** operates as the essential governance and policy gating layer across them.

---

## 2. Protocol Landscape Matrix

| Protocol | Origin / Champions | Primary Focus | Transport / Format | TrustLayer Integration Point |
| :--- | :--- | :--- | :--- | :--- |
| **NPCI UAP** | National Payments Corp of India | Standardized authorization & mandate delegation for Indian fintech | REST / JSON-LD / UPI Mandate Specs | Validates agent mandate bounds before submitting to Razorpay / UPI rails |
| **AP2 (Agent Payment Protocol)** | Open Web / Google Ecosystem | Verifiable buyer credentials, merchant quotes, cryptographic payment receipts | JSON Schema / Cryptographic Attestations | Evaluates policy against AP2 quote before generating signed authorization token |
| **HTTP x402** | Coinbase, Lightning, Web Standards | Machine-to-machine micropayments for per-call API / data access | HTTP Status 402 / Header Tokens | Enforces per-call micro-spend velocity caps and rate limits |
| **ACP (Agent Commerce Protocol)** | E-commerce Consortia | Autonomous product discovery, cart negotiation, and checkout execution | JSON-RPC / REST | Intercepts ACP checkout payloads to enforce merchant whitelist and price caps |
| **Anthropic MCP (Model Context Protocol)** | Anthropic / Open Source | Dynamic tool discovery and contextual API invocation for LLMs | JSON-RPC over stdio / SSE | Exposes TrustLayer policy gate as a secure MCP Tool wrapper |

---

## 3. Deep-Dive into Protocols

### 3.1 NPCI Unified Authorization Protocol (UAP)
* **Objective:** Enable Indian users to delegate time-bounded, amount-capped payment mandates to autonomous software agents while retaining revocability.
* **Mechanism:**
  1. User sets up an Agent Mandate (e.g. ₹5,000/month for automated grocery and utility payments).
  2. Agent presents intent to UAP Gateway.
  3. UAP validates cryptographic signature and mandate limits.
* **TrustLayer Role:** TrustLayer provides the pre-flight policy evaluation (merchant categorization, anomaly scoring) before the UAP request reaches the Razorpay banking switch.

### 3.2 AP2 (Agent Payment Protocol)
* **Objective:** Create an end-to-end handshake between Buyer Agents and Merchant Agents.
* **Handshake Lifecycle:**
  ```text
  Buyer Agent                     Merchant Agent                TrustLayer
       │                                │                           │
       ├──── 1. Get Quote / Cart ──────>│                           │
       │<─── 2. Signed Quote Payload ───┤                           │
       │                                                            │
       ├──── 3. Submit Quote for Authorization ────────────────────>│
       │                                                            │ (Evaluates Spend Caps,
       │                                                            │  Merchant ID, Risk)
       │<─── 4. Signed Authorization Token [ALLOW] ─────────────────┤
       │                                                            │
       ├──── 5. Transact with Token ───>│                           │
       │                                ├──── 6. Razorpay API Call ─┴──> [Razorpay]
  ```

### 3.3 HTTP x402 (Payment Required)
* **Objective:** Native machine-to-machine HTTP payments where an agent accesses a paid resource (e.g. specialized LLM inference, real-time market data, paid API endpoints).
* **Workflow:**
  1. Agent requests `GET /premium-dataset`.
  2. Server responds `402 Payment Required` with payment details (e.g. Razorpay Payment Link or Lightning invoice for ₹10).
  3. TrustLayer checks agent's daily micro-spend budget. If valid, authorizes payment and caches access token.

### 3.4 Model Context Protocol (MCP) Integration
* TrustLayer acts as a trusted **MCP Server** that exposes tools to the AI Agent:
  * `propose_payment(amount, currency, merchant_id, intent, reasoning)`
  * `check_budget_status(agent_id, category)`
  * `request_human_approval(transaction_id, rationale)`

---

## 4. Why Protocols Alone Are Not Enough

Protocols provide the **syntax** of agentic transactions (how messages are structured), but **zero governance or business safety**:
* A valid AP2 payload could still contain a hallucinated ₹1,00,000 order.
* A valid x402 request could fire 10,000 times in a recursive loop, draining funds in seconds.
* An MCP tool call can be hijacked via indirect prompt injection from an untrusted webpage.

### The TrustLayer Thesis:
> **Protocols standardize the wire. TrustLayer standardizes the trust.**
