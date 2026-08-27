# Model Context Protocol (MCP) & Protocols Specification — TrustLayer v0.2.2

**Document Version:** 0.2.2  
**Target:** Anthropic Model Context Protocol (MCP) Standard, Claude Desktop, Cursor IDE & x402 / AP2 Standards  
**Status:** Approved Specification  

---

## 1. Overview of Model Context Protocol (MCP) in TrustLayer

The **Model Context Protocol (MCP)** is Anthropic's open standard for connecting AI assistants (Claude Desktop, Cursor IDE, AutoGPT) securely to external tools and data sources.

TrustLayer exposes an official MCP Tool Server enabling LLMs to autonomously evaluate, propose, and execute gated Razorpay payments with zero risk of prompt-injection drain or runaway velocity loops.

```text
┌──────────────────────────────────────┐
│       Claude Desktop / Cursor IDE    │
│  User: "Renew monthly Figma license" │
└──────────────────┬───────────────────┘
                   │ JSON-RPC 2.0
                   ▼
┌──────────────────────────────────────┐
│     TrustLayer MCP Tool Server       │
│  Tools: propose_razorpay_payment     │
│         get_policy_limits            │
│         check_spend_budget           │
└──────────────────┬───────────────────┘
                   │ Authenticated HTTP POST
                   ▼
┌──────────────────────────────────────┐
│     TrustLayer Gateway (PEP/PDP)     │
│   Evaluates Spend Cap & MCC Whitelist│
└──────────────────┬───────────────────┘
                   │ Authorized Execution
                   ▼
┌──────────────────────────────────────┐
│        Razorpay Payment APIs         │
│         POST /v1/orders              │
└──────────────────────────────────────┘
```

---

## 2. MCP Tools Definition & Schemas

### Tool 1: `propose_razorpay_payment`
Proposes an autonomous purchase or subscription renewal on Razorpay. TrustLayer deterministically gates and executes the payment.

```json
{
  "name": "propose_razorpay_payment",
  "description": "Proposes an autonomous purchase or payment on Razorpay. The request will be securely evaluated, bounded, and gated against organizational spend policies before execution.",
  "parameters": {
    "type": "object",
    "properties": {
      "intent": {
        "type": "string",
        "description": "Human-readable explanation of why the payment is being made (e.g. 'Renew 2 Figma developer seats')."
      },
      "reasoning": {
        "type": "string",
        "description": "LLM step-by-step reasoning explaining merchant selection, price extraction, and necessity."
      },
      "amount_paise": {
        "type": "integer",
        "description": "Payment amount in INR paise (e.g. 160000 for ₹1,600)."
      },
      "merchant_id": {
        "type": "string",
        "description": "Target Razorpay Merchant ID (e.g. 'mid_figma_01', 'mid_aws_01')."
      },
      "category": {
        "type": "string",
        "description": "Merchant category (e.g. 'SaaS_Subscription', 'Cloud_Infrastructure')."
      }
    },
    "required": ["intent", "reasoning", "amount_paise", "merchant_id"]
  }
}
```

### Tool 2: `get_policy_limits`
Allows an AI agent to inspect its active per-order limits, daily remaining velocity budget, and merchant allowlist before formulating a purchase proposal.

```json
{
  "name": "get_policy_limits",
  "description": "Retrieves the active financial spend guardrails, autonomous limits, and approved vendor allowlists for the agent.",
  "parameters": {
    "type": "object",
    "properties": {
      "agent_id": {
        "type": "string",
        "description": "Unique identifier of the agent."
      }
    },
    "required": ["agent_id"]
  }
}
```

---

## 3. Claude Desktop Configuration (`claude_desktop_config.json`)

To enable Claude Desktop to use TrustLayer tools, add the following configuration block:

```json
{
  "mcpServers": {
    "trustlayer": {
      "command": "npx",
      "args": ["-y", "tsx", "src/mcp/server.ts"],
      "env": {
        "TRUSTLAYER_API_URL": "http://localhost:3000",
        "TRUSTLAYER_AGENT_ID": "agent_procure_v2",
        "TRUSTLAYER_ENCLAVE_SECRET": "trustlayer_super_secret_signing_key_2026"
      }
    }
  }
}
```

---

## 4. Merchant AI-Commerce Discovery (`.well-known/ai-commerce.json`)

To make Razorpay merchants discoverable and sellable to autonomous AI buyers, merchants host an `ai-commerce.json` catalog at their domain root:

```json
{
  "version": "1.0.0",
  "name": "Figma SaaS Storefront",
  "description": "Collaborative interface design tool subscriptions.",
  "merchant_id": "mid_figma_01",
  "mcc": "5734",
  "currency": "INR",
  "gateway": "RAZORPAY",
  "products": [
    {
      "sku": "figma-dev-monthly",
      "name": "Figma Developer Seat (Monthly)",
      "price_paise": 80000,
      "billing_period": "monthly",
      "checkout_endpoint": "https://api.trustlayer.internal/api/v1/agent/propose-payment"
    },
    {
      "sku": "figma-org-annual",
      "name": "Figma Organization (Annual)",
      "price_paise": 5400000,
      "billing_period": "annual",
      "checkout_endpoint": "https://api.trustlayer.internal/api/v1/agent/propose-payment"
    }
  ]
}
```
