# 06 — Sequence Diagram: Account Read

## Purpose

This sequence diagram demonstrates a **low-risk successful authorization flow**.

Scenario:

> A Customer Support AI Agent needs to read a customer's account information.

The agent has the required permission:

```text
account.read
```

The request is low risk, no human approval is required, OPA returns `ALLOW`, and the governance platform executes the request through the controlled Tool Executor.

---

# 1. Scenario

Assume:

```text
Agent:
CustomerSupportAgent

Agent ID:
AGT-001

Status:
ACTIVE

Requested Tool:
get_account

Canonical Action:
account.read

Resource:
ACC-1001

Risk:
LOW

Required Permission:
account.read
```

The agent already has:

```text
Assigned Permission:
account.read

Permission Boundary:
account.read
transaction.read
```

Therefore:

```text
Effective Permission:
account.read
```

---

# 2. Participants

Create the following participants from left to right:

```text
User

AI Agent

Governance Gateway

Authentication

Agent Registry

Tool Registry

Permission Service

Risk Engine

Authorization Service

OPA

Tool Executor

Banking API

Output Guardrail

Audit Service
```

You do not need PostgreSQL as a separate participant unless you want to show persistence explicitly.

For a cleaner sequence diagram, keep database interactions hidden behind their owning services.

---

# 3. Recommended Participant Layout

Use:

```text
User

 │
AI Agent

 │
Governance Gateway

 │
Authentication

 │
Agent Registry

 │
Tool Registry

 │
Permission Service

 │
Risk Engine

 │
Authorization Service

 │
OPA

 │
Tool Executor

 │
Banking API

 │
Output Guardrail

 │
Audit Service
```

---

# 4. Step 1 — User Request

The user asks the AI agent:

```text
"Show me the account details for ACC-1001."
```

Sequence:

```text
User
 │
 │ Account information request
 ▼
AI Agent
```

Arrow label:

```text
Request account information
```

---

# 5. Step 2 — Agent Reasoning

The AI Agent determines that it needs:

```text
Tool:
get_account

Resource:
ACC-1001
```

This is internal agent reasoning.

You can show a self-call:

```text
AI Agent
 │
 ├──────────────┐
 │ Determine    │
 │ required     │
 │ tool         │
 ◀──────────────┘
```

Result:

```text
get_account(accountId="ACC-1001")
```

Important:

The agent is only **proposing** the tool call.

It has not been authorized yet.

---

# 6. Step 3 — Governed Action Request

The agent sends the request to the Governance Gateway.

```text
AI Agent
    │
    │ POST Governed Action
    ▼
Governance Gateway
```

Conceptual request:

```json
{
  "tool": "get_account",
  "resource": {
    "type": "account",
    "id": "ACC-1001"
  },
  "arguments": {
    "accountId": "ACC-1001"
  }
}
```

The authenticated identity should not be trusted merely because the body contains an agent identifier.

---

# 7. Step 4 — Create Request Context

Governance Gateway creates:

```text
Request ID

Timestamp

Correlation ID
```

Example:

```text
Request ID:
REQ-1001
```

Show:

```text
Governance Gateway
       │
       ├─────────────┐
       │ Create      │
       │ REQ-1001    │
       ◀─────────────┘
```

---

# 8. Step 5 — Audit Request Received

Immediately record:

```text
ACTION_REQUESTED
```

Sequence:

```text
Governance Gateway
       │
       │ ACTION_REQUESTED
       ▼
Audit Service
```

Include:

```text
requestId
principal
tool
resource
timestamp
```

---

# 9. Step 6 — Authenticate Agent

Gateway calls Authentication:

```text
Governance Gateway
       │
       │ Verify credentials
       ▼
Authentication
```

Authentication verifies the credential and resolves:

```text
Principal Type:
AGENT

Principal ID:
AGT-001
```

Response:

```text
Authentication
       │
       │ Authenticated AGT-001
       ▼
Governance Gateway
```

---

# 10. Authentication Failure Alternative

Add an `alt` fragment:

```text
alt Authentication Failed

    Authentication
        ↓
    Governance Gateway

    Governance Gateway
        ↓
    Audit Service

    AUTHENTICATION_FAILED

    Governance Gateway
        ↓
    AI Agent

    DENIED
end
```

Keep this branch small because this diagram focuses on the successful path.

---

# 11. Step 7 — Check Agent Registry

Gateway checks the authenticated agent.

```text
Governance Gateway
       │
       │ Get AGT-001
       ▼
Agent Registry
```

Response:

```text
Agent Registry
       │
       │ ACTIVE
       ▼
Governance Gateway
```

The system verifies:

```text
Registered = true
Status = ACTIVE
```

---

# 12. Disabled Agent Alternative

Show:

```text
alt Agent Disabled

Agent Registry
      ↓
Governance Gateway

status = DISABLED

Governance Gateway
      ↓
Audit Service

AGENT_DISABLED

Governance Gateway
      ↓
AI Agent

DENIED
end
```

---

# 13. Step 8 — Resolve Tool

Gateway asks Tool Registry:

```text
Governance Gateway
       │
       │ Resolve get_account
       ▼
Tool Registry
```

Tool Registry returns:

```text
Tool:
get_account

Status:
ENABLED

Canonical Action:
account.read

Resource Type:
account

Input Schema:
accountId required

Target:
Banking Account API
```

Sequence:

```text
Tool Registry
      │
      │ account.read + schema + target
      ▼
Governance Gateway
```

---

# 14. Step 9 — Validate Arguments

Governance validates:

```text
accountId = ACC-1001
```

against the trusted tool schema.

Show self-operation:

```text
Governance Gateway
       │
       ├──────────────┐
       │ Validate     │
       │ arguments    │
       ◀──────────────┘
```

Result:

```text
VALID
```

---

# 15. Step 10 — Canonicalize Request

Governance now has trusted:

```text
Principal:
AGT-001

Action:
account.read

Resource:
ACC-1001

Arguments:
accountId = ACC-1001
```

Create canonical request representation.

```text
Governance Gateway
       │
       ├──────────────┐
       │ Canonicalize │
       │ request      │
       ◀──────────────┘
```

---

# 16. Step 11 — Generate Fingerprint

Generate:

```text
SHA-256(
    principal
    + action
    + resource
    + security-relevant parameters
)
```

Example:

```text
Fingerprint:
FP-ABC123
```

Show:

```text
Governance Gateway
       │
       ├────────────────┐
       │ Generate       │
       │ fingerprint    │
       ◀────────────────┘
```

---

# 17. Step 12 — Permission Check

Gateway calls Permission Service.

```text
Governance Gateway
       │
       │ Check AGT-001 → account.read
       ▼
Permission Service
```

Permission Service loads:

```text
Assigned:
account.read
transaction.read
```

It determines:

```text
account.read
=
ASSIGNED
```

---

# 18. Step 13 — Boundary Check

Permission Service also evaluates the permission boundary.

```text
Assigned:
account.read

Boundary:
account.read
transaction.read
```

Therefore:

```text
Effective:
account.read
```

Response:

```text
Permission Service
       │
       │ PERMITTED
       ▼
Governance Gateway
```

You can label:

```text
Permission + Boundary Check = PASS
```

---

# 19. Permission Failure Alternative

Add:

```text
alt Permission Missing / Outside Boundary

Permission Service
      ↓
Governance Gateway

DENY

Governance Gateway
      ↓
Audit Service

PERMISSION_DENIED

Governance Gateway
      ↓
AI Agent

DENIED
end
```

---

# 20. Step 14 — Risk Assessment

Gateway sends trusted request context to Risk Engine.

```text
Governance Gateway
       │
       │ Assess Risk
       ▼
Risk Engine
```

Input:

```text
Agent:
AGT-001

Action:
account.read

Resource:
ACC-1001
```

Risk Engine evaluates the request.

Because this is a normal read operation:

```text
Risk:
LOW
```

Response:

```text
Risk Engine
       │
       │ LOW
       ▼
Governance Gateway
```

---

# 21. Important Trust Point

The agent does **not** send:

```text
risk = LOW
```

as authoritative security context.

Risk is calculated internally:

```text
Trusted Request
      ↓
Risk Engine
      ↓
LOW
```

---

# 22. Step 15 — Build Authorization Input

Gateway sends the trusted context to Authorization Service.

```text
Governance Gateway
       │
       │ Authorize Request
       ▼
Authorization Service
```

Authorization Service builds:

```text
Principal

Action

Resource

Effective Permission

Risk

Approval Context

Request Fingerprint
```

Conceptually:

```json
{
  "principal": {
    "type": "AGENT",
    "id": "AGT-001"
  },
  "action": "account.read",
  "resource": {
    "type": "account",
    "id": "ACC-1001"
  },
  "context": {
    "risk": "LOW",
    "approval": false
  }
}
```

---

# 23. Step 16 — OPA Evaluation

Authorization Service calls OPA.

```text
Authorization Service
        │
        │ Policy Input
        ▼
       OPA
```

OPA evaluates Rego policies.

Example conceptual policy:

```text
Agent has account.read

AND

Risk is LOW

AND

Agent is permitted for resource

        ↓

ALLOW
```

---

# 24. Step 17 — OPA Decision

OPA returns:

```text
ALLOW
```

Sequence:

```text
OPA
 │
 │ ALLOW
 ▼
Authorization Service
```

Important annotation:

```text
OPA DECIDES

OPA DOES NOT EXECUTE
```

---

# 25. Step 18 — Authorization Result

Authorization Service returns:

```text
ALLOW
```

to Governance Gateway.

```text
Authorization Service
       │
       │ ALLOW
       ▼
Governance Gateway
```

The decision should include useful evidence:

```text
decision:
ALLOW

risk:
LOW

policy:
account-access-policy

policyVersion:
1
```

---

# 26. Step 19 — Audit Authorization

Record:

```text
AUTHORIZATION_ALLOWED
```

Sequence:

```text
Governance Gateway
       │
       │ AUTHORIZATION_ALLOWED
       ▼
Audit Service
```

Store:

```text
Request ID

Agent

Action

Resource

Risk

Decision

Policy

Policy Version

Fingerprint
```

---

# 27. Step 20 — Final Integrity Check

Before execution:

```text
Governance Gateway
       │
       ├──────────────────┐
       │ Verify request   │
       │ fingerprint      │
       ◀──────────────────┘
```

Expected:

```text
Current Fingerprint
=
Authorized Fingerprint
```

Example:

```text
FP-ABC123
=
FP-ABC123
```

Result:

```text
VALID
```

---

# 28. Step 21 — Send Authorized Action

Only now does Governance Gateway invoke the Tool Executor.

```text
Governance Gateway
       │
       │ Execute Authorized Action
       ▼
Tool Executor
```

Include:

```text
Request ID

Tool

Canonical Action

Resource

Arguments

Authorization Decision

Fingerprint
```

---

# 29. Step 22 — Tool Executor Validation

Tool Executor performs final checks:

```text
Tool still enabled?

Arguments still valid?

Authorization exists?

Fingerprint matches?
```

Show:

```text
Tool Executor
      │
      ├──────────────┐
      │ Final        │
      │ validation   │
      ◀──────────────┘
```

Result:

```text
PASS
```

---

# 30. Step 23 — Execute Banking API

Now the protected service is called.

```text
Tool Executor
      │
      │ GET Account ACC-1001
      ▼
Banking API
```

This is the **first direct interaction with the protected banking system**.

The AI Agent never participates in this call.

---

# 31. Step 24 — Banking Response

Banking API returns:

```text
Banking API
     │
     │ Account Data
     ▼
Tool Executor
```

Example raw result:

```json
{
  "accountId": "ACC-1001",
  "customerName": "Aarav Sharma",
  "accountNumber": "123456789012",
  "accountType": "SAVINGS",
  "balance": 42500,
  "internalRiskScore": 72,
  "fraudNotes": "Internal review metadata"
}
```

---

# 32. Step 25 — Output Guardrail

Tool Executor sends the response through the Output Guardrail.

```text
Tool Executor
      │
      │ Raw Result
      ▼
Output Guardrail
```

Output Guardrail applies:

```text
Field filtering

PII masking

Internal metadata removal
```

---

# 33. Example Filtering

Before:

```text
Account Number:
123456789012

Internal Risk Score:
72

Fraud Notes:
Internal review metadata
```

After:

```text
Account Number:
********9012

Internal Risk Score:
REMOVED

Fraud Notes:
REMOVED
```

This demonstrates that:

```text
Authorized to call API
```

does not necessarily mean:

```text
Authorized to see every returned field
```

---

# 34. Step 26 — Sanitized Result

Output Guardrail returns:

```text
Output Guardrail
       │
       │ Sanitized Account Data
       ▼
Tool Executor
```

Example:

```json
{
  "accountId": "ACC-1001",
  "customerName": "Aarav Sharma",
  "accountNumber": "********9012",
  "accountType": "SAVINGS",
  "balance": 42500
}
```

---

# 35. Step 27 — Execution Audit

Tool Executor records:

```text
EXECUTION_SUCCEEDED
```

Sequence:

```text
Tool Executor
      │
      │ EXECUTION_SUCCEEDED
      ▼
Audit Service
```

Include:

```text
Request ID

Action

Target Service

Execution Status

Timestamp

Response Status
```

Do not store sensitive response bodies indiscriminately in audit logs.

---

# 36. Step 28 — Return Result

Tool Executor returns sanitized result:

```text
Tool Executor
      │
      ▼
Governance Gateway
```

Then:

```text
Governance Gateway
      │
      │ Governed Result
      ▼
AI Agent
```

---

# 37. Step 29 — Agent Responds to User

Finally:

```text
AI Agent
    │
    │ Account information
    ▼
User
```

The user receives only the information permitted by governance and output policies.

---

# 38. Complete Sequence

Your draw.io diagram should approximately follow:

```text
User   Agent   Gateway   Auth   Registry   ToolReg   Permission   Risk   AuthZ   OPA   Executor   Bank   Guardrail   Audit
 │       │        │        │       │          │          │         │      │      │       │        │        │         │
 │──────▶│        │        │       │          │          │         │      │      │       │        │        │         │
 │Request│        │        │       │          │          │         │      │      │       │        │        │         │
 │       │        │        │       │          │          │         │      │      │       │        │        │         │
 │       │───────▶│        │       │          │          │         │      │      │       │        │        │         │
 │       │ Action │        │       │          │          │         │      │      │       │        │        │         │
 │       │ Request│        │       │          │          │         │      │      │       │        │        │         │
 │       │        │────────────────────────────────────────────────────────────────────────────────────────▶│         │
 │       │        │ ACTION_REQUESTED                                                                       │         │
 │       │        │        │       │          │          │         │      │      │       │        │        │         │
 │       │        │───────▶│       │          │          │         │      │      │       │        │        │         │
 │       │        │ Auth   │       │          │          │         │      │      │       │        │        │         │
 │       │        │◀───────│       │          │          │         │      │      │       │        │        │         │
 │       │        │ AGT-001│       │          │          │         │      │      │       │        │        │         │
 │       │        │───────────────▶│          │          │         │      │      │       │        │        │         │
 │       │        │ Check Agent    │          │          │         │      │      │       │        │        │         │
 │       │        │◀───────────────│          │          │         │      │      │       │        │        │         │
 │       │        │ ACTIVE         │          │          │         │      │      │       │        │        │         │
 │       │        │──────────────────────────▶│          │         │      │      │       │        │        │         │
 │       │        │ Resolve Tool              │          │         │      │      │       │        │        │         │
 │       │        │◀──────────────────────────│          │         │      │      │       │        │        │         │
 │       │        │ account.read              │          │         │      │      │       │        │        │         │
 │       │        │─────────────────────────────────────▶│         │      │      │       │        │        │         │
 │       │        │ Check Permission                    │         │      │      │       │        │        │         │
 │       │        │◀─────────────────────────────────────│         │      │      │       │        │        │         │
 │       │        │ PERMITTED                            │         │      │      │       │        │        │         │
 │       │        │───────────────────────────────────────────────▶│      │      │       │        │        │         │
 │       │        │ Assess Risk                                  │      │      │       │        │        │         │
 │       │        │◀───────────────────────────────────────────────│      │      │       │        │        │         │
 │       │        │ LOW                                           │      │      │       │        │        │         │
 │       │        │─────────────────────────────────────────────────────▶│      │       │        │        │         │
 │       │        │ Authorize                                           │      │       │        │        │         │
 │       │        │                                                     │─────▶│       │        │        │         │
 │       │        │                                                     │Policy│       │        │        │         │
 │       │        │                                                     │◀─────│       │        │        │         │
 │       │        │                                                     │ALLOW │       │        │        │         │
 │       │        │◀─────────────────────────────────────────────────────│      │       │        │        │         │
 │       │        │ ALLOW                                                      │       │        │        │         │
 │       │        │──────────────────────────────────────────────────────────────────────────────────────────────▶│
 │       │        │ AUTHORIZATION_ALLOWED                                                                            │
 │       │        │                                                                      │        │        │         │
 │       │        │─────────────────────────────────────────────────────────────────────▶│        │        │         │
 │       │        │ Authorized Execute                                                   │        │        │         │
 │       │        │                                                                      │───────▶│        │         │
 │       │        │                                                                      │ GET    │        │         │
 │       │        │                                                                      │◀───────│        │         │
 │       │        │                                                                      │ Data   │        │         │
 │       │        │                                                                      │───────────────▶│         │
 │       │        │                                                                      │ Raw Data       │         │
 │       │        │                                                                      │◀───────────────│         │
 │       │        │                                                                      │ Sanitized      │         │
 │       │        │                                                                      │─────────────────────────▶│
 │       │        │                                                                      │ EXECUTION_SUCCEEDED      │
 │       │        │◀─────────────────────────────────────────────────────────────────────│        │        │         │
 │       │        │ Sanitized Result                                                     │        │        │         │
 │       │◀───────│                                                                      │        │        │         │
 │       │ Result │                                                                      │        │        │         │
 │◀──────│        │                                                                      │        │        │         │
 │Answer │        │                                                                      │        │        │         │
```

---

# 39. Cleaner Judge-Friendly Version

For the actual hackathon presentation, the sequence can be simplified to:

```text
User     Agent     Gateway     Permission     Risk     OPA     Executor     Banking API     Audit
 │         │          │             │           │       │         │             │            │
 │────────▶│          │             │           │       │         │             │            │
 │ Request │          │             │           │       │         │             │            │
 │         │─────────▶│             │           │       │         │             │            │
 │         │ Action   │             │           │       │         │             │            │
 │         │          │────────────▶│           │       │         │             │            │
 │         │          │ Permission? │           │       │         │             │            │
 │         │          │◀────────────│           │       │         │             │            │
 │         │          │ PERMITTED   │           │       │         │             │            │
 │         │          │────────────────────────▶│       │         │             │            │
 │         │          │ Risk?                   │       │         │             │            │
 │         │          │◀────────────────────────│       │         │             │            │
 │         │          │ LOW                     │       │         │             │            │
 │         │          │────────────────────────────────▶│         │             │            │
 │         │          │ Policy Evaluation                │         │             │            │
 │         │          │◀────────────────────────────────│         │             │            │
 │         │          │ ALLOW                           │         │             │            │
 │         │          │──────────────────────────────────────────▶│             │            │
 │         │          │ Authorized Execution                      │────────────▶│            │
 │         │          │                                           │ Account     │            │
 │         │          │                                           │◀────────────│            │
 │         │          │                                           │ Result      │            │
 │         │          │◀──────────────────────────────────────────│             │            │
 │         │◀─────────│ Sanitized Result                          │             │            │
 │◀────────│          │                                           │             │            │
 │ Result  │          │─────────────────────────────────────────────────────────────────────▶│
 │         │          │                         Audit                                     │
```

Use the detailed version in documentation and the simplified one if this diagram goes into the final pitch deck.

---

# 40. Key Audit Events

The sequence should produce approximately:

```text
ACTION_REQUESTED

AGENT_AUTHENTICATED

PERMISSION_CHECK_PASSED

RISK_EVALUATED

AUTHORIZATION_ALLOWED

EXECUTION_STARTED

EXECUTION_SUCCEEDED

RESPONSE_FILTERED
```

You don't need to draw an Audit arrow for every event.

Use important audit interactions and a note:

```text
All security-relevant stages are audited.
```

---

# 41. Security Properties Demonstrated

This scenario demonstrates:

```text
Authenticated agent identity

Agent kill switch

Trusted tool mapping

Permission enforcement

Permission boundaries

Server-side risk assessment

Externalized policy evaluation

OPA decision enforcement

Request integrity

Controlled execution

Output filtering

Complete auditability
```

---

# 42. What This Diagram Does NOT Need

Do not include:

```text
Human approval workflow

Payment idempotency

High-risk transaction handling

Approval expiration

Approval request binding details

Re-authorization after approval
```

Those belong in the payment sequence diagrams.

The purpose of this diagram is to demonstrate the **clean, low-risk happy path**.

---

# 43. Diagram Title

Use:

**AI Agent Governance Platform — Account Read Sequence**

Subtitle:

**Low-risk authorized access to protected banking data**

---

# 44. Core Message

The important distinction is:

```text
Agent selects tool
      ↓
Agent requests action
      ↓
Governance verifies authority
      ↓
OPA decides
      ↓
Governance enforces
      ↓
Tool Executor executes
      ↓
Output is filtered
      ↓
Agent receives result
```

Not:

```text
Agent selects tool
      ↓
Banking API executes
```

The sequence demonstrates the core architecture principle:

> **Tool selection by an AI agent expresses intent; it does not grant authority.**
