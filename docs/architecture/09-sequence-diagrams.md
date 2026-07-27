# Sequence Diagrams

## Overview

Sequence diagrams illustrate how the components of the Governance Layer collaborate to process requests over time.

Unlike the system architecture, which focuses on static relationships, sequence diagrams describe the runtime interactions between AI agents, governance services, and banking systems.

These diagrams help explain:

* Authentication
* Authorization
* Policy evaluation
* Human approval
* Audit logging
* Permission revocation

The following workflows represent the core runtime behavior of the Governance Layer.

---

# Sequence Diagram 1 – Authorization Request (Primary Workflow)

This is the most important workflow in the platform.

Every sensitive AI action passes through this authorization pipeline before reaching banking systems.

```text id="1mx9bb"
AI Agent
    │
    │ POST /authorize
    ▼
API Gateway
    │
    ▼
Authentication Service
    │ Verify JWT
    ▼
Agent Registry
    │ Load Agent + Role
    ▼
Authorization Service
    │
    ├────────► Policy Engine
    │              │
    │              ▼
    │        Evaluate Policies
    │
    ├────────► Spend Control
    │              │
    │              ▼
    │       Validate Limits
    │
    ├────────► Risk Engine
    │              │
    │              ▼
    │       Calculate Risk
    │
    ▼
Decision

ALLOW
DENY
REQUIRE_APPROVAL
```

### Description

1. AI Agent sends an authorization request.
2. API Gateway validates the request.
3. Authentication Service verifies the JWT.
4. Agent Registry loads identity and role information.
5. Authorization Service coordinates the decision.
6. Policy Engine evaluates governance policies.
7. Spend Control validates financial limits.
8. Risk Engine evaluates contextual risk.
9. A final decision is returned.

---

# Sequence Diagram 2 – Human Approval Workflow

Some operations require explicit approval before execution.

```text id="ukltz2"
Authorization Service
        │
        ▼
Approval Service
        │
        ▼
Create Approval Request
        │
        ▼
Notification Service
        │
        ▼
Human Approver
        │
Approve / Reject
        │
        ▼
Approval Service
        │
        ▼
Authorization Request Updated
        │
        ▼
Audit Service
```

### Description

1. Authorization determines that approval is required.
2. Approval Service creates a pending request.
3. Notification Service alerts the approver.
4. Human reviews the request.
5. Approval status is updated.
6. Audit record is created.

---

# Sequence Diagram 3 – Successful Banking Operation

This diagram illustrates a complete successful request.

```text id="mwwnbh"
AI Agent
     │
     ▼
Governance Layer
     │
ALLOW
     ▼
Banking API
     │
Execute Transaction
     ▼
Response
     │
     ▼
Audit Service
     │
     ▼
Monitoring
```

### Description

1. Governance approves the request.
2. Banking API executes the operation.
3. Response is returned.
4. Audit entry is created.
5. Monitoring metrics are updated.

---

# Sequence Diagram 4 – Permission Revocation

Banks must be able to revoke an AI agent's permissions immediately.

```text id="1nqwjv"
Administrator
      │
Disable Agent
      ▼
Agent Registry
      │
Update Status
      ▼
Authentication Service
      │
Invalidate Tokens
      ▼
Policy Engine
      │
Future Requests Denied
      ▼
Audit Service
```

### Description

1. Administrator disables an AI agent.
2. Agent status changes to REVOKED.
3. Active credentials are invalidated.
4. Future authorization requests fail.
5. Revocation is recorded.

---

# Sequence Diagram 5 – Policy Update

Governance policies evolve over time without interrupting service.

```text id="67q3bk"
Administrator
      │
Update Policy
      ▼
Policy Service
      │
Create New Version
      ▼
Policy Repository
      │
Mark Active Version
      ▼
Audit Service
      │
Record Change
```

### Description

1. Administrator updates a governance policy.
2. A new policy version is created.
3. The previous version remains available for historical decisions.
4. Policy changes are audited.

---

# Runtime Sequence Summary

| Workflow                     | Purpose                                |
| ---------------------------- | -------------------------------------- |
| Authorization Request        | Evaluate AI actions before execution   |
| Human Approval               | Handle high-risk operations            |
| Successful Banking Operation | Execute approved financial actions     |
| Permission Revocation        | Immediately disable compromised agents |
| Policy Update                | Safely evolve governance rules         |

---

# Timing Considerations

Not every step has the same execution characteristics.

### Synchronous Operations

These must complete before a response is returned.

* Authentication
* Authorization
* Policy evaluation
* Spend validation
* Risk evaluation

### Asynchronous Operations

These can occur after the client receives a response.

* Notifications
* Dashboard updates
* Analytics
* Operational metrics
* Security alerts

Keeping the critical authorization path synchronous minimizes latency while allowing supporting services to scale independently.

---

# Error Handling During Runtime

At any stage, processing may stop if a security or validation check fails.

Examples:

* Invalid JWT → 401 Unauthorized
* Disabled Agent → 403 Forbidden
* Policy Deny → 403 Forbidden
* Spending Limit Exceeded → 202 Accepted (Approval Required) or 403 Forbidden
* Banking API Failure → 500 Internal Server Error (with audit entry)

Every failure generates:

* Authorization Event
* Audit Log
* Monitoring Metric

This ensures complete traceability.

---

# Architecture Recommendations

## 1. Keep the Authorization Pipeline Linear

The primary authorization workflow should follow a predictable sequence.

```text id="nmkytg"
Authentication
      ↓
Identity Resolution
      ↓
Permission Check
      ↓
Policy Evaluation
      ↓
Risk Evaluation
      ↓
Spend Validation
      ↓
Approval Decision
```

Avoid branching unnecessarily until a final decision is reached.

---

## 2. Separate Decision-Making from Side Effects

The authorization decision should complete before triggering:

* Notifications
* Metrics
* Analytics
* External integrations

This keeps the response fast and deterministic.

---

## 3. Persist State Between Stages

Every important stage should update the AuthorizationRequest and create an AuthorizationEvent.

Example lifecycle:

                REQUEST_RECEIVED
                        │
                        ▼
                AUTHENTICATED
                        │
                        ▼
               POLICY_EVALUATED
                        │
        ┌───────────────┼───────────────┐
        ▼                               ▼
      DENIED                    SPEND_VALIDATED
                                        │
                         ┌──────────────┼──────────────┐
                         ▼                             ▼
                    APPROVAL_REQUIRED             APPROVED
                         │                             │
                         ▼                             ▼
                WAITING_FOR_APPROVAL            EXECUTED
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
         APPROVED               REJECTED
              │
              ▼
          EXECUTED

This creates a complete execution timeline for debugging and compliance.

---

## 4. Keep Human Approval Outside the Critical Path

Only requests that truly require approval should pause.

All other requests should continue directly to execution.

---

## 5. Version Policies Transparently

When evaluating a request, always record the exact policy version used.

This ensures that historical decisions remain explainable even after policies change.

---

# Key Takeaways

* Sequence diagrams describe the runtime collaboration between the Governance Layer components, complementing the static architecture documents.
* The authorization workflow is the central sequence, coordinating authentication, policy evaluation, spend validation, risk assessment, and approval before any banking operation is executed.
* Human approval, policy updates, and permission revocation are modeled as independent workflows, ensuring the platform remains secure, auditable, and adaptable.
* Persisting authorization requests and lifecycle events provides full traceability, making every governance decision reproducible and easier to investigate.
