# 09 — Sequence Diagram: Hallucination / Rogue Payment Blocked

## Purpose

Demonstrates graceful failure handling where an AI agent hallucinates an amount, targets an unapproved merchant, or falls victim to prompt injection. TrustLayer intercepts and blocks the request before Razorpay APIs are ever touched.

---

## Mermaid Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Compromised / Hallucinating Agent
    participant PEP as TrustLayer Gateway (PEP)
    participant PDP as Policy Engine (PDP)
    participant Audit as Audit Vault
    participant RZP as Razorpay API (/v1/orders)

    Agent->>PEP: POST /v1/agent/propose-payment<br/>(Amount: ₹75,000, Merchant: mid_untrusted_crypto)
    
    PEP->>PEP: Authenticate Agent Signature
    PEP->>PDP: Evaluate Policy & Risk Rules
    PDP-->>PEP: Decision: DENY<br/>(Reason: Unauthorized Merchant & Exceeds Hard Ceiling)
    
    PEP->>Audit: Append Blocked Event to Tamper-Evident Audit Vault
    Note over PEP,RZP: Razorpay API is NEVER called. Capital is 100% protected.
    
    PEP-->>Agent: HTTP 403 Forbidden<br/>{"error": "POLICY_VIOLATION", "code": "UNAUTHORIZED_MERCHANT"}
    Agent->>Agent: Gracefully Handle Error & Abort Purchase Workflow
```
