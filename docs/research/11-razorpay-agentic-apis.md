# Razorpay APIs for Autonomous Agentic Commerce

## 1. Overview

To enable autonomous AI agents to transact on Razorpay, TrustLayer integrates natively with Razorpay's Test Mode and Live Mode REST APIs. This document details the exact Razorpay API endpoints used, payload structures, and how TrustLayer gates and executes them.

---

## 2. Target Razorpay APIs Matrix

| Razorpay API | Agentic Commerce Use Case | TrustLayer Gating Strategy |
| :--- | :--- | :--- |
| **Orders API** (`/v1/orders`) | Agent initiates in-app autonomous checkout on behalf of user | Verifies per-order amount cap, currency, and receipt metadata |
| **Payment Links API** (`/v1/payment_links`) | Agent generates shareable/approval link for asynchronous checkout | Binds expiration time and customer contact parameters |
| **Subscriptions API** (`/v1/subscriptions`) | Agent manages recurring SaaS, utility, or cloud replenishment | Evaluates max billing cycles, total commitment value, and plan ID |
| **Smart Collect / Virtual Accounts** (`/v1/virtual_accounts`) | B2B Agent-to-Agent automated invoice reconciliation | Validates receiver UPI VPA / Account Number against whitelist |
| **Webhooks & Events** | Real-time payment verification and audit log completion | Cryptographic HMAC-SHA256 signature verification (`X-Razorpay-Signature`) |

---

## 3. Detailed API Interaction Flows

### 3.1 Razorpay Orders API (`POST /v1/orders`)

#### Agent's Proposed Intent:
```json
{
  "agent_id": "agent_procure_v2",
  "intent": "Renew team Figma licenses for 3 seats",
  "reasoning_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "target_api": "https://api.razorpay.com/v1/orders",
  "payload": {
    "amount": 450000,
    "currency": "INR",
    "receipt": "rcpt_figma_renew_01",
    "notes": {
      "merchant_id": "mid_design_tools_01",
      "category": "SaaS_Subscription"
    }
  }
}
```

#### TrustLayer Policy Evaluation:
1. Agent identity `agent_procure_v2` is authenticated via mTLS / Ed25519 signature.
2. Amount: ₹4,500 (`450000` paise) is evaluated against daily spend cap (Limit: ₹10,000 $\rightarrow$ **PASS**).
3. Merchant `mid_design_tools_01` is checked against category whitelist (`SaaS_Subscription` $\rightarrow$ **PASS**).
4. Velocity: 1st order of the day $\rightarrow$ **PASS**.
5. **Decision:** `ALLOW`.

#### Executed Razorpay Request:
```bash
curl -u rzp_test_key:rzp_test_secret \
  -X POST https://api.razorpay.com/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 450000,
    "currency": "INR",
    "receipt": "rcpt_figma_renew_01",
    "notes": {
      "trustlayer_audit_id": "aud_9a8f2c3d4e",
      "agent_id": "agent_procure_v2"
    }
  }'
```

---

### 3.2 High-Value Transaction with Human Approval (Gated Flow)

When an AI Agent requests an order above the autonomous threshold (e.g. ₹50,000 order for server hardware):

```text
[ AI Buyer Agent ]
       │
       ▼ (Proposes ₹50,000 order)
┌────────────────────────────────────────────────────────┐
│                   TrustLayer Gateway                   │
│  - Policy check: Amount (₹50,000) > Autonomous Limit   │
│  - Action: HOLD & REQUIRE HUMAN APPROVAL               │
│  - Webhook fired to Slack / Admin Dashboard            │
└────────────────────────────────────────────────────────┘
       │
       ├──── [ Human Admin clicks APPROVE ] ────────────┐
       │                                                │
       ▼                                                ▼
[ Return 202 Pending ]                          [ Execute Razorpay Order API ]
```

---

## 4. Test-Mode Demonstration Readiness

For the Razorpay Buildathon demonstration:
* TrustLayer utilizes standard Razorpay **Test Mode API Keys** (`rzp_test_...`).
* Live webhook simulator to capture `payment.captured` and `order.paid` events.
* Full integration with Razorpay Checkout sandbox and payment link verification.
