# 08 — Sequence Diagram: High-Value Step-Up Human Approval

## Purpose

Demonstrates how TrustLayer gates high-value transactions exceeding autonomous limits ($> ₹5,000$) and executes them on Razorpay only upon receiving signed human approval.

---

## Mermaid Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Agent as AI Buyer Agent
    participant PEP as TrustLayer Gateway (PEP)
    participant PDP as Policy Engine (PDP)
    actor Admin as Finance Approver (Slack/Dashboard)
    participant Audit as Audit Vault
    participant RZP as Razorpay API (/v1/orders)

    Agent->>PEP: POST /v1/agent/propose-payment<br/>(Amount: ₹25,000, Merchant: mid_cloud_server)
    PEP->>PDP: Evaluate Policy (Amount: ₹25,000)
    PDP-->>PEP: Decision: REQUIRE_APPROVAL (Amount > ₹5,000 Autonomous Cap)
    
    PEP->>PEP: Generate approval_id ("appr_88bc") & Sign Token
    PEP->>Admin: Push Webhook / Slack Alert ("Approve ₹25,000 order by Agent?")
    PEP->>Audit: Log State: PENDING_HUMAN_APPROVAL
    PEP-->>Agent: HTTP 202 Accepted (status: "PENDING_APPROVAL", approval_id: "appr_88bc")
    
    Admin->>PEP: POST /v1/approvals/appr_88bc/decide (decision: "APPROVE", signature: "rsa_sig_..")
    PEP->>PEP: Verify Approver Signature
    
    PEP->>RZP: POST /v1/orders (amount: 2500000, currency: "INR")
    RZP-->>PEP: HTTP 200 OK (order_id: "order_RZP55443322")
    
    PEP->>Audit: Append Completed Audit Record with Human Signature Link
    PEP->>Agent: Webhook Notification: Order Executed (order_id: "order_RZP55443322")
```
