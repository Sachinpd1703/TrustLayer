# API Design

## 1. Overview

This document defines the API architecture and contracts for the **AI Agent Governance and Authorization Gateway**.

The API layer supports two major categories of operations:

```text
CONTROL PLANE
    ↓
Agent Management
Tool Management
Permission Management
Policy Management
Governance Administration

RUNTIME / DATA PLANE
    ↓
Action Requests
Authorization
Risk Evaluation
Human Approval
Tool Execution
Audit
```

The central runtime principle is:

```text
AI Agent
    ↓
Governance Gateway
    ↓
Authorization
    ↓
Policy Decision
    ↓
Protected Service
```

The AI agent should not directly invoke sensitive enterprise services when those actions require governance.

---

# 2. API Design Goals

The API should provide:

```text
Consistent contracts

Clear authorization boundaries

Auditability

Traceability

Policy-engine independence

Idempotency where necessary

Safe failure behavior

Human approval workflows

Versionability

Machine-readable errors
```

The API must also preserve the distinction between:

```text
REQUESTING an action
```

and:

```text
AUTHORIZING an action
```

and:

```text
EXECUTING an action
```

These are separate operations.

---

# 3. High-Level API Architecture

```text
                       ADMIN / GOVERNANCE UI
                               │
                               ▼
                    ┌──────────────────────┐
                    │  GOVERNANCE APIs     │
                    │                      │
                    │ Agents               │
                    │ Tools                │
                    │ Permissions          │
                    │ Policies             │
                    │ Approvals            │
                    │ Audit                │
                    └──────────┬───────────┘
                               │
                               ▼
                         GOVERNANCE DB


AI AGENT
   │
   │ Governed Action Request
   ▼
┌────────────────────────────────────────────┐
│            GOVERNANCE GATEWAY              │
└─────────────────────┬──────────────────────┘
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
       Identity      Risk      Authorization
                                 Service
                                    │
                                    ▼
                              Policy Adapter
                                    │
                                    ▼
                               OPA / Cedar
                                    │
                                    ▼
                                 Decision
                      │
                      ▼
          ALLOW / DENY / REQUIRE_APPROVAL
                      │
          ┌───────────┼──────────────┐
          ▼           ▼              ▼
       Execute       Block        Approval
          │                           │
          ▼                           ▼
   Protected Service               Human
```

---

# 4. API Categories

Recommended API groups:

```text
/api/v1/agents

/api/v1/tools

/api/v1/permissions

/api/v1/policies

/api/v1/actions

/api/v1/authorization

/api/v1/approvals

/api/v1/audit

/api/v1/risk
```

Internal service APIs may use separate routes or service-to-service communication.

---

# 5. API Versioning

Use URL-based API versioning for the MVP:

```text
/api/v1/...
```

Example:

```text
POST /api/v1/actions
```

Future incompatible changes can become:

```text
/api/v2/actions
```

This keeps API evolution explicit.

---

# 6. Authentication

Every caller must be authenticated.

Different API categories may use different identities.

```text
Governance APIs
    ↓
Human User Identity

Runtime APIs
    ↓
AI Agent / Workload Identity

Internal APIs
    ↓
Service Identity
```

The system should never trust identity supplied only inside a JSON body.

Bad:

```json
{
  "agentId": "AGT-001"
}
```

with no authenticated caller identity.

An attacker could simply change:

```text
AGT-001
```

to another agent.

Instead:

```text
Authenticated Identity
        ↓
Resolved Principal
        ↓
AGT-001
```

The body may contain identifiers for correlation, but security identity comes from trusted authentication.

---

# 7. Authorization of Governance APIs

The governance platform itself must also be protected.

For example:

```text
AGENT_OWNER
→ Manage owned agents

APPROVER
→ Review approval requests

AUDITOR
→ Read audit information

ADMIN
→ Manage tools, policies and permissions
```

An AI agent should not automatically be allowed to call:

```text
POST /api/v1/policies

POST /api/v1/permissions

POST /api/v1/agents/{id}/disable
```

unless explicitly designed and authorized for such administrative capabilities.

---

# 8. Standard Response Envelope

For normal API responses:

```json
{
  "data": {},
  "meta": {
    "requestId": "REQ-API-12345",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

For collections:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 125
  }
}
```

The exact envelope can be simplified during implementation if necessary.

---

# 9. Standard Error Response

Recommended:

```json
{
  "error": {
    "code": "AGENT_DISABLED",
    "message": "The agent is disabled.",
    "details": {}
  },
  "meta": {
    "requestId": "REQ-API-12345",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

The API should return stable machine-readable codes.

Applications should not depend on parsing human-readable messages.

---

# 10. Error Categories

Examples:

```text
AUTHENTICATION_REQUIRED

INVALID_TOKEN

FORBIDDEN

VALIDATION_ERROR

RESOURCE_NOT_FOUND

AGENT_NOT_FOUND

AGENT_DISABLED

TOOL_DISABLED

ACTION_NOT_FOUND

MISSING_PERMISSION

OUTSIDE_PERMISSION_BOUNDARY

POLICY_DENIED

APPROVAL_REQUIRED

APPROVAL_EXPIRED

APPROVAL_ALREADY_DECIDED

RISK_EVALUATION_FAILED

POLICY_ENGINE_UNAVAILABLE

TOOL_EXECUTION_FAILED

INTERNAL_ERROR
```

---

# 11. HTTP Status Codes

Recommended conventions:

| Status | Meaning                            |
| ------ | ---------------------------------- |
| 200    | Successful operation               |
| 201    | Resource created                   |
| 202    | Accepted / asynchronous processing |
| 204    | Successful operation with no body  |
| 400    | Invalid request                    |
| 401    | Authentication required/failed     |
| 403    | Authenticated but not authorized   |
| 404    | Resource not found                 |
| 409    | State conflict                     |
| 422    | Semantically invalid request       |
| 429    | Rate limit exceeded                |
| 500    | Internal failure                   |
| 502    | Downstream service failure         |
| 503    | Required service unavailable       |

Runtime authorization outcomes should also be represented explicitly in the response body rather than relying only on HTTP status codes.

---

# 12. Agent Management API

## Create Agent

```text
POST /api/v1/agents
```

Request:

```json
{
  "name": "PaymentAgent",
  "description": "Handles governed payment operations",
  "ownerId": "USR-001",
  "riskClass": "HIGH"
}
```

Response:

```json
{
  "data": {
    "agentKey": "AGT-001",
    "name": "PaymentAgent",
    "status": "DRAFT",
    "riskClass": "HIGH"
  }
}
```

Audit event:

```text
AGENT_CREATED
```

---

# 13. Get Agent

```text
GET /api/v1/agents/{agentKey}
```

Example:

```text
GET /api/v1/agents/AGT-001
```

Response:

```json
{
  "data": {
    "agentKey": "AGT-001",
    "name": "PaymentAgent",
    "description": "Handles governed payment operations",
    "status": "ACTIVE",
    "riskClass": "HIGH",
    "ownerId": "USR-001"
  }
}
```

---

# 14. List Agents

```text
GET /api/v1/agents
```

Possible filters:

```text
status

riskClass

ownerId

name
```

Example conceptually:

```text
GET /api/v1/agents?status=ACTIVE
```

Pagination should be supported.

---

# 15. Update Agent

```text
PATCH /api/v1/agents/{agentKey}
```

Example:

```json
{
  "description": "Updated Payment Agent",
  "riskClass": "HIGH"
}
```

Sensitive fields should not all be freely editable.

For example, changing ownership or lifecycle state may require separate privileged operations.

---

# 16. Activate Agent

```text
POST /api/v1/agents/{agentKey}/activate
```

Possible transition:

```text
DRAFT
  ↓
ACTIVE
```

Audit:

```text
AGENT_ACTIVATED
```

---

# 17. Suspend Agent

```text
POST /api/v1/agents/{agentKey}/suspend
```

Result:

```text
ACTIVE
  ↓
SUSPENDED
```

Any new runtime requests should then be denied.

---

# 18. Disable Agent

```text
POST /api/v1/agents/{agentKey}/disable
```

Example:

```json
{
  "reason": "Agent credentials suspected to be compromised"
}
```

Result:

```text
DISABLED
```

Audit:

```text
AGENT_DISABLED
```

The reason should be retained.

---

# 19. Tool Management API

## Register Tool

```text
POST /api/v1/tools
```

Request:

```json
{
  "name": "PaymentService",
  "description": "Internal payment processing service",
  "type": "HTTP_API"
}
```

Response:

```json
{
  "data": {
    "toolKey": "TOOL-001",
    "name": "PaymentService",
    "status": "ACTIVE"
  }
}
```

---

# 20. Register Tool Action

```text
POST /api/v1/tools/{toolKey}/actions
```

Request:

```json
{
  "actionKey": "payment.execute",
  "name": "Execute Payment",
  "description": "Executes an authorized payment",
  "riskClass": "HIGH"
}
```

Response:

```json
{
  "data": {
    "actionKey": "payment.execute",
    "toolKey": "TOOL-001",
    "riskClass": "HIGH",
    "status": "ACTIVE"
  }
}
```

---

# 21. List Tool Actions

```text
GET /api/v1/tools/{toolKey}/actions
```

Example result:

```json
{
  "data": [
    {
      "actionKey": "payment.read"
    },
    {
      "actionKey": "payment.create"
    },
    {
      "actionKey": "payment.execute"
    }
  ]
}
```

---

# 22. Disable Tool

```text
POST /api/v1/tools/{toolKey}/disable
```

A disabled tool must not be executable even if permissions and policies would otherwise allow access.

This provides an operational kill switch.

---

# 23. Permission Management API

## Grant Permission

```text
POST /api/v1/agents/{agentKey}/permissions
```

Request:

```json
{
  "actionKey": "payment.execute",
  "reason": "Required for approved payment workflows"
}
```

Response:

```json
{
  "data": {
    "permissionId": "PERM-001",
    "agentKey": "AGT-001",
    "actionKey": "payment.execute",
    "status": "ACTIVE"
  }
}
```

Audit:

```text
PERMISSION_GRANTED
```

---

# 24. Permission Grant Validation

Before granting:

```text
Agent Exists?
      ↓
Agent Eligible?
      ↓
Action Exists?
      ↓
Within Permission Boundary?
      ↓
Caller Authorized to Grant?
      ↓
Create Assignment
```

A permission outside the agent's boundary should not become effective.

Prefer rejecting the grant itself rather than storing a misleading active permission.

---

# 25. List Agent Permissions

```text
GET /api/v1/agents/{agentKey}/permissions
```

Response:

```json
{
  "data": [
    {
      "actionKey": "account.read",
      "status": "ACTIVE"
    },
    {
      "actionKey": "payment.execute",
      "status": "ACTIVE"
    }
  ]
}
```

---

# 26. Revoke Permission

```text
DELETE /api/v1/agents/{agentKey}/permissions/{permissionId}
```

Semantically, this should normally perform:

```text
status = REVOKED
```

rather than physically deleting the database record.

Alternative explicit endpoint:

```text
POST /api/v1/agents/{agentKey}/permissions/{permissionId}/revoke
```

may make the governance semantics clearer.

---

# 27. Permission Boundary API

Set or update an agent boundary:

```text
PUT /api/v1/agents/{agentKey}/permission-boundary
```

Request:

```json
{
  "allowedActions": [
    "account.read",
    "transaction.read",
    "payment.create",
    "payment.execute"
  ]
}
```

The system should audit boundary changes.

---

# 28. Policy Management API

## Create Policy

```text
POST /api/v1/policies
```

Request:

```json
{
  "name": "Payment Risk Policy",
  "description": "Controls payment execution based on transaction risk",
  "category": "RISK",
  "ownerId": "USR-SECURITY-01"
}
```

Response:

```json
{
  "data": {
    "policyKey": "POL-PAYMENT-001",
    "status": "DRAFT"
  }
}
```

---

# 29. Create Policy Version

```text
POST /api/v1/policies/{policyKey}/versions
```

Example:

```json
{
  "engine": "OPA_REGO",
  "definition": "<policy source>"
}
```

Response:

```json
{
  "data": {
    "policyKey": "POL-PAYMENT-001",
    "version": 1,
    "status": "DRAFT"
  }
}
```

The definition should be treated as immutable after version creation.

Changes create another version.

---

# 30. Validate Policy Version

```text
POST /api/v1/policies/{policyKey}/versions/{version}/validate
```

Validation may include:

```text
Syntax validation

Known action validation

Required field validation

Policy-engine compilation

Basic test execution
```

Response:

```json
{
  "data": {
    "valid": true,
    "errors": []
  }
}
```

---

# 31. Activate Policy Version

```text
POST /api/v1/policies/{policyKey}/versions/{version}/activate
```

Example:

```text
Version 2
ACTIVE
```

Previous active version becomes:

```text
SUPERSEDED
```

Audit:

```text
POLICY_ACTIVATED
```

---

# 32. Runtime Action API

This is the most important API in the system.

The AI agent should submit its desired action through:

```text
POST /api/v1/actions
```

rather than directly calling:

```text
PaymentService.execute(...)
```

---

# 33. Action Request

Example:

```json
{
  "action": "payment.execute",
  "resource": {
    "type": "payment",
    "id": "PAY-1001"
  },
  "arguments": {
    "amount": 5000,
    "currency": "USD",
    "beneficiaryId": "BEN-101"
  }
}
```

Notice that trusted security context is not accepted directly from the agent.

The agent should not be allowed to declare:

```json
{
  "risk": "LOW",
  "humanApproval": true
}
```

and have those values trusted.

---

# 34. Principal Resolution

The gateway determines:

```text
Authenticated Agent Credential
           ↓
      Identity Service
           ↓
         AGT-001
```

The resolved identity becomes:

```json
{
  "principal": {
    "type": "AI_AGENT",
    "id": "AGT-001"
  }
}
```

internally.

---

# 35. Runtime Request Processing

```text
POST /actions
     │
     ▼
Authenticate Agent
     │
     ▼
Resolve Principal
     │
     ▼
Validate Request
     │
     ▼
Resolve Tool Action
     │
     ▼
Check Agent Lifecycle
     │
     ▼
Check Permission
     │
     ▼
Check Boundary
     │
     ▼
Build Trusted Context
     │
     ▼
Risk Assessment
     │
     ▼
Authorization
     │
     ▼
Policy Evaluation
     │
     ▼
Decision
```

---

# 36. ALLOW Response

If authorization returns:

```text
ALLOW
```

the Gateway executes the protected action.

Example response:

```json
{
  "data": {
    "requestId": "REQ-1001",
    "decision": "ALLOW",
    "status": "SUCCEEDED",
    "result": {
      "paymentId": "PAY-1001",
      "paymentStatus": "EXECUTED"
    }
  }
}
```

The agent receives the result only after governed execution.

---

# 37. DENY Response

Example:

```json
{
  "data": {
    "requestId": "REQ-1002",
    "decision": "DENY",
    "status": "DENIED",
    "reason": {
      "code": "HIGH_RISK_TRANSACTION",
      "message": "The requested transaction exceeds the permitted risk level."
    }
  }
}
```

The protected Payment Service must not be invoked.

---

# 38. REQUIRE_APPROVAL Response

Example:

```json
{
  "data": {
    "requestId": "REQ-1003",
    "decision": "REQUIRE_APPROVAL",
    "status": "PENDING_APPROVAL",
    "approval": {
      "approvalId": "APR-1001",
      "status": "PENDING"
    }
  }
}
```

The agent must not interpret this as authorization.

```text
REQUIRE_APPROVAL
≠
ALLOW
```

---

# 39. Authorization API

The architecture may expose an internal authorization endpoint:

```text
POST /internal/v1/authorize
```

This endpoint should normally be called by the Governance Gateway, not directly by arbitrary agents.

Request:

```json
{
  "principal": {
    "type": "AI_AGENT",
    "id": "AGT-001"
  },
  "action": "payment.execute",
  "resource": {
    "type": "payment",
    "id": "PAY-1001"
  },
  "context": {
    "amount": 5000,
    "risk": "MEDIUM",
    "customerAuthenticated": true,
    "humanApproval": false
  }
}
```

---

# 40. Authorization Response

```json
{
  "decisionId": "DEC-1001",
  "effect": "REQUIRE_APPROVAL",
  "reason": {
    "code": "PAYMENT_APPROVAL_REQUIRED",
    "message": "This payment requires human approval."
  },
  "matchedPolicies": [
    {
      "policyKey": "POL-PAYMENT-001",
      "version": 3
    }
  ]
}
```

---

# 41. Why Authorization Is Internal

If agents can directly call:

```text
/authorize
```

and then separately call:

```text
/payment/execute
```

we create a dangerous gap:

```text
Check
   ↓
Agent receives ALLOW
   ↓
Context changes
   ↓
Agent executes something different
```

This is a form of:

```text
TOCTOU
=
Time Of Check To Time Of Use
```

The Gateway should tightly couple authorization and execution.

---

# 42. Correct Runtime Boundary

Preferred:

```text
Agent
   │
   ▼
Governance Gateway
   │
   ├── Authorize
   │
   └── Execute
```

Not:

```text
Agent
   │
   ├── Ask Authorization Service
   │
   └── Directly Call Payment Service
```

The second architecture lets the agent bypass enforcement.

---

# 43. Policy Engine API

The Authorization Service communicates with the selected policy engine through an adapter.

Conceptually:

```text
Authorization Service
        ↓
PolicyEngine interface
        ↓
┌───────────────┐
│ evaluate(...) │
└───────────────┘
        ↓
OPA / Cedar
```

The rest of the application should not depend directly on Rego or Cedar-specific request structures.

---

# 44. OPA Adapter

Conceptually:

```text
AuthorizationRequest
       ↓
OPA Adapter
       ↓
OPA Input Document
       ↓
OPA
       ↓
OPA Result
       ↓
Normalized Decision
```

The adapter converts:

```text
OPA Result
```

into:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

according to our domain semantics.

---

# 45. Cedar Adapter

Similarly:

```text
AuthorizationRequest
       ↓
Cedar Adapter
       ↓
Principal
Action
Resource
Context
       ↓
Cedar Evaluation
       ↓
Normalized Decision
```

The Gateway should not care which engine produced the result.

---

# 46. Risk API

Risk evaluation may be internal:

```text
POST /internal/v1/risk/evaluate
```

Request:

```json
{
  "action": "payment.execute",
  "resource": {
    "type": "payment",
    "id": "PAY-1001"
  },
  "attributes": {
    "amount": 5000,
    "beneficiaryStatus": "NEW"
  }
}
```

Response:

```json
{
  "assessmentId": "RISK-1001",
  "riskLevel": "HIGH",
  "score": 85,
  "reasons": [
    "Large payment amount",
    "New beneficiary"
  ]
}
```

---

# 47. Risk API Responsibility

The Risk Service determines:

```text
How risky is this request?
```

It does not determine:

```text
Is this agent authorized?
```

Therefore:

```text
Risk Service
     ↓
HIGH
```

then:

```text
Authorization Policy
     ↓
HIGH risk
     ↓
DENY
```

This separation should remain visible in the API architecture.

---

# 48. Approval API

## List Pending Approvals

```text
GET /api/v1/approvals?status=PENDING
```

Used by:

```text
Human Approval Dashboard
```

Response:

```json
{
  "data": [
    {
      "approvalId": "APR-1001",
      "requestId": "REQ-1003",
      "agent": {
        "agentKey": "AGT-001",
        "name": "PaymentAgent"
      },
      "action": "payment.execute",
      "resource": {
        "type": "payment",
        "id": "PAY-1001"
      },
      "risk": "MEDIUM",
      "status": "PENDING"
    }
  ]
}
```

---

# 49. Get Approval Details

```text
GET /api/v1/approvals/{approvalId}
```

The approver should see enough information to make an informed decision.

Example:

```json
{
  "data": {
    "approvalId": "APR-1001",
    "requestId": "REQ-1003",
    "agent": {
      "agentKey": "AGT-001",
      "name": "PaymentAgent"
    },
    "action": "payment.execute",
    "arguments": {
      "amount": 5000,
      "currency": "USD",
      "beneficiaryId": "BEN-101"
    },
    "risk": {
      "level": "MEDIUM",
      "reasons": [
        "Payment amount exceeds automatic threshold"
      ]
    },
    "reason": "Human approval required by payment policy",
    "status": "PENDING",
    "expiresAt": "2026-07-27T11:00:00Z"
  }
}
```

Sensitive data should be masked where appropriate.

---

# 50. Approve Request

```text
POST /api/v1/approvals/{approvalId}/approve
```

Request:

```json
{
  "comment": "Verified payment request and beneficiary."
}
```

The approver identity comes from authentication.

Never accept:

```json
{
  "approvedBy": "ADMIN"
}
```

as trusted identity.

---

# 51. Approval Processing

Approval should trigger:

```text
Validate Approval
      ↓
Verify PENDING
      ↓
Verify Not Expired
      ↓
Verify Request Unchanged
      ↓
Record Human Decision
      ↓
Audit APPROVAL_APPROVED
      ↓
Rebuild Trusted Context
      ↓
Re-authorize Request
      ↓
Policy Evaluation
```

The system should not immediately execute merely because the human clicked Approve.

---

# 52. Re-Authorization After Approval

After approval:

```text
humanApproval = true
```

comes from the trusted Approval Service.

Then authorization runs again.

Possible result:

```text
ALLOW
```

But it could still become:

```text
DENY
```

if something important changed.

Example:

```text
Approval granted
       ↓
Account frozen
       ↓
Risk becomes HIGH
       ↓
Re-authorization
       ↓
DENY
```

This is safer than treating approval as an unconditional bypass.

---

# 53. Reject Approval

```text
POST /api/v1/approvals/{approvalId}/reject
```

Request:

```json
{
  "comment": "Beneficiary could not be verified."
}
```

Result:

```json
{
  "data": {
    "approvalId": "APR-1001",
    "status": "REJECTED",
    "requestStatus": "DENIED"
  }
}
```

---

# 54. Approval State Conflict

Suppose two users attempt to decide the same approval.

First:

```text
APPROVE
```

Second:

```text
REJECT
```

The second request should receive:

```text
409 Conflict
```

Example:

```json
{
  "error": {
    "code": "APPROVAL_ALREADY_DECIDED",
    "message": "This approval request has already been decided."
  }
}
```

---

# 55. Request Status API

An AI agent may need to check a pending request.

```text
GET /api/v1/actions/{requestId}
```

Response:

```json
{
  "data": {
    "requestId": "REQ-1003",
    "action": "payment.execute",
    "status": "PENDING_APPROVAL",
    "decision": "REQUIRE_APPROVAL"
  }
}
```

After approval and execution:

```json
{
  "data": {
    "requestId": "REQ-1003",
    "status": "SUCCEEDED",
    "decision": "ALLOW",
    "result": {
      "paymentId": "PAY-1001",
      "paymentStatus": "EXECUTED"
    }
  }
}
```

---

# 56. Asynchronous Action Model

Some actions cannot return immediately because they require human approval.

Therefore:

```text
POST /actions
```

may return:

```text
PENDING_APPROVAL
```

The caller can later:

```text
GET /actions/{requestId}
```

Alternatively, future integrations could use:

```text
Webhooks

Event Bus

Callbacks

Agent notifications
```

For the hackathon, polling is simpler.

---

# 57. Idempotency

Financial actions require protection against accidental duplicate requests.

Example:

```text
Agent sends payment.execute
```

Network timeout occurs.

Agent retries.

Without idempotency:

```text
Payment 1 executes

Payment 2 executes
```

This is unacceptable.

---

# 58. Idempotency Key

Runtime action requests should support:

```text
Idempotency-Key
```

Conceptually:

```text
Idempotency-Key: 1d09c...
```

The Gateway stores the key with the request.

If the same authenticated principal submits the same key again:

```text
Same Principal
+
Same Idempotency Key
        ↓
Return Existing Request
```

rather than execute twice.

---

# 59. Idempotency Scope

The key should normally be scoped to:

```text
Principal
+
Endpoint
+
Idempotency Key
```

This prevents unrelated agents from interfering with each other's keys.

---

# 60. Idempotency Payload Protection

If the same key is reused with different parameters:

First:

```json
{
  "amount": 500
}
```

Retry:

```json
{
  "amount": 5000
}
```

the API should reject it.

Example:

```text
409 Conflict
```

with:

```text
IDEMPOTENCY_KEY_REUSED
```

The stored request fingerprint can detect this.

---

# 61. Correlation IDs

Every request should have a correlation identifier.

Example:

```text
REQ-1001
```

This identifier should appear across:

```text
Gateway Logs

Risk Assessment

Authorization Decision

Approval Request

Tool Execution

Audit Events
```

Example:

```text
REQ-1001
│
├── RISK-1001
├── DEC-1001
├── APR-1001
├── DEC-1002
└── EXEC-1001
```

This makes end-to-end investigation possible.

---

# 62. Audit API

## Query Audit Events

```text
GET /api/v1/audit/events
```

Possible filters:

```text
agentKey

requestId

eventType

actorId

startTime

endTime
```

Example conceptually:

```text
GET /api/v1/audit/events?agentKey=AGT-001
```

---

# 63. Audit Response

```json
{
  "data": [
    {
      "eventId": "EVT-1001",
      "eventType": "ACTION_REQUESTED",
      "actorType": "AI_AGENT",
      "actorId": "AGT-001",
      "requestId": "REQ-1001",
      "timestamp": "2026-07-27T10:30:00Z"
    },
    {
      "eventId": "EVT-1002",
      "eventType": "AUTHORIZATION_DENIED",
      "actorType": "SYSTEM",
      "requestId": "REQ-1001",
      "timestamp": "2026-07-27T10:30:01Z"
    }
  ]
}
```

---

# 64. Request Audit Timeline

Useful endpoint:

```text
GET /api/v1/actions/{requestId}/timeline
```

Response:

```json
{
  "data": [
    {
      "event": "ACTION_REQUESTED",
      "timestamp": "2026-07-27T10:30:00Z"
    },
    {
      "event": "RISK_ASSESSED",
      "timestamp": "2026-07-27T10:30:01Z"
    },
    {
      "event": "APPROVAL_REQUIRED",
      "timestamp": "2026-07-27T10:30:01Z"
    },
    {
      "event": "APPROVAL_APPROVED",
      "timestamp": "2026-07-27T10:32:00Z"
    },
    {
      "event": "AUTHORIZATION_ALLOWED",
      "timestamp": "2026-07-27T10:32:01Z"
    },
    {
      "event": "TOOL_EXECUTION_SUCCEEDED",
      "timestamp": "2026-07-27T10:32:02Z"
    }
  ]
}
```

This would be particularly useful for the hackathon dashboard.

---

# 65. Explain Decision API

A useful governance feature:

```text
GET /api/v1/authorization/decisions/{decisionId}
```

Response:

```json
{
  "data": {
    "decisionId": "DEC-1001",
    "effect": "DENY",
    "reason": {
      "code": "HIGH_RISK_TRANSACTION",
      "message": "High-risk payment execution is prohibited."
    },
    "principal": {
      "id": "AGT-001"
    },
    "action": "payment.execute",
    "matchedPolicies": [
      {
        "policyKey": "POL-PAYMENT-RISK",
        "version": 2,
        "effect": "DENY"
      }
    ],
    "evaluatedAt": "2026-07-27T10:30:01Z"
  }
}
```

This directly supports explainability.

---

# 66. Protected Banking APIs

The banking demo may internally expose APIs such as:

```text
GET /internal/banking/accounts/{id}

GET /internal/banking/transactions/{id}

POST /internal/banking/payments

POST /internal/banking/payments/{id}/execute

POST /internal/banking/cards/{id}/block
```

These should not be publicly exposed to AI agents.

---

# 67. Protected Service Trust Boundary

The Banking Service should trust requests only from the Governance Gateway or another authorized internal workload.

Conceptually:

```text
AI Agent
   │
   X
   │
   ▼
Banking Service
```

Direct path blocked.

Allowed:

```text
AI Agent
   │
   ▼
Governance Gateway
   │
   ▼
Banking Service
```

This ensures policy cannot be bypassed.

---

# 68. Gateway-to-Service Authentication

Internal execution calls should authenticate the Gateway.

Possible production mechanisms:

```text
mTLS

Workload Identity

Signed Service Tokens

Cloud IAM

Service Mesh Identity
```

For the hackathon, a simpler internal authentication mechanism may be sufficient.

However, the architecture should preserve the trust boundary.

---

# 69. Do Not Forward Agent Credentials

The Gateway should generally not simply forward the agent's unrestricted credentials to the protected service.

Otherwise the agent might discover another path to use those credentials directly.

Prefer:

```text
Agent Credential
     ↓
Gateway Authentication

Gateway Credential
     ↓
Protected Service
```

with request metadata identifying the governed agent for audit purposes.

---

# 70. Tool Execution Adapter

The Gateway should use adapters for tools.

Conceptually:

```text
ToolExecutor
     │
     ├── HTTPToolAdapter
     │
     ├── MCPToolAdapter
     │
     └── InternalServiceAdapter
```

This prevents runtime authorization logic from being tightly coupled to one integration mechanism.

---

# 71. MCP Integration

An MCP-enabled tool may expose capabilities to an AI agent ecosystem.

The same governance principle still applies:

```text
Agent
   ↓
Governed MCP Layer
   ↓
Authorization
   ↓
MCP Tool
```

or:

```text
Agent
   ↓
Governance Gateway
   ↓
MCP Client Adapter
   ↓
MCP Server
```

MCP describes how tools can be discovered/invoked.

It does not replace enterprise authorization policy.

---

# 72. Tool Registry Mapping

A ToolAction can contain execution metadata.

Conceptually:

```json
{
  "actionKey": "payment.execute",
  "tool": "PaymentService",
  "execution": {
    "type": "HTTP_API",
    "operation": "executePayment"
  }
}
```

The exact internal endpoint should ideally remain server-side configuration rather than something the agent controls.

---

# 73. Input Validation

Before authorization, validate:

```text
Action exists

Required arguments exist

Types are valid

Values are within acceptable technical ranges

Resource identifier format is valid

Payload size is acceptable
```

Example:

```json
{
  "amount": -500
}
```

should fail validation before expensive policy evaluation.

---

# 74. Input Guardrails

Input guardrails may inspect:

```text
Prompt-derived arguments

Resource identifiers

Transaction amount

Malformed payloads

Injection-like content

Unexpected tool parameters
```

Flow:

```text
Agent Request
     ↓
Authentication
     ↓
Input Validation
     ↓
Input Guardrails
     ↓
Authorization Pipeline
```

---

# 75. Action Guardrails

Even after authorization, action-specific restrictions may apply.

Example:

```text
payment.execute
```

could have:

```text
Maximum technical transaction limit

Required currency

Required beneficiary identifier

Required customer session
```

Some restrictions belong to authorization policy.

Others belong to business validation.

The architecture should keep this distinction clear.

---

# 76. Output Guardrails

Protected service output may contain sensitive information.

Before returning it to the agent:

```text
Tool Response
     ↓
Output Guardrails
     ↓
Sensitive Data Filtering
     ↓
Agent
```

For example, an account lookup should not automatically expose:

```text
Full credentials

Internal security metadata

Unnecessary customer information
```

just because the agent has permission to perform `account.read`.

---

# 77. Rate Limiting

Runtime endpoints should support limits based on:

```text
Agent

Action

Tool

Risk class

Time window
```

Example:

```text
PaymentAgent

payment.execute

Maximum 20 attempts / minute
```

If exceeded:

```text
429 Too Many Requests
```

with:

```text
RATE_LIMIT_EXCEEDED
```

Rate limiting is a guardrail, not a replacement for authorization.

---

# 78. Timeout Handling

External/internal tool calls must have timeouts.

Example:

```text
Gateway
   ↓
Payment Service
   ↓
Timeout
```

The system should not assume:

```text
Timeout
=
Payment failed
```

For financial operations, execution state may be uncertain.

This is another reason idempotency is important.

---

# 79. Tool Execution State

A useful internal execution model:

```text
PENDING

STARTED

SUCCEEDED

FAILED

UNKNOWN
```

`UNKNOWN` is useful when the downstream operation may have completed but confirmation was lost.

A retry should use the same idempotency semantics rather than blindly execute again.

---

# 80. Fail-Closed Authorization

If authorization cannot determine whether an action is allowed:

```text
Policy Engine unavailable
```

or:

```text
Required trusted context unavailable
```

the system should generally:

```text
DENY / DO NOT EXECUTE
```

for sensitive operations.

Never:

```text
Policy engine unavailable
        ↓
ALLOW
```

This is the fail-closed principle.

---

# 81. Policy Engine Failure

Example response:

```json
{
  "error": {
    "code": "POLICY_ENGINE_UNAVAILABLE",
    "message": "Authorization could not be completed."
  },
  "meta": {
    "requestId": "REQ-1005"
  }
}
```

The payment must not execute.

---

# 82. Risk Service Failure

For actions where risk is required:

```text
Risk Service unavailable
        ↓
Risk unknown
        ↓
Authorization context incomplete
        ↓
Do not execute
```

Depending on policy, this may produce:

```text
DENY
```

or a system error.

It should not silently assume:

```text
risk = LOW
```

---

# 83. API Trust Boundaries

The architecture contains several trust boundaries:

```text
┌───────────────┐
│   AI AGENT    │
└───────┬───────┘
        │
        │ Untrusted Request Boundary
        ▼
┌───────────────────────┐
│ GOVERNANCE GATEWAY    │
└───────────┬───────────┘
            │
            │ Trusted Internal Boundary
            ▼
┌───────────────────────┐
│ AUTHORIZATION / RISK  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ PROTECTED SERVICES    │
└───────────────────────┘
```

Human governance APIs form another authenticated administrative boundary.

---

# 84. API Security Rules

The following rules should always hold:

```text
1. Never trust agent identity from request payload.

2. Never trust risk claims from the agent.

3. Never trust approval claims from the agent.

4. Never expose protected tools directly when governance is required.

5. Never treat REQUIRE_APPROVAL as ALLOW.

6. Re-authorize after human approval.

7. Never execute when authorization infrastructure fails.

8. Audit security-sensitive state changes.

9. Use idempotency for sensitive side-effecting operations.

10. Validate request/resource binding before execution.

11. Do not expose secrets in API responses.

12. Do not log credentials or tokens.
```

---

# 85. Complete Payment Example

Agent sends:

```text
POST /api/v1/actions
```

```json
{
  "action": "payment.execute",
  "resource": {
    "type": "payment",
    "id": "PAY-1001"
  },
  "arguments": {
    "amount": 5000,
    "currency": "USD",
    "beneficiaryId": "BEN-101"
  }
}
```

Authenticated identity resolves to:

```text
AGT-001
PaymentAgent
```

---

# 86. Gateway Processing

```text
AGT-001
   ↓
ACTIVE?
   ↓
YES

payment.execute
   ↓
Known Action?
   ↓
YES

Permission?
   ↓
YES

Within Boundary?
   ↓
YES

Risk Assessment
   ↓
MEDIUM

Trusted Context
   ↓
Build Authorization Request
```

---

# 87. Authorization Request

Internal:

```json
{
  "principal": {
    "type": "AI_AGENT",
    "id": "AGT-001"
  },
  "action": "payment.execute",
  "resource": {
    "type": "payment",
    "id": "PAY-1001"
  },
  "context": {
    "amount": 5000,
    "risk": "MEDIUM",
    "humanApproval": false
  }
}
```

Policy result:

```text
REQUIRE_APPROVAL
```

---

# 88. Agent Response

```json
{
  "data": {
    "requestId": "REQ-1001",
    "decision": "REQUIRE_APPROVAL",
    "status": "PENDING_APPROVAL",
    "approval": {
      "approvalId": "APR-1001",
      "status": "PENDING"
    }
  }
}
```

No payment execution occurs.

---

# 89. Human Approval

Approver calls:

```text
POST /api/v1/approvals/APR-1001/approve
```

The system records:

```text
Approved By:
USR-APPROVER-01

Approval:
APR-1001

Request:
REQ-1001
```

---

# 90. Re-Authorization

Trusted context becomes:

```json
{
  "amount": 5000,
  "risk": "MEDIUM",
  "humanApproval": true
}
```

Policy evaluation:

```text
ALLOW
```

New decision:

```text
DEC-1002
```

---

# 91. Execution

Only now:

```text
Governance Gateway
       ↓
PaymentService
       ↓
Execute PAY-1001
```

Execution result:

```text
SUCCEEDED
```

Audit:

```text
ACTION_REQUESTED

RISK_ASSESSED

APPROVAL_REQUIRED

APPROVAL_CREATED

APPROVAL_APPROVED

AUTHORIZATION_ALLOWED

TOOL_EXECUTION_STARTED

TOOL_EXECUTION_SUCCEEDED
```

---

# 92. Complete Runtime Sequence

```text
AI Agent
   │
   │ POST /actions
   ▼
Governance Gateway
   │
   ├── Authenticate
   │
   ├── Validate
   │
   ├── Permission Check
   │
   ├── Boundary Check
   │
   ▼
Risk Service
   │
   │ MEDIUM
   ▼
Governance Gateway
   │
   ▼
Authorization Service
   │
   ▼
Policy Engine
   │
   │ REQUIRE_APPROVAL
   ▼
Authorization Service
   │
   ▼
Governance Gateway
   │
   ├── Create Approval
   │
   └── Return Pending
   │
   ▼
Human Approver
   │
   │ APPROVE
   ▼
Approval Service
   │
   ▼
Authorization Service
   │
   ▼
Policy Engine
   │
   │ ALLOW
   ▼
Governance Gateway
   │
   ▼
Protected Payment Service
   │
   │ SUCCESS
   ▼
Governance Gateway
   │
   ▼
Audit
```

---

# 93. Recommended MVP Endpoints

For the hackathon, we do not need every possible endpoint immediately.

A strong MVP can implement:

```text
AGENTS

POST   /api/v1/agents
GET    /api/v1/agents
GET    /api/v1/agents/{agentKey}
POST   /api/v1/agents/{agentKey}/activate
POST   /api/v1/agents/{agentKey}/disable


TOOLS

POST   /api/v1/tools
GET    /api/v1/tools
POST   /api/v1/tools/{toolKey}/actions


PERMISSIONS

POST   /api/v1/agents/{agentKey}/permissions
GET    /api/v1/agents/{agentKey}/permissions
POST   /api/v1/agents/{agentKey}/permissions/{id}/revoke


POLICIES

POST   /api/v1/policies
GET    /api/v1/policies
POST   /api/v1/policies/{policyKey}/versions
POST   /api/v1/policies/{policyKey}/versions/{version}/activate


RUNTIME

POST   /api/v1/actions
GET    /api/v1/actions/{requestId}


APPROVAL

GET    /api/v1/approvals
GET    /api/v1/approvals/{approvalId}
POST   /api/v1/approvals/{approvalId}/approve
POST   /api/v1/approvals/{approvalId}/reject


AUDIT

GET    /api/v1/audit/events
GET    /api/v1/actions/{requestId}/timeline
```

Internal:

```text
POST /internal/v1/authorize

POST /internal/v1/risk/evaluate
```

These internal endpoints may instead be direct service calls if the MVP is implemented as a modular monolith.

---

# 94. Recommended MVP Architecture

Do not create unnecessary network boundaries merely because the logical architecture contains several components.

For a hackathon:

```text
                    BACKEND APPLICATION
┌───────────────────────────────────────────────────┐
│                                                   │
│ REST API                                          │
│                                                   │
│ Agent Module                                      │
│ Tool Module                                       │
│ Permission Module                                 │
│ Policy Module                                     │
│                                                   │
│ Governance Gateway                                │
│                                                   │
│ Authorization Module                             │
│ Risk Module                                       │
│ Approval Module                                   │
│ Audit Module                                      │
│                                                   │
│ Tool Execution Adapters                           │
│                                                   │
└───────────────────────┬───────────────────────────┘
                        │
                ┌───────┴────────┐
                ▼                ▼
          PostgreSQL        OPA / Cedar
                │
                ▼
          Banking Demo
```

These are **logical components**.

They do not need to become:

```text
10 microservices
```

during a hackathon.

---

# 95. API vs Internal Module Boundary

For the MVP:

```text
Gateway
   ↓
authorizationService.authorize(...)
```

may be better than:

```text
Gateway
   ↓
HTTP
   ↓
Authorization Microservice
```

Similarly:

```text
riskService.evaluate(...)
```

can be an internal function/module call.

The architecture remains separable later.

---

# 96. API Design Principle

The most important API distinction is:

```text
CONTROL PLANE
```

versus:

```text
RUNTIME PLANE
```

Control Plane:

```text
Create Agent

Grant Permission

Configure Policy

Disable Agent

Review Audit
```

Runtime Plane:

```text
Agent requests action

Evaluate risk

Authorize action

Request approval

Execute tool
```

Mixing these responsibilities creates security and maintainability problems.

---

# 97. Final API Architecture

```text
                         GOVERNANCE UI
                              │
                              ▼
                ┌──────────────────────────┐
                │      CONTROL PLANE       │
                │                          │
                │ /agents                  │
                │ /tools                   │
                │ /permissions             │
                │ /policies                │
                │ /approvals               │
                │ /audit                   │
                └────────────┬─────────────┘
                             │
                             ▼
                       GOVERNANCE DB


                          AI AGENT
                              │
                              │
                    POST /api/v1/actions
                              │
                              ▼
                ┌──────────────────────────┐
                │   GOVERNANCE GATEWAY     │
                │                          │
                │ Authentication           │
                │ Validation               │
                │ Guardrails               │
                │ Permission Check         │
                │ Context Building         │
                │ Risk Evaluation          │
                │ Authorization            │
                │ Approval Routing         │
                │ Tool Execution           │
                │ Output Filtering         │
                │ Audit                    │
                └────────────┬─────────────┘
                             │
                             ▼
                   AUTHORIZATION SERVICE
                             │
                             ▼
                    POLICY ENGINE ADAPTER
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                   OPA              CEDAR

                             │
                             ▼
                 ALLOW / DENY / APPROVAL

                             │
                    ┌────────┴────────┐
                    │                 │
                  ALLOW            APPROVAL
                    │                 │
                    ▼                 ▼
              TOOL EXECUTOR        HUMAN
                    │
                    ▼
              BANKING SERVICE
```

---

# 98. Core Takeaway

The runtime API should enforce one fundamental rule:

> **The AI agent requests authority; it does not possess the final authority to execute protected actions by itself.**

The agent says:

```text
"I want to execute payment PAY-1001."
```

The Gateway asks:

```text
Who is requesting it?

Is the agent active?

Does it have the capability?

Is the action within its boundary?

What is the current risk?

What policy applies?

Does a human need to approve?

Is the request still valid?

Can the action safely execute?
```

Only after these checks produce:

```text
ALLOW
```

does the Gateway invoke the protected tool.

Therefore the central API path is:

```text
Agent
   ↓
Request
   ↓
Governance Gateway
   ↓
Guardrails
   ↓
Risk
   ↓
Authorization Policy
   ↓
Decision
   ↓
Human Approval if required
   ↓
Re-Authorization
   ↓
Execution
   ↓
Audit
```

This makes the API layer the **enforcement boundary** between autonomous AI behavior and sensitive enterprise systems.
