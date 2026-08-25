# 01 — System Architecture Diagram (Agentic Commerce on Razorpay)

## Purpose

This diagram illustrates the end-to-end architecture of **TrustLayer: The Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay**.

It demonstrates how autonomous AI Buyer Agents securely transact with Razorpay Payment APIs under strict policy bounds, spend caps, explainable audit logging, and human step-up approvals.

---

## Mermaid Architecture Diagram

```mermaid
flowchart LR
    subgraph BuyerLayer["1. AI Agent Commerce Layer"]
        User["User / Enterprise Goal\n('Procure SaaS / Restock Inventory')"]
        Agent["AI Buyer Agent\n(LLM Reasoning + Tool Calling)"]
        User -->|Goal & Intent| Agent
    end

    subgraph TrustLayerPlatform["2. TrustLayer Governance Platform"]
        Gateway["TrustLayer In-Line Gateway\n(Policy Enforcement Point - PEP)"]
        IAM["Agent IAM & Attestation\n(Ed25519 Signature Validation)"]
        PDP["Policy Decision Point\n(Spend Caps, MCC Whitelist, Velocity)"]
        Risk["Risk & Anomaly Engine\n(Prompt Injection & Hallucination Guard)"]
        HITL["Human Approval Gateway\n(Step-Up Slack / Webhook Queue)"]
        Audit["Tamper-Evident Audit Vault\n(Hash-Chained Execution Trace)"]

        Gateway --> IAM
        IAM --> PDP
        PDP --> Risk
        Risk -->|High Value / Risk| HITL
        Risk -->|Evaluated| Audit
    end

    subgraph ExecutionLayer["3. Execution & Settlement"]
        Razorpay["Razorpay Test-Mode APIs\n(/v1/orders, /v1/payment_links)"]
        Merchant["Merchant Storefront & Settlement"]
    end

    Agent -->|1. Signed Payment Proposal\n(Intent + Reasoning Hash)| Gateway
    Gateway -->|2. [ALLOW] Signed Execution Payload| Razorpay
    Razorpay -->|3. Order Created & Processed| Merchant
    HITL -.->|4. Signed Human Approval Token| Gateway
    Razorpay -.->|5. Webhooks (payment.captured)| Audit
```

---

## Architectural Planes

### 1. In-Line Enforcement Plane (Fast Path $< 15\text{ms}$)
* **Cryptographic Attestation:** Verifies agent public key and non-repudiation.
* **ABAC Policy Evaluation:** Evaluates Cedar/OPA spend caps and vendor whitelists.
* **Razorpay Adapter:** Formulates signed Razorpay Order creation request.

### 2. Dual-Custody Escalation Plane (Human-in-the-Loop)
* Triggers when transaction amount exceeds autonomous threshold ($> ₹5,000$).
* Holds execution state; sends webhook alerts to Administrator dashboard.

### 3. Compliance & Audit Plane
* Records immutable hash chain of agent reasoning, policy decision matrices, and Razorpay transaction IDs.
