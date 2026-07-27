# 07 — Sequence Diagram: Payment Allow

## Purpose

This sequence diagram demonstrates a successful **state-changing financial action**.

Scenario:

> A Payment AI Agent requests a $250 payment. The agent is authenticated, has `payment.execute`, the payment is inside its permission boundary, the risk engine classifies it as LOW, OPA returns `ALLOW`, and the payment executes successfully.

Unlike `account.read`, this action changes financial state.

Therefore additional controls become important:

```text
Request Fingerprint
Idempotency
Risk Assessment
Policy Limits
Final Execution Validation
Financial Audit Trail
```

---

# 1. Scenario

Assume:

```text
Agent:
PaymentAgent

Agent ID:
AGT-002

Status:
ACTIVE

Tool:
execute_payment

Canonical Action:
payment.execute

Amount:
$250

Currency:
USD

Source Account:
ACC-1001

Destination:
MERCHANT-501

Risk:
LOW
```

Agent permission:

```text
payment.execute
```

Permission boundary:

```text
payment.execute

Maximum autonomous amount:
$500
```

Policy:

```text
Payments <= $500
AND
Risk = LOW
AND
Agent has payment.execute

→ ALLOW
```

Therefore:

```text
Decision = ALLOW
```

No human approval is required.

---

# 2. Participants

Use these participants from left to right:

```text
User / Business System

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

Banking Payment API

Audit Service
```

Optionally add:

```text
Idempotency Store
```

But for the MVP, this can remain inside the Governance Backend.

---

# 3. High-Level Sequence

The core sequence is:

```text
User
 ↓
AI Agent
 ↓
Governance Gateway
 ↓
Authenticate
 ↓
Resolve Tool
 ↓
Permission Check
 ↓
Risk Assessment
 ↓
OPA
 ↓
ALLOW
 ↓
Integrity + Idempotency
 ↓
Tool Executor
 ↓
Payment API
 ↓
Audit
 ↓
Result
```

---

# 4. User Requests Payment

Example:

```text
"Pay $250 from ACC-1001
to MERCHANT-501."
```

Sequence:

```text
User
 │
 │ Payment request
 ▼
AI Agent
```

---

# 5. Agent Selects Tool

The agent determines:

```text
Tool:
execute_payment
```

with arguments:

```json
{
  "sourceAccountId": "ACC-1001",
  "destinationId": "MERCHANT-501",
  "amount": 250,
  "currency": "USD"
}
```

Show a self-call:

```text
AI Agent
   │
   ├────────────────┐
   │ Select         │
   │ execute_payment│
   ◀────────────────┘
```

Important:

```text
Tool Selection
≠
Authorization
```

---

# 6. Agent Sends Governed Action

The agent does not call the Banking Payment API.

Instead:

```text
AI Agent
    │
    │ Payment Action Request
    ▼
Governance Gateway
```

Conceptually:

```json
{
  "tool": "execute_payment",
  "resource": {
    "type": "payment"
  },
  "arguments": {
    "sourceAccountId": "ACC-1001",
    "destinationId": "MERCHANT-501",
    "amount": 250,
    "currency": "USD"
  }
}
```

---

# 7. Create Action Request

Governance creates:

```text
Request ID:
REQ-2001

Status:
PENDING

Timestamp:
...

Correlation ID:
...
```

Then:

```text
Governance Gateway
       │
       │ ACTION_REQUESTED
       ▼
Audit Service
```

---

# 8. Authenticate Agent

```text
Governance Gateway
       │
       │ Verify Credential
       ▼
Authentication
```

Authentication returns:

```text
Principal Type:
AGENT

Principal:
AGT-002

Authenticated:
true
```

The trusted principal is derived from authentication, not from an arbitrary request field.

---

# 9. Verify Agent Status

```text
Governance Gateway
       │
       │ Get AGT-002
       ▼
Agent Registry
```

Response:

```text
AGT-002

PaymentAgent

ACTIVE
```

If:

```text
DISABLED
```

then immediately:

```text
DENY

Reason:
AGENT_DISABLED
```

---

# 10. Resolve Tool

Governance asks:

```text
Governance Gateway
       │
       │ Resolve execute_payment
       ▼
Tool Registry
```

Tool Registry returns:

```text
Tool:
execute_payment

Status:
ENABLED

Canonical Action:
payment.execute

Resource:
payment

Target:
Banking Payment API

Input Schema:
PaymentInput
```

This mapping must come from the trusted Tool Registry.

The agent cannot declare:

```text
"This tool is safe."
```

or:

```text
"This tool requires account.read."
```

Governance owns that mapping.

---

# 11. Validate Payment Arguments

Governance validates:

```text
sourceAccountId

destinationId

amount

currency
```

against the registered tool schema.

Example validation:

```text
amount > 0

currency supported

source account present

destination present
```

Result:

```text
VALID
```

Invalid input results in:

```text
DENY

INVALID_TOOL_ARGUMENTS
```

---

# 12. Canonicalize Security-Relevant Input

Governance builds:

```text
Principal:
AGT-002

Action:
payment.execute

Source:
ACC-1001

Destination:
MERCHANT-501

Amount:
$250

Currency:
USD
```

This becomes the canonical authorization request.

---

# 13. Generate Request Fingerprint

Calculate:

```text
SHA-256(
    principal
    +
    action
    +
    sourceAccount
    +
    destination
    +
    amount
    +
    currency
)
```

Result:

```text
FP-PAY-ABC123
```

Conceptually:

```text
AGT-002
+
payment.execute
+
ACC-1001
+
MERCHANT-501
+
250
+
USD

       ↓

Canonical Representation

       ↓

SHA-256

       ↓

FP-PAY-ABC123
```

---

# 14. Why Amount Must Be Fingerprinted

Suppose authorization evaluated:

```text
Amount:
$250
```

but after authorization the request changes to:

```text
Amount:
$25,000
```

Without request binding:

```text
ALLOW $250
    ↓
Modify request
    ↓
Execute $25,000
```

That must never be possible.

Therefore:

```text
Authorization Fingerprint
=
Execution Fingerprint
```

must be verified.

---

# 15. Generate / Validate Idempotency Key

Financial operations need protection against duplicate execution.

Example:

```text
Idempotency Key:
IDEMP-PAY-9001
```

Governance checks:

```text
Has this idempotency key
already executed?
```

For this scenario:

```text
NO
```

Continue.

---

# 16. Why Idempotency Matters

Imagine:

```text
Agent sends payment
        ↓
Payment succeeds
        ↓
Network timeout occurs
        ↓
Agent retries
```

Without idempotency:

```text
$250 payment
+
$250 retry

=
$500 transferred
```

With idempotency:

```text
Same Idempotency Key
        ↓
Recognize same operation
        ↓
Do not execute twice
```

This is particularly important for state-changing financial actions.

---

# 17. Permission Check

Governance asks:

```text
Governance Gateway
       │
       │ Can AGT-002 perform payment.execute?
       ▼
Permission Service
```

Assigned:

```text
payment.execute
```

Result:

```text
PERMITTED
```

---

# 18. Permission Boundary

Next check the maximum authority.

Example:

```text
Agent Permission:

payment.execute


Boundary:

payment.execute
maximumAmount = $500
```

Requested:

```text
$250
```

Therefore:

```text
$250 <= $500

PASS
```

Conceptually:

```text
Assigned Authority
       ∩
Permission Boundary
       =
Effective Authority
```

---

# 19. Boundary Failure Alternative

If request were:

```text
$750
```

while boundary were:

```text
$500
```

then:

```text
DENY

OUTSIDE_PERMISSION_BOUNDARY
```

The request would not reach the Banking API.

For this diagram, however:

```text
$250
```

passes.

---

# 20. Risk Assessment

Governance calls:

```text
Governance Gateway
       │
       │ Assess Payment Risk
       ▼
Risk Engine
```

Risk Engine may consider:

```text
Amount

Agent

Source account

Destination

Transaction frequency

Recent activity

Historical behavior

Known risk signals
```

For the demo:

```text
Amount:
$250

Destination:
Known merchant

Velocity:
Normal

Agent:
Trusted registered payment agent
```

Result:

```text
LOW
```

---

# 21. Risk Is Trusted Server Context

Do not allow:

```json
{
  "risk": "LOW"
}
```

from the agent to determine authorization.

Instead:

```text
Payment Request
      ↓
Risk Engine
      ↓
LOW
```

The policy engine receives the internally calculated risk result.

---

# 22. Authorization Request

Governance calls Authorization Service:

```text
Governance Gateway
       │
       │ Authorize
       ▼
Authorization Service
```

Trusted context:

```text
Principal:
AGT-002

Action:
payment.execute

Source:
ACC-1001

Destination:
MERCHANT-501

Amount:
$250

Permission:
PASS

Boundary:
PASS

Risk:
LOW

Approval:
false

Fingerprint:
FP-PAY-ABC123
```

---

# 23. Authorization Service Calls OPA

```text
Authorization Service
       │
       │ Evaluate Policy
       ▼
OPA
```

OPA receives structured policy input.

Conceptually:

```json
{
  "principal": {
    "type": "AGENT",
    "id": "AGT-002"
  },
  "action": "payment.execute",
  "resource": {
    "type": "payment"
  },
  "context": {
    "amount": 250,
    "currency": "USD",
    "risk": "LOW",
    "approval": false
  }
}
```

---

# 24. Example Policy Logic

Conceptually:

```text
IF

agent has payment.execute

AND

amount <= $500

AND

risk == LOW

THEN

ALLOW
```

Another policy could say:

```text
IF

amount > $500

THEN

REQUIRE_APPROVAL
```

And:

```text
IF

risk == HIGH

THEN

DENY
```

For this request:

```text
Amount = $250

Risk = LOW
```

Therefore:

```text
ALLOW
```

---

# 25. OPA Returns ALLOW

Sequence:

```text
OPA
 │
 │ ALLOW
 ▼
Authorization Service
```

OPA does not call the payment system.

It only returns a decision.

```text
OPA

DECIDES
───────

Tool Executor

EXECUTES
```

This distinction should be visible in the diagram.

---

# 26. Authorization Decision Recorded

Authorization Service/Gateway stores:

```text
Decision:
ALLOW

Reason:
POLICY_ALLOWED

Risk:
LOW

Policy:
payment-policy

Policy Version:
1

Fingerprint:
FP-PAY-ABC123
```

Then:

```text
Governance Gateway
       │
       │ AUTHORIZATION_ALLOWED
       ▼
Audit Service
```

---

# 27. Final Pre-Execution Checks

Even after `ALLOW`, do not immediately send the payment.

Tool Executor verifies:

```text
Agent still ACTIVE?

Tool still ENABLED?

Authorization valid?

Fingerprint matches?

Idempotency key unused?

Request not expired?
```

Show:

```text
Governance Gateway
       │
       │ Authorized Execution
       ▼
Tool Executor

Tool Executor
       │
       ├────────────────────┐
       │ Final Enforcement  │
       │ Checks             │
       ◀────────────────────┘
```

---

# 28. Fingerprint Verification

Current execution request:

```text
FP-PAY-ABC123
```

Authorization:

```text
FP-PAY-ABC123
```

Therefore:

```text
MATCH
```

Continue.

If:

```text
FP-PAY-ABC123
≠
FP-PAY-XYZ999
```

then:

```text
DENY

REQUEST_MODIFIED
```

---

# 29. Idempotency Verification

Tool Executor checks:

```text
IDEMP-PAY-9001
```

Result:

```text
NOT PREVIOUSLY EXECUTED
```

Continue.

---

# 30. Record Execution Started

Before calling the bank:

```text
Tool Executor
      │
      │ EXECUTION_STARTED
      ▼
Audit Service
```

Record:

```text
Request ID:
REQ-2001

Action:
payment.execute

Fingerprint:
FP-PAY-ABC123

Target:
Banking Payment API
```

---

# 31. Execute Payment

Only now:

```text
Tool Executor
      │
      │ POST /payments
      ▼
Banking Payment API
```

Conceptual payload:

```json
{
  "sourceAccountId": "ACC-1001",
  "destinationId": "MERCHANT-501",
  "amount": 250,
  "currency": "USD",
  "idempotencyKey": "IDEMP-PAY-9001"
}
```

The Banking API receives the request from the trusted execution layer, **not directly from the AI agent**.

---

# 32. Banking API Processes Payment

Banking service:

```text
Validate account

Validate balance

Validate destination

Create payment

Update transaction state
```

Then returns:

```text
Payment ID:
PAY-5001

Status:
SUCCESS

Amount:
$250
```

Sequence:

```text
Banking Payment API
       │
       │ Payment Successful
       ▼
Tool Executor
```

---

# 33. Mark Idempotency Key Completed

After successful execution:

```text
IDEMP-PAY-9001
      ↓
COMPLETED
```

associated with:

```text
PAY-5001

FP-PAY-ABC123
```

A retry with the same key can now return the existing result instead of creating another payment.

---

# 34. Record Execution Result

Tool Executor records:

```text
Execution:
SUCCEEDED

Payment:
PAY-5001

Response:
200 / 201

Completed At:
...
```

Then:

```text
Tool Executor
      │
      │ EXECUTION_SUCCEEDED
      ▼
Audit Service
```

---

# 35. Return Governed Result

```text
Tool Executor
      │
      │ Payment Result
      ▼
Governance Gateway
```

Gateway returns:

```text
Governance Gateway
       │
       │ SUCCESS
       ▼
AI Agent
```

Conceptual response:

```json
{
  "requestId": "REQ-2001",
  "status": "SUCCEEDED",
  "paymentId": "PAY-5001",
  "amount": 250,
  "currency": "USD"
}
```

---

# 36. Agent Responds

```text
AI Agent
    │
    │ Payment completed successfully
    ▼
User
```

Example:

```text
The $250 payment was completed successfully.

Payment ID: PAY-5001
```

---

# 37. Complete Sequence

Build the main sequence approximately as:

```text
User    Agent    Gateway    Auth    Registry    ToolReg    Permission    Risk    AuthZ    OPA    Executor    Bank    Audit
 │        │         │         │         │          │           │          │       │       │        │        │       │
 │───────▶│         │         │         │          │           │          │       │       │        │        │       │
 │Payment │         │         │         │          │           │          │       │       │        │        │       │
 │        │────────▶│         │         │          │           │          │       │       │        │        │       │
 │        │ Action  │         │         │          │           │          │       │       │        │        │       │
 │        │         │─────────────────────────────────────────────────────────────────────────────────────────────▶│
 │        │         │ ACTION_REQUESTED                                                                         │
 │        │         │───────▶│         │          │           │          │       │       │        │        │       │
 │        │         │ Auth   │         │          │           │          │       │       │        │        │       │
 │        │         │◀───────│         │          │           │          │       │       │        │        │       │
 │        │         │ AGT-002│         │          │           │          │       │       │        │        │       │
 │        │         │─────────────────▶│          │           │          │       │       │        │        │       │
 │        │         │ Agent Status     │          │           │          │       │       │        │        │       │
 │        │         │◀─────────────────│          │           │          │       │       │        │        │       │
 │        │         │ ACTIVE           │          │           │          │       │       │        │        │       │
 │        │         │────────────────────────────▶│           │          │       │       │        │        │       │
 │        │         │ Resolve Tool                 │           │          │       │       │        │        │       │
 │        │         │◀────────────────────────────│           │          │       │       │        │        │       │
 │        │         │ payment.execute             │           │          │       │       │        │        │       │
 │        │         │────────────────────────────────────────▶│          │       │       │        │        │       │
 │        │         │ Permission + Boundary                   │          │       │       │        │        │       │
 │        │         │◀────────────────────────────────────────│          │       │       │        │        │       │
 │        │         │ PASS                                           │       │       │        │        │       │
 │        │         │────────────────────────────────────────────────▶│       │       │        │        │       │
 │        │         │ Risk Assessment                                 │       │       │        │        │       │
 │        │         │◀────────────────────────────────────────────────│       │       │        │        │       │
 │        │         │ LOW                                                     │       │        │        │       │
 │        │         │────────────────────────────────────────────────────────▶│       │        │        │       │
 │        │         │ Authorize                                                       │        │        │       │
 │        │         │                                                                │───────▶│        │       │
 │        │         │                                                                │ Policy │        │       │
 │        │         │                                                                │◀───────│        │       │
 │        │         │                                                                │ ALLOW  │        │       │
 │        │         │◀───────────────────────────────────────────────────────────────│        │        │       │
 │        │         │ ALLOW                                                                   │        │       │
 │        │         │─────────────────────────────────────────────────────────────────────────────────────────────▶│
 │        │         │ AUTHORIZATION_ALLOWED                                                                       │
 │        │         │────────────────────────────────────────────────────────────────────────▶│        │       │
 │        │         │ Authorized Execution                                                     │        │       │
 │        │         │                                                                          │───────▶│       │
 │        │         │                                                                          │Payment │       │
 │        │         │                                                                          │◀───────│       │
 │        │         │                                                                          │SUCCESS │       │
 │        │         │                                                                          │───────────────▶│
 │        │         │                                                                          │ EXECUTION_OK   │
 │        │         │◀─────────────────────────────────────────────────────────────────────────│        │       │
 │        │         │ Payment Result                                                           │        │       │
 │        │◀────────│                                                                          │        │       │
 │        │ SUCCESS │                                                                          │        │       │
 │◀───────│         │                                                                          │        │       │
 │Result  │         │                                                                          │        │       │
```

---

# 38. Recommended `alt` Blocks

Use only a few alternatives so the diagram remains readable.

### Authentication Failure

```text
alt Authentication Failed

    DENY
    Audit
    Return Error

end
```

### Permission Failure

```text
alt Permission / Boundary Failed

    DENY
    Audit
    Return Error

end
```

### Policy Decision

```text
alt OPA = DENY

    Audit DENIED
    Return DENIED

else OPA = ALLOW

    Continue Execution

end
```

### Payment API Failure

```text
alt Banking API Failed

    Execution = FAILED
    Audit Failure
    Return Failure

else Payment Successful

    Execution = SUCCEEDED
    Audit Success
    Return Result

end
```

---

# 39. Idempotency Retry Alternative

A useful small note:

```text
alt Duplicate Idempotency Key

    Existing Successful Payment Found

    DO NOT execute payment again

    Return previous result

end
```

This is a strong financial-system design detail to mention during judging.

---

# 40. Important Audit Events

The lifecycle should generate:

```text
ACTION_REQUESTED

AGENT_AUTHENTICATED

TOOL_RESOLVED

PERMISSION_CHECK_PASSED

BOUNDARY_CHECK_PASSED

RISK_EVALUATED

AUTHORIZATION_ALLOWED

EXECUTION_STARTED

PAYMENT_SUCCEEDED

EXECUTION_SUCCEEDED
```

The exact implementation does not need a separate network call for every event.

---

# 41. Security Controls Demonstrated

This diagram demonstrates:

```text
Authenticated machine identity

Agent kill switch

Trusted tool registry

Input validation

Permission enforcement

Permission boundaries

Risk-based authorization

OPA policy evaluation

Request fingerprinting

Idempotent financial execution

Final execution-time validation

Protected service isolation

Auditability
```

---

# 42. Account Read vs Payment

The important architectural difference is:

```text
ACCOUNT READ

Permission
   ↓
Risk
   ↓
Policy
   ↓
Read
```

versus:

```text
PAYMENT

Permission
   ↓
Boundary
   ↓
Risk
   ↓
Policy
   ↓
Fingerprint
   ↓
Idempotency
   ↓
Final Validation
   ↓
Financial Execution
```

State-changing actions require stronger controls.

---

# 43. Why No Human Approval Here?

This payment is:

```text
$250
```

and policy allows autonomous payments up to:

```text
$500
```

with:

```text
Risk = LOW
```

Therefore:

```text
$250 <= $500
AND
LOW risk

        ↓

ALLOW
```

Human approval would unnecessarily slow down a low-risk action that policy explicitly permits.

This demonstrates that governance doesn't mean:

```text
Human approves everything.
```

Instead:

```text
Low Risk
   ↓
Automate

Medium / Sensitive
   ↓
Human Approval

High / Prohibited
   ↓
Deny
```

---

# 44. Important Separation

Show a note near OPA:

```text
OPA
 │
 │ ALLOW
 ▼
Governance Platform
 │
 │ enforce decision
 ▼
Tool Executor
 │
 │ execute
 ▼
Banking API
```

Never:

```text
OPA
 │
 ▼
Banking API
```

OPA is the **Policy Decision Point**.

Tool Executor/Governance Gateway is the **Policy Enforcement Point**.

---

# 45. Key Integrity Principle

Place near the execution section:

```text
AUTHORIZED REQUEST

Fingerprint:
FP-PAY-ABC123

       │
       ▼

EXECUTION REQUEST

Fingerprint:
FP-PAY-ABC123

       │
       ▼

MATCH

       │
       ▼

EXECUTE
```

If they differ:

```text
MISMATCH
   ↓
DENY
```

---

# 46. Key Idempotency Principle

Place another annotation:

```text
Payment Intent

      ↓

Idempotency Key

      ↓

First Request
→ Execute

Retry
→ Return Existing Result

      ↓

Never Pay Twice
```

---

# 47. Judge-Friendly Simplified Sequence

For presentation:

```text
Agent       Governance       Risk       OPA       Executor       Bank
 │              │             │          │            │           │
 │─────────────▶│             │          │            │           │
 │ Pay $250     │             │          │            │           │
 │              │────────────▶│          │            │           │
 │              │ Assess Risk │          │            │           │
 │              │◀────────────│          │            │           │
 │              │ LOW         │          │            │           │
 │              │───────────────────────▶│            │           │
 │              │ Policy Evaluation     │            │           │
 │              │◀───────────────────────│            │           │
 │              │ ALLOW                              │           │
 │              │───────────────────────────────────▶│           │
 │              │ Authorized Execution               │──────────▶│
 │              │                                    │ Pay $250  │
 │              │                                    │◀──────────│
 │              │                                    │ SUCCESS   │
 │              │◀───────────────────────────────────│           │
 │◀─────────────│                                    │           │
 │ SUCCESS      │                                    │           │
```

Explain verbally:

> The agent can request a payment, but it cannot execute one directly. Governance verifies identity, permissions, boundaries and risk. OPA decides whether policy permits the exact request. The authorized request is cryptographically bound to execution, and idempotency prevents duplicate financial operations.

---

# 48. Diagram Title

Use:

**AI Agent Governance Platform — Payment Authorization Sequence**

Subtitle:

**Low-risk autonomous payment with policy-controlled execution**

---

# 49. Core Message

The sequence demonstrates:

```text
AI Intent
   ↓
Authenticated Identity
   ↓
Trusted Tool Mapping
   ↓
Permission
   ↓
Boundary
   ↓
Risk
   ↓
Policy
   ↓
ALLOW
   ↓
Integrity Verification
   ↓
Idempotency
   ↓
Controlled Execution
   ↓
Audit
```

The central rule remains:

> **The AI agent may decide what it wants to do, but the governance layer decides what it is allowed to do.**

And for financial actions:

> **Authorization must apply to the exact transaction that is eventually executed.**
