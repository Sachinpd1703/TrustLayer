# Data Model

## 1. Overview

This document defines the logical data model for the **AI Agent Governance and Authorization Gateway**.

The data model must support four major areas:

```text
Governance
    ↓
Agents, Tools, Permissions, Policies

Runtime Authorization
    ↓
Requests, Decisions, Risk Context

Human Approval
    ↓
Approval Requests and Decisions

Accountability
    ↓
Audit Events and Change History
```

The core design goal is not merely to store configuration.

The database must allow the system to answer governance questions such as:

```text
Who created this agent?

Who owns this agent?

What can this agent access?

Who granted that permission?

Which policy authorized this action?

Which policy version was used?

Why was the request denied?

Who approved the transaction?

Was the action actually executed?

Who disabled the agent?

Who changed its permissions?
```

Therefore, the data model must support both:

```text
CURRENT STATE
```

and:

```text
HISTORICAL ACCOUNTABILITY
```

---

# 2. Core Domain Entities

The main entities are:

```text
User
Agent
Tool
ToolAction
AgentPermission
PermissionBoundary
Policy
PolicyVersion
AuthorizationRequest
AuthorizationDecision
RiskAssessment
ApprovalRequest
AuditEvent
```

For the banking demonstration:

```text
Customer
BankAccount
Transaction
Beneficiary
Payment
Card
```

---

# 3. High-Level Entity Relationship Model

```text
                         USER
                          │
                          │ owns
                          ▼
                        AGENT
                          │
                          │ receives
                          ▼
                  AGENT PERMISSION
                          │
                          ▼
                     TOOL ACTION
                          │
                          │ belongs to
                          ▼
                         TOOL


                        AGENT
                          │
                          │ initiates
                          ▼
               AUTHORIZATION REQUEST
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
            RISK       DECISION    APPROVAL
         ASSESSMENT                 REQUEST
                          │
                          ▼
                       POLICY
                          │
                          ▼
                   POLICY VERSION


              ALL IMPORTANT OPERATIONS
                          │
                          ▼
                     AUDIT EVENT
```

---

# 4. User

## Purpose

Represents a human governance user.

Examples:

```text
Administrator

Agent Owner

Security Reviewer

Human Approver

Auditor
```

This entity is different from an AI agent.

```text
User
=
Human Identity
```

```text
Agent
=
Governed Machine Identity
```

---

## Suggested Fields

| Field     | Type      | Description            |
| --------- | --------- | ---------------------- |
| id        | UUID      | Unique user identifier |
| email     | String    | Unique login identity  |
| name      | String    | Human-readable name    |
| role      | Enum      | Governance role        |
| status    | Enum      | User lifecycle state   |
| createdAt | Timestamp | Creation time          |
| updatedAt | Timestamp | Last update            |

---

## Role

Possible MVP values:

```text
ADMIN

AGENT_OWNER

APPROVER

AUDITOR
```

A production system would likely integrate with an external enterprise identity provider rather than manage all identities itself.

---

## Status

```text
ACTIVE

DISABLED
```

---

# 5. Agent

## Purpose

Represents an AI agent governed by the platform.

Example:

```text
AGT-001

PaymentAgent
```

---

## Suggested Fields

| Field       | Type      | Description                      |
| ----------- | --------- | -------------------------------- |
| id          | UUID      | Internal identifier              |
| agentKey    | String    | Stable external agent identifier |
| name        | String    | Agent name                       |
| description | Text      | Agent purpose                    |
| ownerId     | UUID      | Human owner                      |
| riskClass   | Enum      | Agent risk classification        |
| status      | Enum      | Lifecycle state                  |
| createdBy   | UUID      | User who registered agent        |
| createdAt   | Timestamp | Registration time                |
| updatedAt   | Timestamp | Last modification                |

---

## Example

```json
{
  "agentKey": "AGT-001",
  "name": "PaymentAgent",
  "description": "Processes governed payment operations",
  "riskClass": "HIGH",
  "status": "ACTIVE"
}
```

---

# 6. Agent Status

Recommended values:

```text
DRAFT

ACTIVE

SUSPENDED

DISABLED
```

Meaning:

```text
DRAFT
→ Registered but not permitted for runtime use

ACTIVE
→ May participate in authorization

SUSPENDED
→ Temporarily blocked

DISABLED
→ Administratively disabled
```

Only:

```text
ACTIVE
```

agents should normally make governed runtime requests.

---

# 7. Agent Risk Classification

Recommended:

```text
LOW

MEDIUM

HIGH

CRITICAL
```

This represents the inherent governance sensitivity of the agent.

For example:

```text
FAQAgent
→ LOW
```

```text
CustomerSupportAgent
→ MEDIUM
```

```text
PaymentAgent
→ HIGH
```

An agent capable of changing authorization configuration could potentially be:

```text
CRITICAL
```

---

# 8. Tool

## Purpose

Represents a protected system, service, API, MCP server, or capability provider.

Examples:

```text
AccountService

PaymentService

FraudService

CustomerDatabase

MCPBankingServer
```

---

## Suggested Fields

| Field       | Type      | Description            |
| ----------- | --------- | ---------------------- |
| id          | UUID      | Internal identifier    |
| toolKey     | String    | Stable tool identifier |
| name        | String    | Display name           |
| description | Text      | Tool description       |
| type        | Enum      | Integration type       |
| status      | Enum      | Tool lifecycle         |
| createdBy   | UUID      | Registrar              |
| createdAt   | Timestamp | Creation time          |
| updatedAt   | Timestamp | Last modification      |

---

## Tool Type

Possible values:

```text
HTTP_API

MCP

INTERNAL_SERVICE

DATABASE

SDK
```

---

## Tool Status

```text
ACTIVE

DISABLED
```

A disabled tool should not be executable even if an agent previously had permission.

---

# 9. Tool Action

## Purpose

A Tool may expose multiple governed actions.

Example:

```text
PaymentService
```

may expose:

```text
payment.read

payment.create

payment.execute

payment.cancel
```

These should not be represented as one generic permission.

---

## Suggested Fields

| Field       | Type      | Description          |
| ----------- | --------- | -------------------- |
| id          | UUID      | Internal identifier  |
| toolId      | UUID      | Parent tool          |
| actionKey   | String    | Authorization action |
| name        | String    | Display name         |
| description | Text      | Action description   |
| riskClass   | Enum      | Action sensitivity   |
| status      | Enum      | Lifecycle            |
| createdAt   | Timestamp | Creation time        |
| updatedAt   | Timestamp | Last update          |

---

## Example

```json
{
  "actionKey": "payment.execute",
  "name": "Execute Payment",
  "riskClass": "HIGH",
  "status": "ACTIVE"
}
```

---

# 10. Why Tool and ToolAction Are Separate

Consider:

```text
PaymentService

├── payment.read
├── payment.create
├── payment.execute
└── payment.cancel
```

The agent might be allowed to:

```text
payment.read
```

but not:

```text
payment.execute
```

Therefore:

```text
Tool Access
≠
Action Access
```

Permissions should normally target actions.

---

# 11. Agent Permission

## Purpose

Represents an explicit assignment of a capability to an agent.

Conceptually:

```text
Agent
  ↓
Permission
  ↓
ToolAction
```

---

## Suggested Fields

| Field        | Type       | Description              |
| ------------ | ---------- | ------------------------ |
| id           | UUID       | Permission assignment ID |
| agentId      | UUID       | Agent                    |
| toolActionId | UUID       | Granted action           |
| grantedBy    | UUID       | Human who granted it     |
| status       | Enum       | Assignment state         |
| grantedAt    | Timestamp  | Grant time               |
| revokedBy    | UUID?      | User who revoked it      |
| revokedAt    | Timestamp? | Revocation time          |
| reason       | Text?      | Governance justification |

---

## Example

```text
Agent:
PaymentAgent

Permission:
payment.execute

Granted By:
SecurityAdmin

Status:
ACTIVE
```

---

# 12. Permission Status

Recommended:

```text
ACTIVE

REVOKED
```

Instead of deleting permissions when revoked:

```text
DELETE permission
```

prefer:

```text
status = REVOKED

revokedAt = ...

revokedBy = ...
```

This preserves accountability.

---

# 13. Why Permission History Matters

Suppose:

```text
PaymentAgent
```

executed a payment yesterday.

Today:

```text
payment.execute
```

permission is revoked.

If the old record was deleted, an auditor may ask:

> How was this agent authorized yesterday?

Preserving the historical grant allows that question to be answered.

---

# 14. Permission Boundary

## Purpose

Defines the maximum capability set an agent may receive.

Example:

```text
PaymentAgent Boundary

account.read

transaction.read

payment.create

payment.execute
```

If someone grants:

```text
policy.modify
```

it remains ineffective because it falls outside the boundary.

---

## Suggested Model

```text
PermissionBoundary
```

| Field     | Type      |
| --------- | --------- |
| id        | UUID      |
| agentId   | UUID      |
| name      | String    |
| status    | Enum      |
| createdBy | UUID      |
| createdAt | Timestamp |
| updatedAt | Timestamp |

Then:

```text
PermissionBoundaryAction
```

| Field        | Type |
| ------------ | ---- |
| id           | UUID |
| boundaryId   | UUID |
| toolActionId | UUID |

---

# 15. Effective Permission

Effective permission is derived rather than stored as independent truth.

```text
Effective Permission
=
Active Assigned Permission
∩
Active Permission Boundary
```

This avoids inconsistent duplicated state.

---

# 16. Policy

## Purpose

Represents the stable identity and governance metadata of an authorization policy.

Example:

```text
POL-PAYMENT-001

Payment Execution Policy
```

The actual policy definition is versioned separately.

---

## Suggested Fields

| Field       | Type      | Description              |
| ----------- | --------- | ------------------------ |
| id          | UUID      | Internal ID              |
| policyKey   | String    | Stable policy identifier |
| name        | String    | Policy name              |
| description | Text      | Purpose                  |
| category    | Enum      | Policy category          |
| status      | Enum      | Lifecycle                |
| ownerId     | UUID      | Accountable owner        |
| createdBy   | UUID      | Creator                  |
| createdAt   | Timestamp | Creation time            |
| updatedAt   | Timestamp | Last metadata update     |

---

# 17. Policy Category

Possible values:

```text
IDENTITY

LIFECYCLE

PERMISSION

RESOURCE

RISK

BUSINESS

APPROVAL

SECURITY_OVERRIDE
```

These are primarily organizational classifications.

---

# 18. Policy Version

## Purpose

Stores immutable versions of policy definitions.

Relationship:

```text
Policy
 │
 ├── Version 1
 ├── Version 2
 └── Version 3
```

---

## Suggested Fields

| Field       | Type       | Description                |
| ----------- | ---------- | -------------------------- |
| id          | UUID       | Version ID                 |
| policyId    | UUID       | Parent policy              |
| version     | Integer    | Version number             |
| engine      | Enum       | Policy technology          |
| definition  | Text/JSON  | Policy definition          |
| checksum    | String     | Integrity/version identity |
| status      | Enum       | Version lifecycle          |
| createdBy   | UUID       | Author                     |
| createdAt   | Timestamp  | Creation time              |
| activatedBy | UUID?      | Activator                  |
| activatedAt | Timestamp? | Activation time            |

---

# 19. Policy Engine Type

Possible:

```text
OPA_REGO

CEDAR

INTERNAL
```

For the MVP, only the selected engine needs to be implemented.

The model keeps this explicit so architecture remains engine-independent.

---

# 20. Policy Version Status

Recommended:

```text
DRAFT

VALIDATED

ACTIVE

SUPERSEDED

INACTIVE
```

Normally only one active version of the same policy should participate in authorization unless policy composition explicitly requires otherwise.

---

# 21. Policy Definition

The actual policy may be stored as text.

For OPA:

```text
Rego policy source
```

For Cedar:

```text
Cedar policy source
```

For an internal prototype:

```json
{
  "action": "payment.execute",
  "condition": {
    "risk": "LOW"
  },
  "effect": "ALLOW"
}
```

The database should not attempt to model every possible policy condition as relational columns.

---

# 22. Why PolicyVersion Is Separate

Bad model:

```text
Policy

definition = "..."
```

and overwrite the definition whenever changed.

Better:

```text
Policy

├── Version 1
├── Version 2
└── Version 3
```

Then an authorization decision can record:

```text
Policy:
POL-PAYMENT-001

Version:
2
```

This enables historical reconstruction.

---

# 23. Authorization Request

## Purpose

Represents a governed runtime action proposed by an AI agent.

This is one of the central runtime entities.

---

## Suggested Fields

| Field           | Type       | Description                 |
| --------------- | ---------- | --------------------------- |
| id              | UUID       | Internal ID                 |
| requestKey      | String     | Correlation ID              |
| agentId         | UUID       | Requesting agent            |
| actionId        | UUID?      | Requested action            |
| resourceType    | String     | Resource category           |
| resourceId      | String?    | Resource identifier         |
| arguments       | JSON       | Requested tool parameters   |
| contextSnapshot | JSON       | Relevant normalized context |
| status          | Enum       | Request lifecycle           |
| createdAt       | Timestamp  | Request time                |
| completedAt     | Timestamp? | Completion time             |

---

## Example

```json
{
  "requestKey": "REQ-1001",
  "agentId": "AGT-001",
  "action": "payment.execute",
  "resourceType": "payment",
  "resourceId": "PAY-1001",
  "arguments": {
    "amount": 5000,
    "beneficiaryId": "BEN-101"
  }
}
```

---

# 24. Authorization Request Status

Recommended:

```text
RECEIVED

EVALUATING

PENDING_APPROVAL

AUTHORIZED

DENIED

EXECUTING

SUCCEEDED

FAILED
```

Example:

```text
RECEIVED
   ↓
EVALUATING
   ↓
PENDING_APPROVAL
   ↓
AUTHORIZED
   ↓
EXECUTING
   ↓
SUCCEEDED
```

Another:

```text
RECEIVED
   ↓
EVALUATING
   ↓
DENIED
```

---

# 25. Request Arguments

Arguments should be stored as structured JSON where useful.

Example:

```json
{
  "amount": 5000,
  "currency": "USD",
  "beneficiaryId": "BEN-101"
}
```

However, sensitive values should be carefully handled.

The system should avoid blindly storing:

```text
Passwords

Authentication Tokens

API Keys

Full Secrets

Sensitive Credentials
```

in request snapshots.

---

# 26. Context Snapshot

Authorization decisions may depend on dynamic context.

Example:

```json
{
  "agentStatus": "ACTIVE",
  "agentRiskClass": "HIGH",
  "actionRiskClass": "HIGH",
  "transactionRisk": "MEDIUM",
  "customerAuthenticated": true,
  "humanApproval": false
}
```

A snapshot helps reconstruct:

> Why did the policy make this decision at that moment?

---

# 27. Snapshot vs Live Data

Suppose today:

```text
risk = HIGH
```

but yesterday during authorization:

```text
risk = LOW
```

Historical audit should not simply query today's risk value.

Therefore important decision attributes should be captured as:

```text
DECISION-TIME SNAPSHOTS
```

when appropriate.

---

# 28. Risk Assessment

## Purpose

Stores the result of risk evaluation associated with a governed request.

---

## Suggested Fields

| Field      | Type      | Description                |
| ---------- | --------- | -------------------------- |
| id         | UUID      | Assessment ID              |
| requestId  | UUID      | Authorization request      |
| riskLevel  | Enum      | LOW/MEDIUM/HIGH            |
| score      | Decimal?  | Optional numeric score     |
| reason     | Text      | Human-readable explanation |
| factors    | JSON      | Risk factors               |
| assessedAt | Timestamp | Evaluation time            |

---

## Example

```json
{
  "riskLevel": "HIGH",
  "reason": "Large payment to new beneficiary",
  "factors": {
    "largeAmount": true,
    "newBeneficiary": true
  }
}
```

---

# 29. Risk Level

MVP:

```text
LOW

MEDIUM

HIGH
```

Future:

```text
CRITICAL
```

could be added if necessary.

---

# 30. Authorization Decision

## Purpose

Stores the result of an authorization evaluation.

One request may have multiple decisions.

This is important because:

```text
Initial Evaluation
      ↓
REQUIRE_APPROVAL
      ↓
Human Approval
      ↓
Re-Evaluation
      ↓
ALLOW
```

Therefore:

```text
AuthorizationRequest
       1
       │
       │
       N
AuthorizationDecision
```

---

# 31. Suggested Decision Fields

| Field            | Type      | Description             |
| ---------------- | --------- | ----------------------- |
| id               | UUID      | Internal ID             |
| decisionKey      | String    | External/correlation ID |
| requestId        | UUID      | Parent request          |
| effect           | Enum      | Decision                |
| reason           | Text      | Explanation             |
| evaluatedContext | JSON      | Decision-time context   |
| evaluatedAt      | Timestamp | Decision time           |

---

## Effect

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

---

# 32. Decision Policy References

A decision may involve multiple policies.

Therefore avoid storing only:

```text
authorizationDecision.policyId
```

Instead use:

```text
DecisionPolicyEvaluation
```

Relationship:

```text
AuthorizationDecision
        │
        │ N
        ▼
DecisionPolicyEvaluation
        │
        │ N
        ▼
PolicyVersion
```

---

# 33. Decision Policy Evaluation

Suggested fields:

| Field           | Type    |
| --------------- | ------- |
| id              | UUID    |
| decisionId      | UUID    |
| policyVersionId | UUID    |
| matched         | Boolean |
| effect          | Enum?   |
| reason          | Text?   |

This allows the system to answer:

```text
Which policies were evaluated?

Which policies matched?

What effect did each produce?

Which versions were used?
```

For the MVP, this table may be simplified if the selected policy engine only returns the final decision.

---

# 34. Approval Request

## Purpose

Represents a human approval requirement associated with a specific authorization request.

---

## Suggested Fields

| Field           | Type       | Description              |
| --------------- | ---------- | ------------------------ |
| id              | UUID       | Internal ID              |
| approvalKey     | String     | External identifier      |
| requestId       | UUID       | Governed request         |
| status          | Enum       | Approval state           |
| reason          | Text       | Why approval is required |
| contextSnapshot | JSON       | Context being approved   |
| requestedAt     | Timestamp  | Creation time            |
| expiresAt       | Timestamp? | Expiration               |
| decidedBy       | UUID?      | Human approver           |
| decidedAt       | Timestamp? | Decision time            |
| decisionComment | Text?      | Human explanation        |

---

# 35. Approval Status

```text
PENDING

APPROVED

REJECTED

EXPIRED

CANCELLED
```

---

# 36. Approval Relationship

```text
AuthorizationRequest
        │
        ▼
ApprovalRequest
        │
        ▼
Human Approver
```

The approval belongs to the request, not directly to the agent.

This prevents:

```text
Approve PaymentAgent
```

from accidentally becoming permanent authorization.

Instead:

```text
Approve REQ-1001
```

---

# 37. Approval Context Snapshot

Suppose approval is requested for:

```text
Agent:
AGT-001

Action:
payment.execute

Payment:
PAY-1001

Amount:
₹10,000

Beneficiary:
BEN-101
```

The approval should be tied to those relevant facts.

If the agent later changes:

```text
Amount:
₹50,000
```

the previous approval must not silently authorize the modified request.

---

# 38. Approval Integrity

One possible future mechanism is to calculate a fingerprint:

```text
hash(
    agent
    + action
    + resource
    + security-sensitive arguments
)
```

and bind approval to it.

Conceptually:

```text
Approved Request Fingerprint
        =
Current Request Fingerprint
```

must hold before approval is considered valid.

For the MVP, the request can simply be immutable after approval is requested.

That is much easier to implement safely.

---

# 39. Audit Event

## Purpose

Records governance and security-relevant events.

The Audit Event is one of the most important entities in the platform.

---

## Suggested Fields

| Field        | Type        | Description         |
| ------------ | ----------- | ------------------- |
| id           | UUID        | Event ID            |
| eventKey     | String      | External identifier |
| eventType    | String/Enum | Event category      |
| actorType    | Enum        | Who caused event    |
| actorId      | String      | Actor identifier    |
| requestId    | UUID?       | Runtime request     |
| agentId      | UUID?       | Related agent       |
| resourceType | String?     | Target type         |
| resourceId   | String?     | Target ID           |
| metadata     | JSON        | Additional details  |
| timestamp    | Timestamp   | Event time          |

---

# 40. Audit Actor Type

Possible values:

```text
USER

AI_AGENT

SYSTEM

SERVICE
```

Example:

```text
actorType:
USER

actorId:
USR-ADMIN-01

eventType:
PERMISSION_GRANTED
```

Another:

```text
actorType:
AI_AGENT

actorId:
AGT-001

eventType:
ACTION_REQUESTED
```

---

# 41. Audit Event Types

## Agent Governance

```text
AGENT_CREATED

AGENT_UPDATED

AGENT_ACTIVATED

AGENT_SUSPENDED

AGENT_DISABLED
```

---

## Tool Governance

```text
TOOL_REGISTERED

TOOL_UPDATED

TOOL_ENABLED

TOOL_DISABLED
```

---

## Permissions

```text
PERMISSION_GRANTED

PERMISSION_REVOKED

BOUNDARY_UPDATED
```

---

## Policy Governance

```text
POLICY_CREATED

POLICY_VERSION_CREATED

POLICY_VALIDATED

POLICY_ACTIVATED

POLICY_DEACTIVATED
```

---

## Runtime

```text
ACTION_REQUESTED

RISK_ASSESSED

AUTHORIZATION_ALLOWED

AUTHORIZATION_DENIED

APPROVAL_REQUIRED
```

---

## Approval

```text
APPROVAL_CREATED

APPROVAL_APPROVED

APPROVAL_REJECTED

APPROVAL_EXPIRED
```

---

## Execution

```text
TOOL_EXECUTION_STARTED

TOOL_EXECUTION_SUCCEEDED

TOOL_EXECUTION_FAILED
```

---

# 42. Audit Metadata

Different event types need different details.

Instead of creating dozens of nullable columns, use:

```text
metadata JSON
```

Example:

```json
{
  "permission": "payment.execute",
  "grantedBy": "USR-001",
  "reason": "Required by PaymentAgent workflow"
}
```

Another:

```json
{
  "decision": "DENY",
  "risk": "HIGH",
  "reason": "High-risk transaction"
}
```

---

# 43. Audit Immutability

Audit records should conceptually be:

```text
APPEND ONLY
```

Normal application operations should not:

```text
UPDATE audit_event

DELETE audit_event
```

Production environments could additionally use:

```text
Immutable storage

SIEM integration

Event streaming

Cryptographic integrity

Retention policies
```

For the hackathon, database-level discipline is sufficient.

---

# 44. Request Correlation

All runtime entities should connect through the authorization request.

Example:

```text
REQ-1001
│
├── RiskAssessment
│
├── Decision DEC-1001
│
├── Approval APR-1001
│
├── Decision DEC-1002
│
└── AuditEvents
```

This makes the request the primary runtime correlation object.

---

# 45. Banking Demo Data Model

The governance system should remain separate from the demo banking domain.

Banking entities include:

```text
Customer

BankAccount

Transaction

Beneficiary

Payment

Card
```

These exist to demonstrate protected enterprise actions.

---

# 46. Customer

Suggested fields:

| Field       | Type      |
| ----------- | --------- |
| id          | UUID      |
| customerKey | String    |
| name        | String    |
| status      | Enum      |
| createdAt   | Timestamp |

For demonstration purposes, avoid unnecessary real personal information.

Use synthetic customer data.

---

# 47. Bank Account

Suggested fields:

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| accountKey | String    |
| customerId | UUID      |
| type       | Enum      |
| currency   | String    |
| balance    | Decimal   |
| status     | Enum      |
| createdAt  | Timestamp |

---

## Account Status

```text
ACTIVE

FROZEN

CLOSED
```

A frozen account can demonstrate the difference between:

```text
Authorization
```

and:

```text
Business Validation
```

For example:

```text
Authorization:
ALLOW

Account:
FROZEN

Business Result:
PAYMENT_REJECTED
```

---

# 48. Transaction

Suggested fields:

| Field          | Type      |
| -------------- | --------- |
| id             | UUID      |
| transactionKey | String    |
| accountId      | UUID      |
| type           | Enum      |
| amount         | Decimal   |
| currency       | String    |
| description    | String    |
| createdAt      | Timestamp |

Transaction types:

```text
CREDIT

DEBIT
```

---

# 49. Beneficiary

Suggested fields:

| Field            | Type      |
| ---------------- | --------- |
| id               | UUID      |
| beneficiaryKey   | String    |
| customerId       | UUID      |
| name             | String    |
| accountReference | String    |
| status           | Enum      |
| createdAt        | Timestamp |

Possible status:

```text
NEW

VERIFIED

BLOCKED
```

This is useful for risk demonstrations.

Example:

```text
Large Amount
+
NEW Beneficiary
        ↓
HIGH Risk
```

---

# 50. Payment

## Purpose

Represents the primary protected business operation for the demo.

Suggested fields:

| Field                  | Type       |
| ---------------------- | ---------- |
| id                     | UUID       |
| paymentKey             | String     |
| accountId              | UUID       |
| beneficiaryId          | UUID       |
| amount                 | Decimal    |
| currency               | String     |
| status                 | Enum       |
| initiatedByAgentId     | UUID?      |
| authorizationRequestId | UUID?      |
| createdAt              | Timestamp  |
| executedAt             | Timestamp? |

---

# 51. Payment Status

```text
CREATED

PENDING_AUTHORIZATION

PENDING_APPROVAL

AUTHORIZED

EXECUTED

REJECTED

FAILED
```

---

# 52. Linking Payment and Governance

A payment should be traceable to its governance request.

```text
Payment
   │
   ▼
AuthorizationRequest
   │
   ├── RiskAssessment
   ├── AuthorizationDecision
   ├── ApprovalRequest
   └── AuditEvents
```

This allows us to answer:

> Why was this payment executed?

or:

> Why was this payment blocked?

---

# 53. Card

Optional demo entity:

| Field     | Type      |
| --------- | --------- |
| id        | UUID      |
| cardKey   | String    |
| accountId | UUID      |
| status    | Enum      |
| createdAt | Timestamp |
| updatedAt | Timestamp |

Status:

```text
ACTIVE

BLOCKED

EXPIRED
```

Protected action:

```text
card.block
```

---

# 54. Complete Logical ER Diagram

```text
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ owns
       ▼
┌─────────────┐
│    AGENT    │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│ AGENT_PERMISSION │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   TOOL_ACTION    │
└────────┬─────────┘
         │
         ▼
┌─────────────┐
│    TOOL     │
└─────────────┘


AGENT
  │
  │
  ▼
┌────────────────────────┐
│ AUTHORIZATION_REQUEST  │
└───────────┬────────────┘
            │
      ┌─────┼─────────────┐
      │     │             │
      ▼     ▼             ▼
    RISK  DECISION     APPROVAL
      │     │             │
      │     ▼             ▼
      │  DECISION      USER
      │   POLICY
      │ EVALUATION
      │     │
      │     ▼
      │ POLICY_VERSION
      │     │
      │     ▼
      │   POLICY
      │
      └───────────────────────────┐
                                  │
                                  ▼
                             AUDIT EVENT
```

---

# 55. Governance ER Relationships

## User → Agent

```text
User
1
│
│ owns
│
N
Agent
```

A user may own multiple agents.

Each agent should have an accountable owner.

---

## Tool → ToolAction

```text
Tool
1
│
│ exposes
│
N
ToolAction
```

---

## Agent ↔ ToolAction

Many-to-many through:

```text
AgentPermission
```

Relationship:

```text
Agent
 N
 │
 │
AgentPermission
 │
 N
ToolAction
```

---

## Agent → AuthorizationRequest

```text
Agent
1
│
│ initiates
│
N
AuthorizationRequest
```

---

## AuthorizationRequest → AuthorizationDecision

```text
AuthorizationRequest
1
│
│
N
AuthorizationDecision
```

because approval may cause re-authorization.

---

## AuthorizationRequest → RiskAssessment

Usually:

```text
AuthorizationRequest
1
│
│
N
RiskAssessment
```

Using `1:N` leaves room for reassessment if context changes.

For the MVP, normally only one assessment is required.

---

## AuthorizationRequest → ApprovalRequest

Usually:

```text
AuthorizationRequest
1
│
│
0..N
ApprovalRequest
```

Using `0..N` supports retries or future multi-stage approvals.

For the MVP, enforce at most one active pending approval at a time.

---

# 56. Recommended Identifier Strategy

Use internal UUIDs:

```text
id = UUID
```

for database relationships.

Use readable external identifiers:

```text
agentKey = AGT-001

requestKey = REQ-1001

decisionKey = DEC-1001

approvalKey = APR-1001

policyKey = POL-PAYMENT-001
```

for:

```text
UI

Logs

API responses

Demo

Audit investigation
```

Do not use display names as database identifiers.

---

# 57. Why Separate ID and Key?

Bad:

```text
id = "PaymentAgent"
```

If the name changes:

```text
PaymentAgent
→ PaymentExecutionAgent
```

identity becomes problematic.

Better:

```text
id:
UUID

agentKey:
AGT-001

name:
PaymentExecutionAgent
```

Identity remains stable.

---

# 58. Timestamp Strategy

Important entities should use:

```text
createdAt

updatedAt
```

Lifecycle-specific timestamps should be explicit.

Examples:

```text
grantedAt

revokedAt

activatedAt

requestedAt

decidedAt

executedAt

assessedAt
```

This improves auditability.

---

# 59. Soft Delete Strategy

Governance entities should generally not be physically deleted.

Instead:

```text
Agent
→ DISABLED

Tool
→ DISABLED

Permission
→ REVOKED

Policy
→ INACTIVE
```

This preserves historical relationships.

---

# 60. Why Hard Deletes Are Dangerous

Suppose:

```text
AGT-001
```

performed 500 historical actions.

If the agent row is deleted:

```text
DELETE FROM agents
```

historical references become difficult or impossible to interpret.

Therefore governance entities should favor lifecycle states over destructive deletion.

---

# 61. Database Constraints

Important constraints should exist at the database level where possible.

Examples:

```text
agent.agentKey
UNIQUE
```

```text
tool.toolKey
UNIQUE
```

```text
toolAction.actionKey
UNIQUE
```

or unique within a defined namespace.

```text
policy.policyKey
UNIQUE
```

```text
authorizationRequest.requestKey
UNIQUE
```

```text
authorizationDecision.decisionKey
UNIQUE
```

```text
approvalRequest.approvalKey
UNIQUE
```

---

# 62. Permission Uniqueness

Avoid duplicate active permissions such as:

```text
AGT-001
+
payment.execute
```

being granted repeatedly.

Logical constraint:

```text
One active assignment
per
Agent + ToolAction
```

Historical revoked assignments may still exist.

---

# 63. Policy Version Uniqueness

Constraint:

```text
Policy ID
+
Version Number
=
UNIQUE
```

Example:

```text
POL-PAYMENT-001
Version 3
```

must exist only once.

---

# 64. Referential Integrity

Examples:

```text
AgentPermission.agentId
→ Agent.id
```

```text
AgentPermission.toolActionId
→ ToolAction.id
```

```text
ToolAction.toolId
→ Tool.id
```

```text
AuthorizationRequest.agentId
→ Agent.id
```

```text
AuthorizationDecision.requestId
→ AuthorizationRequest.id
```

```text
ApprovalRequest.requestId
→ AuthorizationRequest.id
```

```text
PolicyVersion.policyId
→ Policy.id
```

Foreign-key integrity should be enforced wherever practical.

---

# 65. JSON vs Relational Columns

Use relational columns for data frequently:

```text
Filtered

Joined

Indexed

Constrained

Used for authorization relationships
```

Examples:

```text
agentId

actionId

status

riskLevel

effect

createdAt
```

Use JSON for flexible snapshots or metadata.

Examples:

```text
arguments

contextSnapshot

riskFactors

auditMetadata
```

---

# 66. What Not to Put Only in JSON

Avoid:

```json
{
  "agentId": "...",
  "permission": "...",
  "status": "..."
}
```

as the only representation of core authorization relationships.

Core relationships should be relational.

Otherwise:

```text
Foreign Keys

Constraints

Efficient Queries

Integrity
```

become much harder.

---

# 67. Sensitive Data Handling

The governance database should not become a secret dump.

Do not store raw:

```text
API Keys

Database Passwords

OAuth Tokens

Session Tokens

Private Keys
```

inside normal entity fields or audit metadata.

Store secret references where needed.

Example:

```text
credentialReference:
secret/payment-service
```

The actual credential belongs in a secure secret-management system.

---

# 68. Sensitive Audit Data

Audit logging should avoid recording unnecessary:

```text
Full account numbers

Authentication credentials

Access tokens

Passwords

Sensitive prompts

Private customer data
```

Prefer:

```text
Resource ID

Masked values

Hashes

Minimal security-relevant metadata
```

The principle is:

> **Audit enough to establish accountability without creating a second uncontrolled copy of sensitive data.**

---

# 69. Data Classification

Useful conceptual classifications:

```text
PUBLIC

INTERNAL

CONFIDENTIAL

RESTRICTED
```

Examples:

```text
Agent Name
→ INTERNAL

Authorization Decision
→ CONFIDENTIAL

Customer Banking Data
→ RESTRICTED

API Secret
→ RESTRICTED
```

The MVP does not need a full data-classification engine, but the architecture should recognize these differences.

---

# 70. Runtime Data Retention

Not all runtime data must live forever.

Conceptually:

```text
Authorization Requests
→ Retained according to audit requirements

Authorization Decisions
→ Longer retention

Audit Events
→ Long-term governance record

Temporary execution payloads
→ Short retention

Secrets
→ Never copied into runtime history
```

Exact retention periods are deployment and compliance decisions.

---

# 71. Indexing Strategy

Likely useful indexes:

```text
Agent.agentKey

Agent.status

Tool.toolKey

ToolAction.actionKey

AgentPermission.agentId

AgentPermission.toolActionId

Policy.policyKey

PolicyVersion.policyId

AuthorizationRequest.requestKey

AuthorizationRequest.agentId

AuthorizationRequest.createdAt

AuthorizationDecision.requestId

ApprovalRequest.requestId

ApprovalRequest.status

AuditEvent.requestId

AuditEvent.agentId

AuditEvent.eventType

AuditEvent.timestamp
```

---

# 72. Audit Query Examples

The model should efficiently answer:

```text
Show all actions attempted by AGT-001.
```

```text
Show all denied requests today.
```

```text
Show all actions requiring approval.
```

```text
Show who granted payment.execute to AGT-001.
```

```text
Show which policy authorized REQ-1001.
```

```text
Show all changes to POL-PAYMENT-001.
```

```text
Show all actions approved by USR-001.
```

These queries directly support the governance story.

---

# 73. Example Runtime Data

Suppose:

```text
PaymentAgent

requests

payment.execute

₹10,000

MEDIUM risk
```

The data may look like:

```text
AuthorizationRequest

requestKey:
REQ-1001

agent:
AGT-001

action:
payment.execute

status:
PENDING_APPROVAL
```

Risk:

```text
RiskAssessment

request:
REQ-1001

risk:
MEDIUM
```

Decision:

```text
AuthorizationDecision

decisionKey:
DEC-1001

request:
REQ-1001

effect:
REQUIRE_APPROVAL
```

Approval:

```text
ApprovalRequest

approvalKey:
APR-1001

request:
REQ-1001

status:
PENDING
```

---

# 74. After Human Approval

Approval becomes:

```text
APR-1001

status:
APPROVED

decidedBy:
USR-APPROVER-01
```

A second decision is created:

```text
DEC-1002

request:
REQ-1001

effect:
ALLOW
```

Do not overwrite:

```text
DEC-1001
```

The decision history should remain:

```text
REQ-1001
│
├── DEC-1001
│      REQUIRE_APPROVAL
│
├── APR-1001
│      APPROVED
│
└── DEC-1002
       ALLOW
```

This provides a complete authorization timeline.

---

# 75. After Tool Execution

The request becomes:

```text
status:
SUCCEEDED
```

and audit events show:

```text
REQ-1001

ACTION_REQUESTED
        ↓
RISK_ASSESSED
        ↓
APPROVAL_REQUIRED
        ↓
APPROVAL_CREATED
        ↓
APPROVAL_APPROVED
        ↓
AUTHORIZATION_ALLOWED
        ↓
TOOL_EXECUTION_STARTED
        ↓
TOOL_EXECUTION_SUCCEEDED
```

---

# 76. Example Denied Request

SupportAgent requests:

```text
payment.execute
```

AuthorizationRequest:

```text
REQ-2001
```

Permission lookup:

```text
payment.execute
not assigned
```

Decision:

```text
DEC-2001

effect:
DENY

reason:
MISSING_PERMISSION
```

Audit:

```text
ACTION_REQUESTED

AUTHORIZATION_DENIED
```

No:

```text
Payment

ApprovalRequest

ToolExecution
```

needs to occur.

---

# 77. Example Disabled Agent

```text
Agent:

AGT-001

status:
DISABLED
```

Request:

```text
REQ-3001
```

Decision:

```text
DENY
```

Reason:

```text
AGENT_DISABLED
```

No policy-engine evaluation may even be necessary.

The audit trail still records the attempt.

---

# 78. Data Ownership

Logical ownership:

```text
Agent Registry
→ Agent
```

```text
Tool Registry
→ Tool
→ ToolAction
```

```text
Permission Manager
→ AgentPermission
→ PermissionBoundary
```

```text
Policy Manager
→ Policy
→ PolicyVersion
```

```text
Risk Service
→ RiskAssessment
```

```text
Authorization Service
→ AuthorizationDecision
```

```text
Approval Service
→ ApprovalRequest
```

```text
Audit Service
→ AuditEvent
```

```text
Demo Banking Services
→ Customer
→ BankAccount
→ Transaction
→ Beneficiary
→ Payment
→ Card
```

---

# 79. Governance Data vs Banking Data

Even if the hackathon uses one physical database, keep these logically separated.

```text
DATABASE
│
├── Governance Domain
│   ├── users
│   ├── agents
│   ├── tools
│   ├── tool_actions
│   ├── permissions
│   ├── policies
│   ├── policy_versions
│   ├── authorization_requests
│   ├── authorization_decisions
│   ├── approvals
│   └── audit_events
│
└── Banking Demo Domain
    ├── customers
    ├── bank_accounts
    ├── transactions
    ├── beneficiaries
    ├── payments
    └── cards
```

This reinforces the architectural boundary between:

```text
Governance Platform
```

and:

```text
Protected Enterprise System
```

---

# 80. Recommended MVP Tables

For the hackathon, the core database can begin with:

```text
users

agents

tools

tool_actions

agent_permissions

permission_boundaries

permission_boundary_actions

policies

policy_versions

authorization_requests

risk_assessments

authorization_decisions

approval_requests

audit_events
```

Banking demo:

```text
customers

bank_accounts

beneficiaries

payments

transactions

cards
```

---

# 81. Optional Table

If detailed policy evaluation traceability is implemented:

```text
decision_policy_evaluations
```

Otherwise, the MVP can store relevant policy references inside the decision metadata.

---

# 82. MVP Simplification

Do not over-model the database.

For example, avoid immediately creating separate tables for:

```text
Risk Factor

Context Attribute

Audit Metadata Property

Policy Condition

Policy Expression

Request Argument
```

JSON is sufficient for these flexible structures.

Use relational tables where relationships and integrity matter.

---

# 83. Suggested MVP Database

A relational database is a natural fit because the system contains strong relationships among:

```text
Agents

Permissions

Tools

Policies

Approvals

Decisions

Users
```

A suitable implementation would be:

```text
PostgreSQL
```

with whichever ORM matches the selected backend stack.

Reasons:

```text
Strong relational integrity

Transactions

JSON support

Indexes

Mature ecosystem

Good audit/query capabilities
```

---

# 84. Transaction Boundaries

Some operations should occur atomically.

Example permission grant:

```text
Create Permission
        +
Create Audit Event
```

should ideally behave as one logical transaction.

Likewise:

```text
Approve Request
        +
Record Approver
        +
Create Audit Event
```

should not partially succeed.

---

# 85. Concurrency Protection

Approval is especially sensitive to race conditions.

Suppose two administrators simultaneously attempt:

```text
APPROVE
```

and:

```text
REJECT
```

The system should prevent contradictory final states.

Possible mechanisms:

```text
Database transaction

Row locking

Optimistic versioning

Conditional status update
```

Example:

```text
UPDATE approval
SET status = APPROVED
WHERE id = ?
AND status = PENDING
```

Only a pending approval may transition.

---

# 86. State Transition Integrity

Important entities should enforce valid transitions.

For Approval:

```text
PENDING
├──→ APPROVED
├──→ REJECTED
├──→ EXPIRED
└──→ CANCELLED
```

But:

```text
APPROVED
→ PENDING
```

should normally be invalid.

Similarly:

```text
REVOKED Permission
→ ACTIVE
```

should generally be represented by creating a new grant rather than rewriting historical revocation.

---

# 87. Data Model Security Principle

The database should preserve one central rule:

> **Historical security decisions should be appended or versioned rather than rewritten.**

Examples:

```text
New policy version
instead of
overwriting old policy
```

```text
New authorization decision
instead of
overwriting previous decision
```

```text
Revoke permission
instead of
deleting permission history
```

```text
Disable agent
instead of
deleting agent
```

This is essential for governance.

---

# 88. Core Data Flow

```text
AI AGENT
   │
   ▼
AUTHORIZATION REQUEST
   │
   ├──────────────→ AGENT
   │
   ├──────────────→ TOOL ACTION
   │
   ├──────────────→ PERMISSION
   │
   ▼
RISK ASSESSMENT
   │
   ▼
AUTHORIZATION DECISION
   │
   ├──────── DENY ──────────────→ AUDIT
   │
   ├──────── ALLOW ─────────────→ EXECUTION
   │
   └── REQUIRE_APPROVAL
                │
                ▼
         APPROVAL REQUEST
                │
                ▼
              USER
                │
                ▼
          APPROVED
                │
                ▼
       NEW AUTHORIZATION
            DECISION
                │
                ▼
              ALLOW
                │
                ▼
             EXECUTE
                │
                ▼
              AUDIT
```

---

# 89. Final Entity Model

```text
┌───────────────────────────────────────────────────────────────┐
│                    GOVERNANCE DOMAIN                          │
│                                                               │
│ USER ──────────────── AGENT                                   │
│                         │                                     │
│                         ▼                                     │
│                 AGENT_PERMISSION                              │
│                         │                                     │
│                         ▼                                     │
│                    TOOL_ACTION                                │
│                         │                                     │
│                         ▼                                     │
│                       TOOL                                    │
│                                                               │
│ AGENT ───────── AUTHORIZATION_REQUEST                         │
│                         │                                     │
│              ┌──────────┼────────────┐                        │
│              │          │            │                        │
│              ▼          ▼            ▼                        │
│            RISK      DECISION     APPROVAL                    │
│                         │            │                        │
│                         ▼            ▼                        │
│                  POLICY VERSION    USER                       │
│                         │                                     │
│                         ▼                                     │
│                       POLICY                                  │
│                                                               │
│                         │                                     │
│                         ▼                                     │
│                    AUDIT EVENTS                               │
└───────────────────────────────────────────────────────────────┘

                            │
                            │ governed access
                            ▼

┌───────────────────────────────────────────────────────────────┐
│                    BANKING DEMO DOMAIN                        │
│                                                               │
│ CUSTOMER                                                      │
│    │                                                          │
│    ├──────── BANK ACCOUNT                                     │
│    │              │                                           │
│    │              ├──── TRANSACTION                           │
│    │              │                                           │
│    │              ├──── PAYMENT                               │
│    │              │                                           │
│    │              └──── CARD                                  │
│    │                                                          │
│    └──────── BENEFICIARY                                      │
│                   │                                           │
│                   └──────── PAYMENT                           │
└───────────────────────────────────────────────────────────────┘
```

---

# 90. Key Design Decisions

The data model follows these principles:

```text
1. AI agents are first-class governed identities.

2. Tools and actions are modeled separately.

3. Permissions are explicit and auditable.

4. Permission boundaries limit maximum authority.

5. Policies are versioned rather than overwritten.

6. Authorization requests are persistent correlation objects.

7. A request may have multiple authorization decisions.

8. Human approvals belong to specific requests.

9. Risk assessments are separate from authorization decisions.

10. Decision-time context can be preserved as snapshots.

11. Audit events are append-only in principle.

12. Governance entities use lifecycle states instead of destructive deletion.

13. Core relationships are relational.

14. Flexible context and metadata use JSON.

15. Governance data and protected banking data remain logically separated.

16. Secrets are not stored in normal governance or audit records.
```

---

# 91. Core Takeaway

The data model is designed around one idea:

```text
CONFIGURATION
+
RUNTIME DECISIONS
+
HISTORY
+
ACCOUNTABILITY
```

It should not only tell us:

```text
PaymentAgent currently has
payment.execute.
```

It should allow us to reconstruct:

```text
Who created PaymentAgent?

Who granted payment.execute?

What boundary applied?

Which action did it request?

What was the risk?

Which policies were evaluated?

Which policy version was active?

What decision was returned?

Was human approval required?

Who approved it?

Was authorization evaluated again?

Was the tool actually executed?

What was the final outcome?
```

That traceability is what turns the database from a simple permission store into a **governance data model**.
