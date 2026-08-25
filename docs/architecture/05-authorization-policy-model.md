# Authorization & Policy Model — TrustLayer for Agentic Commerce

## 1. Overview

TrustLayer implements an **Attribute-Based Access Control (ABAC)** and **Policy-as-Code** engine tailored specifically for autonomous financial transactions on Razorpay.

---

## 2. Policy Dimensions & Attributes

Every transaction evaluation considers attributes across 4 dimensions:

```text
       ┌───────────────────────────┐
       │     Principal (Agent)     │ → agent_id, role, tier, owner, reputation_score
       └─────────────┬─────────────┘
                     │
       ┌─────────────▼─────────────┐
       │     Action & Payload      │ → action (e.g. create_order), amount, currency, receipt
       └─────────────┬─────────────┘
                     │
       ┌─────────────▼─────────────┐
       │    Resource (Merchant)    │ → merchant_id, category_code (MCC), domain, trust_tier
       └─────────────┬─────────────┘
                     │
       ┌─────────────▼─────────────┐
       │    Context & Environment  │ → rolling_24h_spend, time_of_day, ip_range, anomaly_score
       └───────────────────────────┘
```

---

## 3. Cedar Policy Language Schema Example

TrustLayer utilizes the high-performance **Cedar Policy Language** for sub-millisecond deterministic evaluation:

```cedar
// Policy 1: Standard Autonomous Purchase Policy
permit (
    principal in AgentGroup::"ProcurementBots",
    action == Action::"Razorpay::CreateOrder",
    resource in MerchantGroup::"ApprovedVendors"
)
when {
    context.amount <= 500000 &&              // Max ₹5,000 per order (in paise)
    context.currency == "INR" &&             // Domestic currency only
    context.rolling_24h_spend + context.amount <= 2000000 && // Daily limit ₹20,000
    context.risk_score < 0.35                // Low anomaly risk
};

// Policy 2: High-Value Step-Up Human Approval Trigger
forbid (
    principal in AgentGroup::"ProcurementBots",
    action == Action::"Razorpay::CreateOrder",
    resource
)
when {
    context.amount > 500000 && context.amount <= 5000000
}
unless {
    context.human_approval_signature != null
};

// Policy 3: Absolute Ceiling / Hard Deny
forbid (
    principal,
    action == Action::"Razorpay::CreateOrder",
    resource
)
when {
    context.amount > 5000000 ||              // Hard cap ₹50,000
    resource.mcc in ["7995", "6051"]         // Block Gambling, Crypto exchanges
};
```

---

## 4. Policy Decision Matrix

| Amount | Merchant Status | 24h Spend Velocity | Risk Score | TrustLayer Decision | Downstream Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| $\le ₹5,000$ | Approved | Within ₹20k Limit | $< 0.35$ | **ALLOW** | Execute Razorpay `/v1/orders` |
| $> ₹5,000$ and $\le ₹50,000$ | Approved | Within Limit | Any | **REQUIRE_APPROVAL** | Queue for Human Signature |
| $> ₹50,000$ | Any | Any | Any | **DENY** | Block (Exceeds Hard Ceiling) |
| Any | Untrusted / Unlisted | Any | Any | **DENY** | Block (Unauthorized Merchant) |
| Any | Any | Exceeds ₹20k Limit | Any | **DENY** | Block (Velocity Breach) |
| Any | Any | Any | $\ge 0.80$ | **DENY** | Block (High Prompt Injection Risk) |
