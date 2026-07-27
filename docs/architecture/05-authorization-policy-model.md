# Authorization Policy Model

## 1. Overview

This document defines the authorization model used by the **AI Agent Governance and Authorization Gateway**.

The authorization system answers one fundamental question:

> **Can this principal perform this action on this resource under the current context?**

The core model is:

```text
Principal
    +
Action
    +
Resource
    +
Context
    ↓
Authorization Policy
    ↓
Decision
```

The normalized decision is:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

The policy model is intentionally independent of any specific policy technology.

It can later be implemented using:

```text
OPA / Rego

Cedar

Custom Policy Engine

Other Policy Decision Point
```

---

# 2. Why a Policy Model Is Needed

A simple application might contain authorization logic directly inside business code:

```text
if (agent == "PaymentAgent" && amount < 1000) {
    executePayment();
}
```

This creates several problems.

Authorization becomes:

```text
Scattered across application code

Difficult to audit

Difficult to change

Difficult to version

Difficult to explain

Tightly coupled to implementation
```

Instead, we separate:

```text
BUSINESS CODE
```

from:

```text
AUTHORIZATION POLICY
```

The application asks:

```text
Can AGT-001 perform payment.execute
on PAY-1001 under this context?
```

The authorization system decides.

---

# 3. Core Authorization Model

Every authorization request is represented using four primary elements:

```text
┌───────────────────────────────────────┐
│         AUTHORIZATION REQUEST         │
│                                       │
│ Principal                             │
│ Action                                │
│ Resource                              │
│ Context                               │
└───────────────────┬───────────────────┘
                    │
                    ▼
               POLICY ENGINE
                    │
                    ▼
                 DECISION
```

Formally:

```text
AuthorizationDecision =
f(
    Principal,
    Action,
    Resource,
    Context,
    Policies
)
```

---

# 4. Principal

## Definition

The **Principal** represents the identity requesting an action.

In our primary use case, the principal is an AI agent.

Example:

```text
Principal:

AGT-001
PaymentAgent
```

---

## Principal Attributes

A principal may have attributes such as:

```text
ID

Type

Name

Owner

Status

Risk Classification

Environment

Organization
```

Example:

```json
{
  "id": "AGT-001",
  "type": "ai_agent",
  "name": "PaymentAgent",
  "status": "ACTIVE",
  "riskClass": "HIGH"
}
```

---

## Principal Types

The model can eventually support:

```text
AI Agent

Human User

Service Account

Application

Workload
```

For the hackathon, the primary principal type is:

```text
AI_AGENT
```

---

# 5. Agent Identity vs Model Identity

The authorization principal should represent the **agent**, not merely the underlying LLM.

For example:

```text
GPT-based Model
      │
      ├── PaymentAgent
      ├── SupportAgent
      └── FraudAgent
```

All three may use the same model.

However:

```text
PaymentAgent
```

may have:

```text
payment.execute
```

while:

```text
SupportAgent
```

does not.

Therefore:

```text
LLM Model
    ≠
Authorization Principal
```

The governed AI agent is the principal.

---

# 6. Action

## Definition

An **Action** represents an operation the principal wants to perform.

Examples:

```text
account.read

transaction.read

payment.create

payment.execute

card.block

fraud.read
```

---

## Naming Convention

Recommended:

```text
resource.operation
```

Examples:

```text
account.read

payment.execute

policy.modify

agent.disable
```

This provides predictable and extensible naming.

---

## Action Characteristics

Actions may contain metadata such as:

```text
Action ID

Name

Description

Tool

Risk Classification
```

Example:

```text
Action:
payment.execute

Tool:
PaymentService

Risk:
HIGH
```

---

# 7. Resource

## Definition

A **Resource** is the object against which an action is performed.

Examples:

```text
Bank Account

Payment

Transaction

Card

Customer Record
```

Example:

```text
Principal:
PaymentAgent

Action:
account.read

Resource:
ACC-1001
```

---

## Resource Representation

Conceptually:

```json
{
  "type": "account",
  "id": "ACC-1001"
}
```

Resources may also contain trusted attributes.

Example:

```json
{
  "type": "account",
  "id": "ACC-1001",
  "status": "ACTIVE",
  "classification": "CONFIDENTIAL"
}
```

---

# 8. Context

## Definition

**Context** represents additional facts relevant to the authorization decision.

Examples:

```text
Transaction amount

Risk level

Customer authentication state

Human approval state

Time

Environment

Request source

Resource attributes
```

Example:

```json
{
  "amount": 5000,
  "risk": "MEDIUM",
  "customerAuthenticated": true,
  "humanApproval": false
}
```

Context enables:

```text
Context-Aware Authorization
```

rather than relying only on static permissions.

---

# 9. Why Context Matters

Consider:

```text
PaymentAgent

payment.execute
```

A static permission system might simply say:

```text
PaymentAgent has payment.execute

→ ALLOW
```

But real authorization may depend on:

```text
Amount

Risk

Customer Authentication

Beneficiary

Human Approval
```

For example:

```text
₹100 payment
+
LOW risk
+
authenticated customer
        ↓
ALLOW
```

while:

```text
₹10,000 payment
+
MEDIUM risk
+
no approval
        ↓
REQUIRE_APPROVAL
```

and:

```text
₹25,000 payment
+
HIGH risk
        ↓
DENY
```

The action is identical.

The context changes the decision.

---

# 10. Trusted vs Untrusted Context

This distinction is security-critical.

Context can come from two categories.

## Untrusted / Request-Supplied Context

Examples:

```text
Requested payment amount

Requested beneficiary

User-provided description

Agent-generated parameters
```

These values may be useful, but they should not automatically be trusted as security assertions.

---

## Trusted Context

Examples:

```text
Agent status

Verified agent identity

Transaction risk

Human approval status

Permission assignment

Permission boundary

Customer authentication status
```

These should come from trusted system components.

---

# 11. Trusted Context Sources

Example:

```text
                    AUTHORIZATION CONTEXT

Agent Registry ───────────→ Agent Status

Identity System ──────────→ Agent Identity

Risk Service ─────────────→ Risk Level

Approval Service ─────────→ Approval State

Resource Service ─────────→ Resource Attributes

Authentication Service ───→ Customer Authentication
```

The Context Builder combines these into the final authorization request.

---

# 12. Context Spoofing

Suppose an agent sends:

```json
{
  "risk": "LOW",
  "humanApproval": true
}
```

The system must not assume those claims are trustworthy.

Instead:

```text
Agent Claims:
risk = LOW

        X

Trusted Risk Service:
risk = HIGH
```

The trusted value must win.

Similarly:

```text
Agent Claims:
approved = true

        X

Approval Service:
approved = false
```

Result:

```text
approved = false
```

---

# 13. Authorization Request

The normalized authorization request should resemble:

```json
{
  "requestId": "REQ-1001",
  "principal": {
    "type": "ai_agent",
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

This becomes the common contract between:

```text
Governance Gateway
        ↓
Authorization Service
        ↓
Policy Decision Point
```

---

# 14. Policy

## Definition

A **Policy** is a declarative rule describing authorization behavior.

Conceptually:

```text
IF

Principal matches conditions

AND

Action matches conditions

AND

Resource matches conditions

AND

Context satisfies conditions

THEN

Effect
```

---

# 15. Policy Structure

Our logical policy model contains:

```text
Policy ID

Name

Description

Version

Status

Principal Conditions

Action Conditions

Resource Conditions

Context Conditions

Effect

Priority / Conflict Metadata

Owner

Audit Metadata
```

Example:

```text
Policy:
POL-PAYMENT-001

Name:
Allow Low-Risk Payments

Principal:
PaymentAgent

Action:
payment.execute

Condition:
amount < ₹1,000
AND
risk = LOW
AND
customerAuthenticated = true

Effect:
ALLOW
```

---

# 16. Policy Is Not Application Code

This distinction is fundamental.

Application code:

```text
executePayment(...)
```

Policy:

```text
PaymentAgent may execute
low-risk payments below ₹1,000.
```

Therefore:

```text
POLICY
=
Rules about authority
```

while:

```text
CODE
=
Implementation of behavior
```

This separation allows authorization rules to change without changing the agent's business logic.

---

# 17. Policy Effects

Our normalized domain model supports three outcomes:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

---

# 18. ALLOW

Meaning:

> The authorization system permits the request to proceed to the execution layer.

Example:

```text
PaymentAgent

payment.execute

Amount = ₹100

Risk = LOW

Authenticated = true
```

Policy result:

```text
ALLOW
```

The Gateway may then invoke the protected tool.

Important:

```text
ALLOW
≠
Execution succeeded
```

The business operation may still fail.

---

# 19. DENY

Meaning:

> The action must not proceed.

Example:

```text
SupportAgent

payment.execute
```

Result:

```text
DENY
```

The Payment Service must not be invoked.

---

# 20. REQUIRE_APPROVAL

Meaning:

> The action is not currently authorized for execution but may proceed after valid human approval and re-authorization.

Example:

```text
PaymentAgent

payment.execute

Amount = ₹10,000

Risk = MEDIUM
```

Result:

```text
REQUIRE_APPROVAL
```

The Gateway creates an approval request.

---

# 21. Why Approval Is Not ALLOW

This distinction matters.

Bad interpretation:

```text
REQUIRE_APPROVAL
      ↓
Execute now
```

Correct:

```text
REQUIRE_APPROVAL
      ↓
Do NOT execute
      ↓
Human Approval
      ↓
Re-Authorize
      ↓
ALLOW
      ↓
Execute
```

Therefore:

```text
REQUIRE_APPROVAL
```

is a non-execution state.

---

# 22. Default Deny

The authorization system follows:

> **Anything not explicitly authorized is denied.**

Conceptually:

```text
No Applicable Allow
        ↓
DENY
```

Example:

PaymentAgent requests:

```text
loan.approve
```

but no policy permits it.

Result:

```text
DENY
```

---

# 23. Why Default Deny?

Alternative:

```text
No rule found
     ↓
ALLOW
```

would be dangerous because:

```text
New tools

New actions

Policy mistakes

Configuration gaps
```

could automatically create access.

Default deny makes missing configuration safer.

---

# 24. Permission Layer

Before contextual policy evaluation, an agent may have assigned permissions.

Example:

```text
PaymentAgent

account.read

transaction.read

payment.create

payment.execute
```

This represents its potential capability set.

Conceptually:

```text
Requested Action
      ↓
Assigned Permission?
      ↓
YES
      ↓
Policy Evaluation
```

If:

```text
NO
```

the request can be denied early.

---

# 25. Permissions vs Policies

Permissions answer:

> **Can this capability potentially belong to this agent?**

Policies answer:

> **Under what circumstances can the capability actually be exercised?**

Example:

```text
PaymentAgent
has
payment.execute
```

but policy states:

```text
LOW risk
+
small amount
→ ALLOW

MEDIUM risk
+
large amount
→ REQUIRE_APPROVAL

HIGH risk
→ DENY
```

Therefore:

```text
Permission
    ≠
Final Authorization
```

---

# 26. Permission Boundary

A permission boundary defines the maximum capability an agent may receive.

Conceptually:

```text
Assigned Permissions
        ∩
Permission Boundary
        ↓
Effective Permissions
```

Example:

Assigned:

```text
account.read

payment.execute

policy.modify
```

Boundary:

```text
account.read

payment.execute
```

Effective:

```text
account.read

payment.execute
```

`policy.modify` is excluded.

---

# 27. Why Permission Boundaries Matter

Suppose an administrator accidentally grants:

```text
policy.modify
```

to PaymentAgent.

Without a boundary:

```text
Misconfiguration
      ↓
Privilege Escalation
```

With a boundary:

```text
Assigned
policy.modify

        ∩

Boundary does not contain it

        ↓

NOT EFFECTIVE
```

This provides defense in depth.

---

# 28. Authorization Evaluation Pipeline

The complete logical evaluation can be modeled as:

```text
Request
   ↓
Principal Valid?
   │
   ├── NO → DENY
   │
   ▼
Principal Active?
   │
   ├── NO → DENY
   │
   ▼
Action Known?
   │
   ├── NO → DENY
   │
   ▼
Resource Valid?
   │
   ├── NO → DENY / INVALID REQUEST
   │
   ▼
Permission Assigned?
   │
   ├── NO → DENY
   │
   ▼
Within Boundary?
   │
   ├── NO → DENY
   │
   ▼
Trusted Context Available?
   │
   ├── NO → DENY when required
   │
   ▼
Evaluate Policies
   │
   ▼
Resolve Policy Results
   │
   ▼
ALLOW / DENY / REQUIRE_APPROVAL
```

---

# 29. Policy Matching

A policy applies when its target and conditions match the authorization request.

Example policy:

```text
Principal:
PaymentAgent

Action:
payment.execute

Resource:
payment

Conditions:
amount < ₹1,000
risk = LOW
customerAuthenticated = true

Effect:
ALLOW
```

Request:

```text
Principal:
PaymentAgent

Action:
payment.execute

Resource:
PAY-1001

Amount:
₹500

Risk:
LOW

Authenticated:
true
```

Result:

```text
POLICY MATCHES
```

---

# 30. Policy Conditions

Policies may evaluate different categories of attributes.

## Principal Conditions

```text
Agent ID

Agent Type

Agent Owner

Agent Risk Class
```

## Action Conditions

```text
Exact action

Action category

Risk classification
```

## Resource Conditions

```text
Resource ID

Resource type

Resource owner

Classification

Status
```

## Context Conditions

```text
Amount

Risk

Authentication

Approval

Environment

Time
```

---

# 31. Attribute-Based Authorization

The model therefore supports concepts similar to **Attribute-Based Access Control (ABAC)**.

Instead of only:

```text
PaymentAgent
→ payment.execute
```

we can evaluate:

```text
Agent attributes

+

Action attributes

+

Resource attributes

+

Environmental attributes
```

Example:

```text
Agent Type = AI_AGENT

AND

Action = payment.execute

AND

Resource Status = ACTIVE

AND

Risk = LOW

AND

Amount < ₹1,000
```

---

# 32. Role-Based Authorization

The model can also support role-like groupings.

Example:

```text
Agent Role:
PAYMENT_AGENT
```

Policy:

```text
PAYMENT_AGENT

may request

payment.execute
```

However, static roles alone are insufficient for our use case because authorization also depends on dynamic context.

Therefore the architecture favors:

```text
Permission / Role
        +
Attributes
        +
Context
        +
Policy
```

---

# 33. Resource-Level Authorization

Policies should support decisions against specific resources.

Example:

```text
Agent:
CustomerSupportAgent

Action:
account.read

Resource:
Customer A Account
```

may be allowed while access to another resource may be restricted.

This allows future rules such as:

```text
Agent may access accounts
only within its assigned region.
```

or:

```text
Agent may access only resources
belonging to the current customer session.
```

---

# 34. Risk-Aware Authorization

Risk becomes an input to policy.

Example:

```text
Risk Service
      ↓
risk = LOW
      ↓
Authorization
```

Policy:

```text
LOW
→ ALLOW
```

Another:

```text
MEDIUM
→ REQUIRE_APPROVAL
```

Another:

```text
HIGH
→ DENY
```

The Risk Service does not make these decisions.

Policy determines how risk affects authority.

---

# 35. Human Approval Policy

Approval should be represented as trusted authorization context.

Initial request:

```text
humanApproval = false
```

Policy result:

```text
REQUIRE_APPROVAL
```

After approval:

```text
humanApproval = true
```

Re-evaluation:

```text
ALLOW
```

---

# 36. Approval Binding

Approval must be bound to the specific request.

It should conceptually cover:

```text
Approval ID

Request ID

Principal

Action

Resource

Relevant Context

Approver

Timestamp

Expiration
```

Example:

```text
Approval APR-1001

covers:

AGT-001
payment.execute
PAY-1001
₹10,000
```

It must not automatically authorize:

```text
PAY-1002
₹50,000
```

---

# 37. Approval Expiration

Approvals should eventually expire.

Example:

```text
APPROVED
   ↓
Valid for limited execution window
   ↓
EXPIRED
```

This prevents old approvals from being reused indefinitely.

For the MVP, expiration can be simple.

---

# 38. Approval Is Not Permanent Permission

Human approval for:

```text
REQ-1001
```

must not become:

```text
PaymentAgent now permanently
has unrestricted payment.execute.
```

Approval is request-specific.

```text
Approval
=
Temporary authority for
a particular governed request
```

---

# 39. Policy Conflict

Multiple policies may match one request.

Example:

Policy A:

```text
PaymentAgent may execute
payments below ₹1,000.

Effect:
ALLOW
```

Policy B:

```text
Payments with HIGH risk
must not execute.

Effect:
DENY
```

Request:

```text
Amount:
₹500

Risk:
HIGH
```

Both policies could match.

The system therefore requires deterministic conflict resolution.

---

# 40. Recommended Conflict Strategy

For security-sensitive authorization, use:

```text
Explicit DENY
>
REQUIRE_APPROVAL
>
ALLOW
>
Default DENY
```

Conceptually:

```text
Any applicable explicit DENY?
        ↓ YES
       DENY

        ↓ NO

Any applicable REQUIRE_APPROVAL?
        ↓ YES
 REQUIRE_APPROVAL

        ↓ NO

Any applicable ALLOW?
        ↓ YES
       ALLOW

        ↓ NO

  DEFAULT DENY
```

This is the normalized project-level policy behavior.

---

# 41. Example Conflict Resolution

Applicable policies:

```text
Policy A
ALLOW

Policy B
REQUIRE_APPROVAL
```

Result:

```text
REQUIRE_APPROVAL
```

Applicable:

```text
Policy A
ALLOW

Policy B
DENY
```

Result:

```text
DENY
```

Applicable:

```text
None
```

Result:

```text
DENY
```

---

# 42. Why Deny Overrides?

Security policies frequently exist to impose hard restrictions.

Example:

```text
General Policy:

PaymentAgent may execute
payments below ₹1,000.
```

Security policy:

```text
HIGH-risk transactions
must never execute automatically.
```

A ₹500 HIGH-risk transaction should therefore be:

```text
DENY
```

rather than:

```text
ALLOW
```

---

# 43. Hard Deny vs Conditional Approval

Some restrictions should never be bypassed by human approval.

Example:

```text
Agent Status = DISABLED
```

Result:

```text
DENY
```

not:

```text
REQUIRE_APPROVAL
```

Similarly:

```text
Unknown Agent

Unknown Tool

Missing Required Permission

Outside Permission Boundary
```

should generally be treated as hard denial conditions.

---

# 44. Authorization Layers

The final decision can be viewed as multiple layers:

```text
LAYER 1
Identity

      ↓

LAYER 2
Lifecycle State

      ↓

LAYER 3
Capability Permission

      ↓

LAYER 4
Permission Boundary

      ↓

LAYER 5
Trusted Context

      ↓

LAYER 6
Policy

      ↓

LAYER 7
Human Approval

      ↓

FINAL AUTHORIZATION
```

A failure in an earlier mandatory layer should not normally be repaired by a later layer.

For example:

```text
Agent Disabled
+
Human Approved
```

still means:

```text
DENY
```

---

# 45. Example Policy Set

For the banking demo, we can define the following conceptual policies.

## Policy 1 — Account Read

```text
Principal:
PaymentAgent

Action:
account.read

Condition:
Agent ACTIVE

Effect:
ALLOW
```

---

## Policy 2 — Small Low-Risk Payment

```text
Principal:
PaymentAgent

Action:
payment.execute

Conditions:

amount < ₹1,000

risk = LOW

customerAuthenticated = true

Effect:
ALLOW
```

---

## Policy 3 — Large Payment Approval

```text
Principal:
PaymentAgent

Action:
payment.execute

Conditions:

amount >= ₹1,000

risk != HIGH

humanApproval = false

Effect:
REQUIRE_APPROVAL
```

---

## Policy 4 — Approved Large Payment

```text
Principal:
PaymentAgent

Action:
payment.execute

Conditions:

amount >= ₹1,000

risk != HIGH

humanApproval = true

Effect:
ALLOW
```

---

## Policy 5 — High-Risk Payment

```text
Action:
payment.execute

Condition:

risk = HIGH

Effect:
DENY
```

---

## Policy 6 — Support Agent Payment Restriction

```text
Principal:
SupportAgent

Action:
payment.execute

Effect:
DENY
```

---

## Policy 7 — Disabled Agent

```text
Principal Status:
DISABLED

Effect:
DENY
```

This can also be implemented as an early lifecycle check before policy-engine evaluation.

---

# 46. Banking Decision Matrix

A simple decision matrix makes expected behavior explicit.

| Agent                 | Action          |  Amount | Risk   | Approval | Expected         |
| --------------------- | --------------- | ------: | ------ | -------- | ---------------- |
| PaymentAgent          | account.read    |       — | —      | —        | ALLOW            |
| PaymentAgent          | payment.execute |    ₹100 | LOW    | No       | ALLOW            |
| PaymentAgent          | payment.execute |    ₹500 | HIGH   | No       | DENY             |
| PaymentAgent          | payment.execute | ₹10,000 | MEDIUM | No       | REQUIRE_APPROVAL |
| PaymentAgent          | payment.execute | ₹10,000 | MEDIUM | Yes      | ALLOW            |
| PaymentAgent          | payment.execute | ₹25,000 | HIGH   | Yes      | DENY             |
| SupportAgent          | payment.execute |    ₹100 | LOW    | No       | DENY             |
| Disabled PaymentAgent | account.read    |       — | —      | —        | DENY             |

This matrix can later become authorization tests.

---

# 47. Policy Versioning

Policies must be versioned.

Example:

```text
POL-PAYMENT-001

Version 1:
Approval threshold = ₹1,000
```

Later:

```text
Version 2:
Approval threshold = ₹2,000
```

Historical authorization decisions must reference the version used.

Example audit record:

```text
Decision:
REQUIRE_APPROVAL

Policy:
POL-PAYMENT-001

Version:
1
```

---

# 48. Why Version Policies?

Without versioning, an auditor may see:

```text
Transaction denied yesterday.
```

but today's policy says:

```text
Transaction should be allowed.
```

The question becomes:

> Why was it denied?

Policy versioning allows reconstruction of historical decisions.

---

# 49. Policy Lifecycle

Recommended logical lifecycle:

```text
DRAFT
   ↓
VALIDATE
   ↓
ACTIVE
   ↓
SUPERSEDED / INACTIVE
```

Only active policies participate in normal runtime authorization.

---

# 50. Policy Validation

Before activation, policies should be validated for:

```text
Syntax

Required fields

Known actions

Known principal/resource types

Supported conditions

Valid effects
```

Future production systems could additionally perform:

```text
Policy Simulation

Conflict Detection

Impact Analysis

Security Review
```

---

# 51. Policy Ownership

Every policy should have an accountable owner.

Example:

```text
Policy:
POL-PAYMENT-001

Owner:
Payments Security Team

Created By:
Admin-42
```

This supports governance questions such as:

```text
Who created this policy?

Who changed it?

Who approved it?

Which version is active?
```

---

# 52. Policy Change Audit

Changes should generate audit events.

Example:

```text
POLICY_UPDATED

Policy:
POL-PAYMENT-001

Old Version:
2

New Version:
3

Changed By:
Admin-42

Timestamp:
...
```

Authorization governance requires accountability for the policies themselves, not only agent actions.

---

# 53. Explainable Decisions

The authorization system should return more than:

```text
false
```

Recommended:

```json
{
  "decision": "DENY",
  "reason": "Transaction classified as HIGH risk",
  "policyId": "POL-PAYMENT-RISK",
  "policyVersion": 2
}
```

This improves:

```text
Debugging

Auditing

Governance

Human Review

Demo Clarity
```

---

# 54. Decision ID

Every authorization evaluation should receive a unique decision identifier.

Example:

```text
DEC-1001
```

This can be correlated with:

```text
REQ-1001
```

Architecture:

```text
REQ-1001
   │
   ├── Risk Evaluation
   │
   ├── DEC-1001
   │
   ├── Approval APR-1001
   │
   ├── DEC-1002
   │
   └── Tool Execution
```

---

# 55. Policy Evaluation Result

Internally, the policy evaluation may contain:

```json
{
  "effect": "REQUIRE_APPROVAL",
  "reason": "Large payment requires human approval",
  "matchedPolicies": [
    {
      "id": "POL-PAYMENT-002",
      "version": 3
    }
  ]
}
```

The Authorization Service converts this into the system's normalized decision object.

---

# 56. Policy Engine Independence

The domain model should not expose engine-specific concepts unnecessarily.

Bad architecture:

```text
Gateway
 ↓
Rego-specific request
```

Better:

```text
Gateway
 ↓
AuthorizationRequest
 ↓
Authorization Service
 ↓
Policy Adapter
 ↓
OPA / Cedar
```

Therefore:

```text
Principal
Action
Resource
Context
Decision
```

belong to our domain.

```text
Rego Input Document

Cedar Entity UID

OPA Data API
```

belong to adapters.

---

# 57. Mapping to OPA

OPA evaluates structured input using Rego policies.

Our model:

```text
Principal
Action
Resource
Context
```

can become OPA input.

Conceptually:

```json
{
  "principal": {
    "id": "AGT-001"
  },
  "action": "payment.execute",
  "resource": {
    "id": "PAY-1001"
  },
  "context": {
    "amount": 5000,
    "risk": "MEDIUM"
  }
}
```

Rego evaluates this input.

OPA returns policy data.

Our adapter converts that into:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

---

# 58. OPA Responsibility

OPA is a:

```text
POLICY DECISION COMPONENT
```

OPA does not:

```text
Execute payment

Call banking API

Transfer money

Approve human request
```

OPA evaluates policy.

The Governance Gateway enforces the resulting decision.

Therefore:

```text
OPA
=
DECIDES
```

```text
Gateway
=
ENFORCES
```

```text
Payment Service
=
EXECUTES
```

---

# 59. Mapping to Cedar

Cedar is naturally centered around:

```text
Principal

Action

Resource

Context
```

A conceptual Cedar-style authorization request might represent:

```text
Principal:
AI::Agent::"AGT-001"

Action:
Action::"payment.execute"

Resource:
Payment::"PAY-1001"

Context:
amount = 5000
risk = "MEDIUM"
```

Policies then determine whether the request is permitted or forbidden.

Our Policy Engine Adapter translates between our domain model and Cedar's representation.

---

# 60. Cedar Responsibility

Like OPA, Cedar is concerned with authorization decisions.

It does not execute the underlying operation.

Conceptually:

```text
Cedar

Can AGT-001 perform
payment.execute
on PAY-1001?

        ↓

Decision
```

Then:

```text
Governance Gateway
```

enforces that decision.

---

# 61. OPA vs Cedar in Our Architecture

Regardless of engine:

```text
                  GOVERNANCE GATEWAY
                          │
                          ▼
                 AUTHORIZATION SERVICE
                          │
                          ▼
                 POLICY ENGINE ADAPTER
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
              OPA                  CEDAR
               │                     │
               └──────────┬──────────┘
                          ▼
                  NORMALIZED DECISION
```

This keeps the architecture stable.

---

# 62. Important Engine Semantic Difference

Our domain exposes:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

but not every underlying policy engine necessarily models these three outcomes natively in exactly the same way.

Therefore:

```text
Policy Engine Result
        ↓
Adapter / Authorization Service
        ↓
Domain Decision
```

The adapter layer is responsible for reconciling engine-specific semantics with our domain model.

---

# 63. Policy Composition

Large authorization systems should avoid one enormous policy.

Instead, policy concerns can be separated.

Example:

```text
Agent Lifecycle Policy

Permission Policy

Payment Policy

Risk Policy

Approval Policy
```

A request may match several policies.

The authorization layer combines them using deterministic conflict semantics.

---

# 64. Example Composed Evaluation

Request:

```text
PaymentAgent

payment.execute

₹10,000

MEDIUM risk
```

Evaluation:

```text
Agent Lifecycle Policy
→ PASS

Permission Policy
→ PASS

Risk Policy
→ PASS

Payment Policy
→ REQUIRE_APPROVAL

Approval Policy
→ No valid approval
```

Final:

```text
REQUIRE_APPROVAL
```

After human approval:

```text
Agent Lifecycle Policy
→ PASS

Permission Policy
→ PASS

Risk Policy
→ PASS

Payment Policy
→ REQUIRE_APPROVAL CONDITION SATISFIED

Approval Policy
→ APPROVED
```

Final:

```text
ALLOW
```

---

# 65. Policy Categories

Recommended logical categories:

```text
Identity Policies

Lifecycle Policies

Permission Policies

Resource Policies

Risk Policies

Business Authorization Policies

Approval Policies

Security Override Policies
```

These categories are organizational concepts rather than necessarily separate policy-engine constructs.

---

# 66. Security Override Policies

Certain conditions should override normal access.

Examples:

```text
Agent Disabled

Tool Disabled

High-Risk Security Condition

Resource Frozen

Permission Boundary Violation
```

These should result in:

```text
DENY
```

even if another policy would normally allow the action.

---

# 67. Separation from Risk Rules

Risk rules determine:

```text
risk = HIGH
```

Authorization policy determines:

```text
HIGH risk
→ DENY
```

These should remain separate.

Example:

```text
Risk Engine

amount = ₹20,000
new beneficiary = true

      ↓

HIGH
```

then:

```text
Authorization Policy

risk = HIGH

      ↓

DENY
```

This allows risk scoring to evolve without rewriting authorization architecture.

---

# 68. Separation from Business Rules

Consider:

```text
PaymentAgent
```

is authorized to execute a payment.

But the account has insufficient funds.

Authorization:

```text
ALLOW
```

Business Service:

```text
INSUFFICIENT_FUNDS
```

Result:

```text
Execution Failed
```

This is correct.

Authorization should not attempt to replace all business validation.

---

# 69. Policy Test Cases

Policies should be testable independently from agents.

Example:

```text
TEST 1

PaymentAgent
payment.execute
₹100
LOW

Expected:
ALLOW
```

```text
TEST 2

PaymentAgent
payment.execute
₹10,000
MEDIUM
No Approval

Expected:
REQUIRE_APPROVAL
```

```text
TEST 3

PaymentAgent
payment.execute
₹10,000
MEDIUM
Approved

Expected:
ALLOW
```

```text
TEST 4

PaymentAgent
payment.execute
₹100
HIGH

Expected:
DENY
```

```text
TEST 5

SupportAgent
payment.execute
₹100
LOW

Expected:
DENY
```

---

# 70. Why Policy Tests Matter

A policy change can unintentionally expand access.

Example:

```text
Version 3
```

introduces a new condition.

Automated tests can verify:

```text
Previously denied scenarios
remain denied.

Approval scenarios
still require approval.

Known safe scenarios
remain allowed.
```

Policy should therefore be treated with engineering discipline similar to application code.

---

# 71. Policy Simulation

A future production capability could support:

```text
Proposed Policy
      ↓
Historical Requests
      ↓
Simulate Decisions
      ↓
Compare Results
```

Example:

```text
Current Policy:

500 ALLOW
300 DENY
200 APPROVAL
```

Proposed policy:

```text
550 ALLOW
250 DENY
200 APPROVAL
```

This allows administrators to understand policy impact before activation.

Not required for the hackathon MVP.

---

# 72. Policy Decision Flow

The full policy decision process is:

```text
                   ACTION REQUEST
                         │
                         ▼
                VERIFY PRINCIPAL
                         │
                         ▼
                  CHECK STATUS
                         │
                         ▼
                 VALIDATE ACTION
                         │
                         ▼
                VALIDATE RESOURCE
                         │
                         ▼
               CHECK PERMISSION
                         │
                         ▼
              CHECK PERMISSION
                  BOUNDARY
                         │
                         ▼
                COLLECT TRUSTED
                    CONTEXT
                         │
                         ▼
                  ASSESS RISK
                         │
                         ▼
                BUILD AUTHORIZATION
                     REQUEST
                         │
                         ▼
                   MATCH POLICIES
                         │
                         ▼
                 EVALUATE CONDITIONS
                         │
                         ▼
                  RESOLVE CONFLICTS
                         │
                         ▼
               ┌─────────┼─────────┐
               │         │         │
               ▼         ▼         ▼
             ALLOW      DENY    REQUIRE
                                  APPROVAL
               │         │         │
               ▼         ▼         ▼
             EXECUTE    BLOCK    HUMAN
                                  APPROVAL
                                     │
                                     ▼
                               RE-AUTHORIZE
```

---

# 73. Authorization Invariants

The following rules must always remain true.

## Invariant 1

```text
Unknown Principal
→ DENY
```

## Invariant 2

```text
Disabled Principal
→ DENY
```

## Invariant 3

```text
Unknown Action
→ DENY
```

## Invariant 4

```text
Missing Required Permission
→ DENY
```

## Invariant 5

```text
Outside Permission Boundary
→ DENY
```

## Invariant 6

```text
Explicit DENY
overrides
ALLOW
```

## Invariant 7

```text
REQUIRE_APPROVAL
does not permit execution
```

## Invariant 8

```text
Agent cannot self-assert
trusted approval
```

## Invariant 9

```text
Agent cannot self-assert
trusted risk
```

## Invariant 10

```text
No applicable authorization
→ DENY
```

---

# 74. Authorization Decision Matrix

At the highest level:

```text
Identity
   +
Lifecycle
   +
Permission
   +
Boundary
   +
Resource
   +
Context
   +
Risk
   +
Policy
   +
Approval
   ↓
FINAL DECISION
```

Example:

| Identity | Permission | Risk   | Approval | Policy            | Result           |
| -------- | ---------- | ------ | -------- | ----------------- | ---------------- |
| Valid    | Yes        | LOW    | No       | Permit            | ALLOW            |
| Valid    | Yes        | MEDIUM | No       | Approval Required | REQUIRE_APPROVAL |
| Valid    | Yes        | MEDIUM | Yes      | Permit            | ALLOW            |
| Valid    | Yes        | HIGH   | Yes      | Explicit Deny     | DENY             |
| Valid    | No         | LOW    | Yes      | Permit            | DENY             |
| Disabled | Yes        | LOW    | Yes      | Permit            | DENY             |
| Unknown  | —          | —      | —        | —                 | DENY             |

This illustrates that:

```text
Human Approval
```

does not override fundamental authorization boundaries.

---

# 75. Governance Relationship

Authorization policy is only one part of governance.

Governance also controls:

```text
Who registered the agent?

Who owns it?

Who granted permissions?

Who created the policy?

Who changed it?

Who activated it?

Who approved an action?

Who disabled the agent?

What decisions were made?
```

Therefore:

```text
Authorization
=
Can this action happen?
```

while:

```text
Governance
=
Who controls, changed, approved,
and is accountable for that authority?
```

---

# 76. Final Policy Model

The final model is:

```text
                        PRINCIPAL
                            │
                            │
                        requests
                            │
                            ▼
                          ACTION
                            │
                            │
                             on
                            │
                            ▼
                         RESOURCE
                            │
                            │
                     under current
                            │
                            ▼
                         CONTEXT
                            │
                            ▼
              ┌────────────────────────┐
              │ AUTHORIZATION SYSTEM   │
              │                        │
              │ Identity               │
              │ Lifecycle              │
              │ Permissions            │
              │ Permission Boundary    │
              │ Resource Attributes    │
              │ Trusted Context        │
              │ Risk                   │
              │ Policies               │
              │ Approval State         │
              └────────────┬───────────┘
                           │
                           ▼
                    POLICY DECISION
                           │
               ┌───────────┼───────────┐
               │           │           │
               ▼           ▼           ▼
             ALLOW        DENY      REQUIRE
                                    APPROVAL
               │           │           │
               ▼           ▼           ▼
            EXECUTE       BLOCK       HUMAN
                                        │
                                        ▼
                                     APPROVE
                                        │
                                        ▼
                                  RE-AUTHORIZE
```

---

# 77. Core Takeaway

The authorization system can ultimately be expressed as:

```text
Can

PRINCIPAL

perform

ACTION

on

RESOURCE

under

CONTEXT

?
```

The answer is determined by external policy:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

not by the AI agent itself.

The most important separation is:

```text
AI AGENT
=
WHAT DO I WANT TO DO?
```

```text
AUTHORIZATION POLICY
=
AM I ALLOWED TO DO IT?
```

```text
GOVERNANCE GATEWAY
=
WILL THE SYSTEM LET IT HAPPEN?
```

```text
ENTERPRISE SERVICE
=
HOW IS IT ACTUALLY DONE?
```

This creates the central security boundary of the project:

> **AI agents may autonomously decide what actions to propose, but the authority to perform those actions remains external, deterministic, policy-controlled, and auditable.**
