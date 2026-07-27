# 05 — ER Diagram

## Purpose

The ER diagram represents the persistent data model of the **AI Agent Governance Platform**.

It should answer:

> What governance data do we store, and how are agents, permissions, policies, authorization requests, approvals, executions, and audit records connected?

The model should support the complete lifecycle:

```text
Agent
  ↓
Permission Assignment
  ↓
Action Request
  ↓
Authorization Decision
  ↓
Approval (optional)
  ↓
Execution
  ↓
Audit
```

---

# 1. Main Entity Groups

Organize the ER diagram into five logical areas.

```text
IDENTITY & AGENTS

User
Agent


AUTHORIZATION

Permission
AgentPermission
PermissionBoundary
BoundaryPermission


POLICY & TOOLS

Policy
Tool


RUNTIME

ActionRequest
AuthorizationDecision
ApprovalRequest
Execution


AUDIT

AuditEvent
```

This grouping will make a relatively large ER diagram much easier to understand.

---

# 2. USER

Represents human users of the governance platform.

Examples:

```text
Security Administrator
Human Approver
Auditor
```

Entity:

```text
USER
────────────────────────
PK  id

    name
    email
    role
    status

    created_at
    updated_at
```

Possible roles:

```text
ADMIN
APPROVER
AUDITOR
```

Possible status:

```text
ACTIVE
DISABLED
```

Do not store passwords directly.

If authentication is handled externally, store only the external identity reference when required.

---

# 3. AGENT

This is one of the central entities.

```text
AGENT
────────────────────────
PK  id

    name
    description
    purpose

    status

FK  created_by → USER.id

    created_at
    updated_at
    disabled_at
```

Possible status:

```text
ACTIVE
DISABLED
```

Example:

```text
id:
AGT-001

name:
Customer Support Agent

purpose:
Help support staff retrieve customer
account and transaction information.

status:
ACTIVE
```

The `status` field provides the governance kill switch.

---

# 4. USER → AGENT

Relationship:

```text
USER
  │
  │ creates/manages
  ▼
AGENT
```

Cardinality:

```text
USER 1 ─────────< N AGENT
```

One administrator may create multiple agents.

Each agent has one recorded creator.

---

# 5. PERMISSION

Represents a reusable capability.

```text
PERMISSION
────────────────────────
PK  id

    name
    description

    resource_type
    action

    created_at
```

Examples:

```text
account.read

transaction.read

payment.execute

customer.read
```

A useful authorization model is:

```text
Resource + Action
```

Example:

```text
resource_type:
payment

action:
execute
```

Canonical permission:

```text
payment.execute
```

---

# 6. AGENT_PERMISSION

Agents and permissions have a many-to-many relationship.

Therefore use a junction table:

```text
AGENT_PERMISSION
────────────────────────
PK  id

FK  agent_id
    → AGENT.id

FK  permission_id
    → PERMISSION.id

FK  granted_by
    → USER.id

    granted_at
    expires_at
```

Relationship:

```text
AGENT
   │
   │
   ▼
AGENT_PERMISSION
   ▲
   │
   │
PERMISSION
```

Cardinality:

```text
AGENT      1 ─────< N AGENT_PERMISSION

PERMISSION 1 ─────< N AGENT_PERMISSION
```

Together this creates:

```text
AGENT N ───────── N PERMISSION
```

---

# 7. PERMISSION BOUNDARY

Permissions define what an agent is assigned.

A permission boundary defines the **maximum authority the agent can exercise**.

Entity:

```text
PERMISSION_BOUNDARY
────────────────────────
PK  id

    name
    description

    status

FK  created_by
    → USER.id

    created_at
    updated_at
```

Example:

```text
Support Agent Boundary

Allowed maximum:

account.read
transaction.read
customer.read
```

---

# 8. BOUNDARY_PERMISSION

A boundary can contain multiple permissions.

```text
BOUNDARY_PERMISSION
────────────────────────
PK  id

FK  boundary_id
    → PERMISSION_BOUNDARY.id

FK  permission_id
    → PERMISSION.id
```

Relationships:

```text
PERMISSION_BOUNDARY
       │
       ▼
BOUNDARY_PERMISSION
       ▲
       │
PERMISSION
```

---

# 9. AGENT → PERMISSION BOUNDARY

For the MVP, an agent can have one active permission boundary.

Add to `AGENT`:

```text
FK permission_boundary_id
   → PERMISSION_BOUNDARY.id
```

Relationship:

```text
PERMISSION_BOUNDARY 1 ─────< N AGENT
```

Multiple agents may share a boundary.

---

# 10. Effective Permissions

The database stores:

```text
Assigned Permissions

and

Boundary Permissions
```

The application calculates:

```text
Effective Permissions
        =
Assigned Permissions
        ∩
Boundary Permissions
```

Do not create an `effective_permissions` table unless there is a specific caching requirement.

It is derived authorization state.

---

# 11. TOOL

Represents a tool an AI agent can request.

```text
TOOL
────────────────────────
PK  id

    name
    description

    canonical_action
    resource_type

    input_schema

    target_service
    target_endpoint

    status

FK  created_by
    → USER.id

    created_at
    updated_at
```

Example:

```text
name:
execute_payment

canonical_action:
payment.execute

resource_type:
payment

target_service:
banking-api

status:
ENABLED
```

Possible status:

```text
ENABLED
DISABLED
```

---

# 12. Why TOOL Is Separate From PERMISSION

Do not treat them as identical.

```text
Tool
=
How an operation is invoked


Permission
=
Whether the principal has authority
to perform an operation
```

Example:

```text
Tool:
execute_payment

       ↓ maps to

Action:
payment.execute

       ↓ requires

Permission:
payment.execute
```

This separation prevents tool availability from automatically granting authority.

---

# 13. POLICY

Represents policy metadata managed by the governance platform.

```text
POLICY
────────────────────────
PK  id

    name
    description

    version

    policy_type
    source

    status

FK  created_by
    → USER.id

    created_at
    updated_at
    activated_at
```

Possible status:

```text
DRAFT
ACTIVE
INACTIVE
```

For OPA:

```text
policy_type:
REGO
```

`source` may contain the Rego policy for the MVP.

For production, policy bundles or source-control references may be preferable.

---

# 14. Policy Versioning

Do not overwrite an active policy without preserving history.

For the hackathon MVP:

```text
name:
payment-policy

version:
1
```

Later:

```text
name:
payment-policy

version:
2
```

This allows an authorization decision to record:

```text
Which policy version produced this decision?
```

That is important for governance and auditability.

---

# 15. ACTION REQUEST

This is the central runtime entity.

Every governed action creates an action request.

```text
ACTION_REQUEST
────────────────────────
PK  id

FK  agent_id
    → AGENT.id

FK  tool_id
    → TOOL.id

    action

    resource_type
    resource_id

    parameters

    request_fingerprint

    idempotency_key

    status

    created_at
    completed_at
```

Example:

```text
id:
REQ-1001

agent:
AGT-002

tool:
execute_payment

action:
payment.execute

resource:
PAY-1001

request_fingerprint:
8f72...

status:
PENDING
```

---

# 16. Action Request Status

Possible lifecycle:

```text
PENDING

DENIED

PENDING_APPROVAL

AUTHORIZED

EXECUTING

SUCCEEDED

FAILED
```

Do not confuse:

```text
AUTHORIZED
```

with:

```text
SUCCEEDED
```

Authorization and execution are separate stages.

---

# 17. AGENT → ACTION REQUEST

Relationship:

```text
AGENT 1 ─────────< N ACTION_REQUEST
```

One agent may generate many requests.

Every action request belongs to exactly one authenticated agent.

---

# 18. TOOL → ACTION REQUEST

Relationship:

```text
TOOL 1 ─────────< N ACTION_REQUEST
```

One registered tool may be used by many action requests.

---

# 19. AUTHORIZATION DECISION

Do not store the authorization decision only inside `ACTION_REQUEST`.

Use a separate entity because a request may be authorized multiple times.

This is especially important for:

```text
Human approval
      ↓
Re-authorization
```

Entity:

```text
AUTHORIZATION_DECISION
────────────────────────
PK  id

FK  action_request_id
    → ACTION_REQUEST.id

FK  policy_id
    → POLICY.id

    decision

    reason_code

    risk_level

    policy_version

    approval_present

    request_fingerprint

    evaluated_at
```

Possible decision:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

---

# 20. Why Multiple Authorization Decisions?

Consider:

```text
Request
   ↓
OPA
   ↓
REQUIRE_APPROVAL
```

Decision #1:

```text
REQUIRE_APPROVAL
```

Human approves.

Then:

```text
Re-Authorization
      ↓
OPA
      ↓
ALLOW
```

Decision #2:

```text
ALLOW
```

Therefore:

```text
ACTION_REQUEST
      1
      │
      │
      ▼
      N
AUTHORIZATION_DECISION
```

---

# 21. APPROVAL REQUEST

Represents human-in-the-loop authorization.

```text
APPROVAL_REQUEST
────────────────────────
PK  id

FK  action_request_id
    → ACTION_REQUEST.id

FK  requested_by_agent_id
    → AGENT.id

FK  approver_id
    → USER.id
    nullable

    status

    request_fingerprint

    reason

    requested_at
    decided_at
    expires_at
```

Possible status:

```text
PENDING

APPROVED

REJECTED

EXPIRED

CANCELLED
```

---

# 22. ACTION REQUEST → APPROVAL

For the MVP:

```text
ACTION_REQUEST 1 ───── 0..1 APPROVAL_REQUEST
```

because most requests do not require approval.

A sensitive request may create one approval record.

For a more advanced system supporting repeated approval workflows:

```text
ACTION_REQUEST 1 ─────< N APPROVAL_REQUEST
```

But this is unnecessary for the first implementation.

---

# 23. USER → APPROVAL REQUEST

Relationship:

```text
USER 1 ─────────< N APPROVAL_REQUEST
```

Meaning:

One human approver may decide many approval requests.

The approver field remains nullable while:

```text
status = PENDING
```

---

# 24. Approval Binding

Store:

```text
request_fingerprint
```

inside the approval.

Example:

```text
Action Request Fingerprint:

ABC123


Approval Fingerprint:

ABC123
```

Before using approval:

```text
ABC123 == ABC123
```

If request changes:

```text
ABC123 != XYZ999
```

then the approval is invalid.

This prevents:

```text
Approve $100

then change request to $10,000
```

while attempting to reuse the old approval.

---

# 25. EXECUTION

Authorization and execution should have separate records.

Entity:

```text
EXECUTION
────────────────────────
PK  id

FK  action_request_id
    → ACTION_REQUEST.id

FK  authorization_decision_id
    → AUTHORIZATION_DECISION.id

    status

    target_service
    target_operation

    request_fingerprint

    response_code

    started_at
    completed_at

    error_code
```

Possible status:

```text
PENDING

RUNNING

SUCCEEDED

FAILED
```

---

# 26. Why Execution Is Separate

Consider:

```text
Authorization:
ALLOW

Execution:
FAILED
```

For example:

```text
OPA
 ↓
ALLOW
 ↓
Payment API
 ↓
503 Service Unavailable
```

Authorization succeeded.

Business execution failed.

These must remain separate for correct audit and troubleshooting.

---

# 27. ACTION REQUEST → EXECUTION

For simple read operations:

```text
ACTION_REQUEST 1 ───── 0..1 EXECUTION
```

For systems supporting retries, it is better to model:

```text
ACTION_REQUEST 1 ─────< N EXECUTION
```

because one authorized action could have multiple controlled execution attempts.

For the governance design, I recommend the second model:

```text
ACTION_REQUEST
      1
      │
      ▼
      N
EXECUTION
```

---

# 28. AUTHORIZATION DECISION → EXECUTION

Each execution should identify the authorization decision that permitted it.

```text
AUTHORIZATION_DECISION 1 ─────< N EXECUTION
```

Normally there will be one execution.

But preserving the relationship answers:

> Which exact authorization decision allowed this operation?

---

# 29. AUDIT EVENT

Audit is a first-class governance entity.

```text
AUDIT_EVENT
────────────────────────
PK  id

FK  action_request_id
    → ACTION_REQUEST.id
    nullable

FK  actor_user_id
    → USER.id
    nullable

FK  actor_agent_id
    → AGENT.id
    nullable

    event_type

    entity_type
    entity_id

    outcome

    metadata

    created_at
```

Possible events:

```text
AGENT_REGISTERED

AGENT_DISABLED

PERMISSION_GRANTED

PERMISSION_REVOKED

POLICY_CREATED

POLICY_ACTIVATED

ACTION_REQUESTED

AUTHORIZATION_ALLOWED

AUTHORIZATION_DENIED

APPROVAL_REQUESTED

APPROVAL_APPROVED

APPROVAL_REJECTED

EXECUTION_STARTED

EXECUTION_SUCCEEDED

EXECUTION_FAILED
```

---

# 30. Audit Actor

An event can originate from:

```text
Human
```

or:

```text
AI Agent
```

Therefore:

```text
actor_user_id
```

and:

```text
actor_agent_id
```

are nullable.

The application should enforce that the correct actor information is recorded.

---

# 31. ACTION REQUEST → AUDIT EVENT

Relationship:

```text
ACTION_REQUEST 1 ─────────< N AUDIT_EVENT
```

A single action may generate many events.

Example:

```text
REQ-1001

ACTION_REQUESTED
RISK_EVALUATED
APPROVAL_REQUIRED
APPROVAL_APPROVED
REAUTHORIZED
EXECUTION_STARTED
EXECUTION_SUCCEEDED
```

This produces the complete governance timeline.

---

# 32. Recommended Core ER Diagram

The main structure should look approximately like this:

```text
┌──────────────┐
│     USER     │
└──────┬───────┘
       │ creates
       ▼
┌──────────────┐
│    AGENT     │
└──────┬───────┘
       │
       │ 1
       │
       ▼ N
┌────────────────────┐          ┌────────────────┐
│ AGENT_PERMISSION   │─────────▶│   PERMISSION   │
└────────────────────┘          └───────┬────────┘
                                       │
                                       │
                                       ▼
                              ┌──────────────────────┐
                              │ BOUNDARY_PERMISSION │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ PERMISSION_BOUNDARY  │
                              └──────────┬───────────┘
                                         │
                                         │ applies to
                                         ▼
                                       AGENT


AGENT
  │
  │ 1
  ▼ N
┌─────────────────────┐
│   ACTION_REQUEST    │
└──────┬────┬─────┬───┘
       │    │     │
       │    │     │
       │    │     └─────────────────────┐
       │    │                           │
       ▼    ▼                           ▼
┌──────────┐  ┌───────────────────┐  ┌─────────────┐
│ APPROVAL │  │ AUTHORIZATION     │  │ AUDIT_EVENT │
│ REQUEST  │  │ DECISION          │  │             │
└──────────┘  └─────────┬─────────┘  └─────────────┘
                         │
                         ▼
                   ┌─────────────┐
                   │ EXECUTION   │
                   └─────────────┘


ACTION_REQUEST
      │
      │ uses
      ▼
┌─────────────┐
│    TOOL     │
└─────────────┘


AUTHORIZATION_DECISION
      │
      │ evaluated using
      ▼
┌─────────────┐
│   POLICY    │
└─────────────┘
```

---

# 33. Better Draw.io Layout

For the actual diagram, organize it into columns.

```text
IDENTITY           AUTHORIZATION           RUNTIME              GOVERNANCE

USER               PERMISSION              ACTION_REQUEST       POLICY
 │                      ▲                        │
 ▼                      │                        ├── AUTHORIZATION_DECISION
AGENT ───────▶ AGENT_PERMISSION                   │
 │                                               ├── APPROVAL_REQUEST
 │              PERMISSION_BOUNDARY              │
 │                     ▲                         ├── EXECUTION
 │                     │                         │
 └────────────── Boundary                        └── AUDIT_EVENT

                       TOOL ───────────────▶ ACTION_REQUEST
```

Keep the runtime lifecycle near the center because it is the core of the platform.

---

# 34. Most Important Runtime Chain

Visually emphasize:

```text
AGENT
  │
  ▼
ACTION_REQUEST
  │
  ├──────────────▶ AUTHORIZATION_DECISION
  │                       │
  │                       ▼
  │                    POLICY
  │
  ├──────────────▶ APPROVAL_REQUEST
  │
  ├──────────────▶ EXECUTION
  │
  └──────────────▶ AUDIT_EVENT
```

This makes the governance lifecycle immediately understandable.

---

# 35. Cardinalities

Use Crow's Foot notation.

Important relationships:

```text
USER 1 ─────< N AGENT

AGENT N >────< N PERMISSION
through AGENT_PERMISSION

PERMISSION_BOUNDARY N >────< N PERMISSION
through BOUNDARY_PERMISSION

PERMISSION_BOUNDARY 1 ─────< N AGENT

AGENT 1 ─────< N ACTION_REQUEST

TOOL 1 ─────< N ACTION_REQUEST

ACTION_REQUEST 1 ─────< N AUTHORIZATION_DECISION

POLICY 1 ─────< N AUTHORIZATION_DECISION

ACTION_REQUEST 1 ───── 0..1 APPROVAL_REQUEST

USER 1 ─────< N APPROVAL_REQUEST

ACTION_REQUEST 1 ─────< N EXECUTION

AUTHORIZATION_DECISION 1 ─────< N EXECUTION

ACTION_REQUEST 1 ─────< N AUDIT_EVENT
```

---

# 36. JSON / Flexible Fields

Some fields are naturally structured.

Examples:

```text
TOOL.input_schema

ACTION_REQUEST.parameters

AUDIT_EVENT.metadata
```

If PostgreSQL is used, these can use:

```text
JSONB
```

Example:

```json
{
  "accountId": "ACC-101",
  "amount": 2500,
  "currency": "USD"
}
```

Do not put every possible tool parameter into database columns.

---

# 37. Important Constraints

The database should eventually enforce constraints such as:

```text
AGENT.status
∈ ACTIVE, DISABLED


TOOL.status
∈ ENABLED, DISABLED


AUTHORIZATION_DECISION.decision
∈ ALLOW, DENY, REQUIRE_APPROVAL


APPROVAL_REQUEST.status
∈ PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED


EXECUTION.status
∈ PENDING, RUNNING, SUCCEEDED, FAILED
```

Also enforce unique constraints where appropriate.

Example:

```text
PERMISSION.name
UNIQUE
```

and possibly:

```text
AGENT_PERMISSION(
    agent_id,
    permission_id
)
UNIQUE
```

---

# 38. Idempotency

For financial side effects, include:

```text
ACTION_REQUEST.idempotency_key
```

Recommended uniqueness scope:

```text
agent_id + idempotency_key
```

This prevents accidental duplicate actions such as:

```text
Agent retries payment
       ↓
Same idempotency key
       ↓
Do not create another payment
```

---

# 39. Request Fingerprint

Keep:

```text
request_fingerprint
```

on:

```text
ACTION_REQUEST

AUTHORIZATION_DECISION

APPROVAL_REQUEST

EXECUTION
```

This may look redundant, but it provides strong traceability.

Conceptually:

```text
ACTION_REQUEST
ABC123
     │
     ├── Authorization → ABC123
     │
     ├── Approval → ABC123
     │
     └── Execution → ABC123
```

Everything should refer to the same security-relevant request.

---

# 40. Policy Snapshot

An authorization decision should preserve:

```text
policy_id

policy_version
```

even if that policy later changes.

This lets the audit system answer:

> Why was this request allowed three months ago?

Without policy/version information, historical authorization decisions become difficult to explain.

---

# 41. Risk Snapshot

Similarly:

```text
AUTHORIZATION_DECISION.risk_level
```

should store the risk classification used at decision time.

Do not simply query the current risk later.

Historical decisions need historical context.

---

# 42. Audit Immutability

Application behavior should treat:

```text
AUDIT_EVENT
```

as append-only.

Normal application operations should not:

```text
UPDATE old audit event
```

or:

```text
DELETE old audit event
```

Instead:

```text
New Event
    ↓
INSERT
```

For the hackathon, application-level restrictions are sufficient.

Production systems could use stronger tamper-evidence and immutable storage.

---

# 43. Do Not Put Banking Tables Here

Unless your `06-data-model.md` explicitly combines both domains, avoid cluttering this governance ER diagram with:

```text
CUSTOMER

ACCOUNT

TRANSACTION

PAYMENT
```

Those belong to the **demo banking service's data model**.

The governance platform should primarily reference protected resources through identifiers:

```text
resource_type

resource_id
```

Example:

```text
resource_type = ACCOUNT

resource_id = ACC-1001
```

This preserves service ownership.

---

# 44. Optional Banking Mini-Model

If you want to show the demo system, place a small separate container:

```text
DEMO BANKING DOMAIN

CUSTOMER
   │
   ▼
ACCOUNT
   │
   ├────▶ TRANSACTION
   │
   └────▶ PAYMENT
```

Label it:

```text
Separate Protected Service
```

Do not create database foreign keys from the governance database to these tables.

Instead:

```text
ACTION_REQUEST.resource_id
```

is a logical external reference.

---

# 45. Avoid Over-Normalization

For the hackathon, don't introduce unnecessary entities such as:

```text
RiskCalculationRule

RiskSignalDefinition

PolicyCondition

PolicyStatement

ApprovalWorkflowStage

ExecutionAttemptMetadata

ResourceHierarchy

ToolParameterDefinition
```

unless your implementation genuinely requires them.

OPA already represents much of the policy logic.

Keep the database focused on governance state and evidence.

---

# 46. MVP Core Tables

If time becomes limited, prioritize these:

```text
users

agents

permissions

agent_permissions

permission_boundaries

boundary_permissions

tools

policies

action_requests

authorization_decisions

approval_requests

executions

audit_events
```

That's enough to demonstrate a serious governance platform without making the MVP unnecessarily large.

---

# 47. Naming Convention

Use one convention consistently.

For PostgreSQL, recommended:

```text
snake_case
```

Examples:

```text
action_requests

authorization_decisions

approval_requests

agent_permissions

permission_boundaries

audit_events
```

Columns:

```text
agent_id

created_at

request_fingerprint

resource_type
```

---

# 48. Recommended Final ER Structure

The finished `.drawio` should communicate approximately:

```text
                         ┌──────────────┐
                         │     USER     │
                         └───┬─────┬────┘
                             │     │
                       creates    approves
                             │     │
                             ▼     ▼
┌───────────────────────┐  AGENT  APPROVAL_REQUEST
│ PERMISSION_BOUNDARY   │    │
└───────────┬───────────┘    │
            │                │
            │                ▼
            │        ┌──────────────────┐
            │        │ AGENT_PERMISSION │
            │        └────────┬─────────┘
            │                 │
            │                 ▼
            │           ┌────────────┐
            └──────────▶│ PERMISSION │
                        └────────────┘


┌──────────────┐
│     TOOL     │
└──────┬───────┘
       │
       │ used by
       ▼
┌─────────────────────────┐
│     ACTION_REQUEST      │
└───────┬──────┬──────┬───┘
        │      │      │
        │      │      │
        ▼      ▼      ▼
┌────────────┐ │  ┌──────────────┐
│ APPROVAL   │ │  │ AUDIT_EVENT  │
│ REQUEST    │ │  └──────────────┘
└────────────┘ │
               ▼
      ┌───────────────────────┐
      │ AUTHORIZATION_DECISION│
      └───────┬─────────┬─────┘
              │         │
              ▼         ▼
        ┌──────────┐ ┌───────────┐
        │  POLICY  │ │ EXECUTION │
        └──────────┘ └───────────┘
```

---

# 49. What NOT to Show

Do not put these in the ER diagram:

```text
REST endpoints

Docker containers

OPA request flow

Service-to-service arrows

Frontend components

JWT internals

Rego source code

Detailed algorithms

Risk calculation flow

Sequence numbers

HTTP status codes
```

Those belong in other documentation.

---

# 50. Diagram Title

Use:

**AI Agent Governance Platform — Entity Relationship Diagram**

Subtitle:

**Governance identity, authorization, approval, execution, and audit data model**

---

# 51. Key Governance Questions Supported

The data model should allow us to answer:

```text
Who created this agent?

What permissions does it have?

What is its maximum permission boundary?

Who granted those permissions?

Which tool did it request?

What protected resource did it target?

What risk level was calculated?

Which policy evaluated the request?

Which policy version was used?

Why was the request denied?

Did it require human approval?

Who approved it?

Was the approved request modified?

Which authorization decision allowed execution?

Did execution succeed?

Who disabled the agent?

What happened during the entire request lifecycle?
```

That is the purpose of the model.

---

# 52. Core Data Lifecycle

The final ER diagram should make this chain easy to follow:

```text
IDENTITY

Agent
  │
  ▼

AUTHORITY

Permissions
+
Boundary
  │
  ▼

INTENT

Action Request
  │
  ▼

DECISION

Authorization Decision
  │
  ├──── REQUIRE_APPROVAL ────▶ Approval Request
  │                                  │
  │                                  ▼
  │                              Human User
  │
  ▼

EXECUTION

Execution
  │
  ▼

ACCOUNTABILITY

Audit Events
```

The database therefore reflects the same fundamental governance model as the rest of the architecture:

> **Identity → Authority → Intent → Decision → Approval → Execution → Accountability**
