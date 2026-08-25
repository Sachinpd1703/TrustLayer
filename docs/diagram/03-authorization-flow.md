# 03 — Authorization Decision Flow (Agentic Commerce)

## Purpose

This diagram models the deterministic decision pipeline executed by TrustLayer for every transaction requested by an autonomous AI agent.

---

## Mermaid Authorization Flowchart

```mermaid
flowchart TD
    Start(["AI Agent Proposes Payment Proposal"]) --> Step1["1. Authenticate Agent Signature (Ed25519)"]
    
    Step1 -->|Signature Invalid / Revoked| DenyKill["Decision: DENY (403)\nLog Security Alert"]
    Step1 -->|Signature Valid| Step2["2. Check Agent Status (Active / Revoked)"]
    
    Step2 -->|Agent Suspended| DenyKill
    Step2 -->|Agent Active| Step3["3. Evaluate Merchant Allowlist & MCC"]
    
    Step3 -->|Merchant Not Allowed / Blocked MCC| DenyMerchant["Decision: DENY (403)\nUnauthorized Merchant"]
    Step3 -->|Merchant Approved| Step4["4. Evaluate Velocity & Rate Limits (Redis)"]
    
    Step4 -->|Velocity Exceeded (> 20k/24h or > 5 req/min)| DenyVelocity["Decision: DENY (429)\nVelocity Cap Exceeded"]
    Step4 -->|Velocity OK| Step5{"5. Evaluate Transaction Amount"}
    
    Step5 -->|Amount <= 5,000 INR & Low Risk| Allow["Decision: ALLOW (200)\nExecute Razorpay Order API"]
    Step5 -->|5,000 < Amount <= 50,000 INR| StepUp["Decision: REQUIRE_APPROVAL (202)\nPush Slack/Webhook Alert"]
    Step5 -->|Amount > 50,000 INR| DenyCeiling["Decision: DENY (403)\nExceeds Absolute Ceiling"]
    
    StepUp --> StepUpCheck{"Admin Review Decision"}
    StepUpCheck -->|Admin Approves| Allow
    StepUpCheck -->|Admin Rejects / Timeout| DenyAdmin["Decision: DENY (403)\nRejected by Human Approver"]
    
    Allow --> CommitAudit["Log Immutable Record to Audit Vault"]
    DenyKill --> CommitAudit
    DenyMerchant --> CommitAudit
    DenyVelocity --> CommitAudit
    DenyCeiling --> CommitAudit
    DenyAdmin --> CommitAudit
```

---

## Evaluation Stages Summary

1. **Stage 1: Identity & Integrity** — Cryptographic attestation and kill-switch check.
2. **Stage 2: Merchant & Category Scope** — Validates Razorpay Merchant ID and MCC code.
3. **Stage 3: Spend Velocity & Frequency** — Redis-backed sliding window counters.
4. **Stage 4: Amount Threshold & Risk Gating** — Deterministic routing:
   * Low value ($\le ₹5,000$) $\rightarrow$ Instant execution.
   * High value ($₹5,000 - ₹50,000$) $\rightarrow$ Human step-up dual-custody approval.
   * Hard ceiling ($> ₹50,000$) $\rightarrow$ Hard block.
5. **Stage 5: Audit Vault Commitment** — SHA-256 hash-chaining of entire transaction lifecycle.
