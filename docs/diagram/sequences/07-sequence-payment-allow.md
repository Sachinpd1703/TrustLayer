# 07 — Sequence Diagram: Autonomous Payment Allowed (Razorpay)

## Purpose

Demonstrates a successful autonomous checkout flow where an AI Buyer Agent places an order within pre-configured budget caps on Razorpay.

---

## Mermaid Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Buyer / User
    participant Agent as AI Buyer Agent
    participant PEP as TrustLayer Gateway (PEP)
    participant PDP as Policy Engine (PDP)
    participant Audit as Audit Vault
    participant RZP as Razorpay API (/v1/orders)
    participant Merchant as Merchant

    User->>Agent: "Renew our annual Slack seats for ₹1,600"
    Agent->>Agent: Generate Plan & Reason about cost
    Agent->>PEP: POST /v1/agent/propose-payment<br/>(Intent, Reasoning Hash, Amount: ₹1,600, Merchant: mid_slack_01)
    
    PEP->>PEP: Verify Agent Ed25519 Signature
    PEP->>PDP: Evaluate Policy (Amount: ₹1,600, 24h Spend, Merchant MCC)
    PDP-->>PEP: Decision: ALLOW (Within ₹5,000 cap & Approved Vendor)
    
    PEP->>RZP: POST /v1/orders (amount: 160000, currency: "INR", receipt: "rcpt_slack_12")
    RZP-->>PEP: HTTP 200 OK (order_id: "order_RZP10293847", status: "created")
    
    PEP->>Audit: Append Hash-Chained Audit Record (Agent Intent + Policy Trace + Order ID)
    PEP-->>Agent: HTTP 200 OK (status: "EXECUTED", order_id: "order_RZP10293847")
    Agent-->>User: "Success: Renewed Slack seats for ₹1,600. Order ID: order_RZP10293847"
    
    RZP->>Merchant: Process Checkout / Payment Event
```
