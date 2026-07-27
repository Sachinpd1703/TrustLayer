# 08 — Sequence Diagram: Payment Requiring Human Approval

## Purpose

This sequence demonstrates what happens when an AI agent requests a valid action that it **cannot autonomously execute**.

Scenario:

> PaymentAgent requests a $2,500 payment. The agent has `payment.execute`, but policy allows autonomous payments only up to $500. The request is classified as MEDIUM risk, so OPA returns `REQUIRE_APPROVAL`.

A human approves the payment.

However:

```text id="apq01"
Human Approval
≠
Immediate Execution
```

Instead:

```text id="apq02"
Human Approval
      ↓
Refresh Security Context
      ↓
Re-Authorization
      ↓
OPA
      ↓
ALLOW
      ↓
Integrity Verification
      ↓
Controlled Execution
```

This prevents human approval from becoming a security bypass.

---

# 1. Scenario

Assume:

```text id="apq03"
Agent:
PaymentAgent

Agent ID:
AGT-002

Status:
ACTIVE

Action:
payment.execute

Amount:
$2,500

Source:
ACC-1001

Destination:
MERCHANT-501

Risk:
MEDIUM
```

Agent has:

```text id="apq04"
payment.execute
```

Policy:

```text id="apq05"
$0 – $500
LOW risk
→ ALLOW

$501 – $5,000
LOW/MEDIUM risk
→ REQUIRE_APPROVAL

HIGH risk
→ DENY
```

Therefore:

```text id="apq06"
$2,500
+
MEDIUM risk

      ↓

REQUIRE_APPROVAL
```

---

# 2. Participants

Use these participants:

```text id="apq07"
User / Business System

AI Agent

Governance Gateway

Permission Service

Risk Engine

Authorization Service

OPA

Approval Service

Human Approver

Tool Executor

Banking Payment API

Audit Service
```

You can omit Authentication, Agent Registry and Tool Registry from this sequence to prevent the diagram from becoming excessively wide.

Add a note:

```text id="apq08"
Authentication, agent status and tool
validation occur before authorization.
```

---

# 3. High-Level Flow

```text id="apq09"
AI Agent
   │
   │ Request $2,500 payment
   ▼
Governance Gateway
   │
   ├── Permission Check
   │
   ├── Risk Assessment
   │
   └── OPA Evaluation
           │
           ▼
    REQUIRE_APPROVAL
           │
           ▼
     Approval Service
           │
           ▼
      Human Approver
           │
           ▼
        APPROVED
           │
           ▼
      Re-Authorize
           │
           ▼
          OPA
           │
           ▼
         ALLOW
           │
           ▼
   Integrity Verification
           │
           ▼
      Tool Executor
           │
           ▼
      Banking API
```

---

# 4. User Requests Payment

```text id="apq10"
User
 │
 │ Pay $2,500
 ▼
AI Agent
```

Example:

```text id="apq11"
"Pay $2,500 from ACC-1001
to MERCHANT-501."
```

---

# 5. Agent Selects Payment Tool

The agent selects:

```text id="apq12"
execute_payment
```

Arguments:

```json id="apq13"
{
  "sourceAccountId": "ACC-1001",
  "destinationId": "MERCHANT-501",
  "amount": 2500,
  "currency": "USD"
}
```

Then:

```text id="apq14"
AI Agent
    │
    │ Governed Payment Request
    ▼
Governance Gateway
```

---

# 6. Governance Creates Request

Create:

```text id="apq15"
Request:
REQ-2002

Status:
PENDING

Idempotency:
IDEMP-PAY-9002
```

Audit:

```text id="apq16"
Governance Gateway
       │
       │ ACTION_REQUESTED
       ▼
Audit Service
```

---

# 7. Canonical Request

After authentication, agent-status validation, tool resolution and input validation, governance has:

```text id="apq17"
Principal:
AGT-002

Action:
payment.execute

Source:
ACC-1001

Destination:
MERCHANT-501

Amount:
$2,500

Currency:
USD
```

---

# 8. Generate Request Fingerprint

Generate:

```text id="apq18"
Fingerprint:
FP-PAY-2500-XYZ
```

Security-relevant values are included:

```text id="apq19"
AGT-002

payment.execute

ACC-1001

MERCHANT-501

2500

USD
```

The fingerprint will later bind:

```text id="apq20"
Original Request
      =
Approval
      =
Authorization
      =
Execution
```

---

# 9. Permission Check

```text id="apq21"
Governance Gateway
       │
       │ payment.execute?
       ▼
Permission Service
```

Response:

```text id="apq22"
PERMITTED
```

The agent has the fundamental capability to perform payments.

This is important.

If the agent had no `payment.execute` permission, the system should:

```text id="apq23"
DENY
```

not:

```text id="apq24"
REQUIRE_APPROVAL
```

Human approval should not grant capabilities the agent never possessed.

---

# 10. Permission vs Approval

Important principle:

```text id="apq25"
NO PERMISSION
     ↓
DENY
```

not:

```text id="apq26"
NO PERMISSION
     ↓
Ask Human
     ↓
ALLOW
```

Approval provides additional authorization for a sensitive operation.

It does not magically create missing base permissions.

---

# 11. Risk Assessment

```text id="apq27"
Governance Gateway
       │
       │ Assess Risk
       ▼
Risk Engine
```

Risk engine evaluates:

```text id="apq28"
Amount

Destination

Transaction velocity

Agent history

Account context

Risk signals
```

Result:

```text id="apq29"
MEDIUM
```

Response:

```text id="apq30"
Risk Engine
      │
      │ MEDIUM
      ▼
Governance Gateway
```

---

# 12. Initial Authorization

Governance sends:

```text id="apq31"
Governance Gateway
       │
       │ Authorize
       ▼
Authorization Service
```

Trusted context:

```text id="apq32"
Agent:
AGT-002

Action:
payment.execute

Amount:
$2,500

Permission:
PASS

Risk:
MEDIUM

Human Approval:
false

Fingerprint:
FP-PAY-2500-XYZ
```

---

# 13. OPA Initial Evaluation

```text id="apq33"
Authorization Service
       │
       │ Policy Input
       ▼
OPA
```

Conceptual policy:

```text id="apq34"
IF

action = payment.execute

AND

amount > $500

AND

amount <= $5,000

AND

risk != HIGH

AND

approved = false

THEN

REQUIRE_APPROVAL
```

---

# 14. OPA Returns REQUIRE_APPROVAL

```text id="apq35"
OPA
 │
 │ REQUIRE_APPROVAL
 ▼
Authorization Service
```

Then:

```text id="apq36"
Authorization Service
       │
       │ REQUIRE_APPROVAL
       ▼
Governance Gateway
```

Record:

```text id="apq37"
Decision:
REQUIRE_APPROVAL

Policy:
payment-policy

Version:
1

Risk:
MEDIUM
```

---

# 15. Audit Initial Decision

```text id="apq38"
Governance Gateway
       │
       │ APPROVAL_REQUIRED
       ▼
Audit Service
```

At this point:

```text id="apq39"
NO PAYMENT HAS OCCURRED
```

This should be clear in the diagram.

---

# 16. Create Approval Request

Gateway calls:

```text id="apq40"
Governance Gateway
       │
       │ Create Approval
       ▼
Approval Service
```

Approval Service creates:

```text id="apq41"
Approval ID:
APR-1001

Request:
REQ-2002

Agent:
AGT-002

Action:
payment.execute

Amount:
$2,500

Risk:
MEDIUM

Fingerprint:
FP-PAY-2500-XYZ

Status:
PENDING

Expires:
...
```

---

# 17. Approval Must Be Bound to Exact Request

This is critical.

Store:

```text id="apq42"
Approval Request

Fingerprint:
FP-PAY-2500-XYZ
```

Therefore approval means:

> Approve this exact $2,500 payment from this source to this destination.

It does **not** mean:

> PaymentAgent may now execute any payment.

---

# 18. Notify Human Approver

```text id="apq43"
Approval Service
       │
       │ Approval Required
       ▼
Human Approver
```

The approval UI should show enough context:

```text id="apq44"
Agent:
PaymentAgent

Action:
Execute Payment

Amount:
$2,500

Source:
ACC-1001

Destination:
MERCHANT-501

Risk:
MEDIUM

Reason:
Amount exceeds autonomous threshold
```

The approver should not see only:

```text id="apq45"
Approve?

YES / NO
```

without context.

---

# 19. Agent Receives Pending State

Meanwhile:

```text id="apq46"
Governance Gateway
       │
       │ PENDING_APPROVAL
       ▼
AI Agent
```

The agent should not repeatedly execute the payment.

It can receive:

```json id="apq47"
{
  "requestId": "REQ-2002",
  "status": "PENDING_APPROVAL",
  "approvalId": "APR-1001"
}
```

---

# 20. Human Reviews Request

```text id="apq48"
Human Approver
       │
       ├────────────────┐
       │ Review         │
       │ transaction    │
       ◀────────────────┘
```

The human can choose:

```text id="apq49"
APPROVE

REJECT
```

or the request can:

```text id="apq50"
EXPIRE
```

---

# 21. Human Approves

For this scenario:

```text id="apq51"
Human Approver
       │
       │ APPROVE APR-1001
       ▼
Approval Service
```

Approval Service authenticates the human and records:

```text id="apq52"
Status:
APPROVED

Approved By:
USR-APPROVER-01

Approved At:
...

Fingerprint:
FP-PAY-2500-XYZ
```

---

# 22. Audit Approval

```text id="apq53"
Approval Service
       │
       │ APPROVAL_APPROVED
       ▼
Audit Service
```

Audit should answer:

```text id="apq54"
Who approved?

What did they approve?

When?

For which agent?

For which request?

What fingerprint?

What risk level?
```

---

# 23. Do NOT Execute Yet

This is one of the most important parts of the diagram.

Wrong:

```text id="apq55"
Human Approver
       │
       │ APPROVE
       ▼
Tool Executor
       │
       ▼
Bank
```

Correct:

```text id="apq56"
Human Approver
       │
       │ APPROVE
       ▼
Approval Service
       │
       ▼
Governance Gateway
       │
       ▼
RE-AUTHORIZATION
```

Human approval changes authorization context.

It does not bypass authorization.

---

# 24. Approval Service Triggers Continuation

```text id="apq57"
Approval Service
       │
       │ Approval Completed
       ▼
Governance Gateway
```

Governance retrieves:

```text id="apq58"
REQ-2002
```

and begins re-authorization.

---

# 25. Refresh Security Context

Before re-authorizing, governance should re-check:

```text id="apq59"
Agent status

Permission assignment

Permission boundary

Tool status

Approval validity

Request integrity

Risk context
```

Why?

Because approval may have taken:

```text id="apq60"
30 seconds

5 minutes

30 minutes
```

During that time, security state could change.

---

# 26. Recheck Agent

Conceptually:

```text id="apq61"
Is AGT-002 still ACTIVE?
```

If:

```text id="apq62"
DISABLED
```

then:

```text id="apq63"
DENY
```

even though a human approved the payment.

This demonstrates the kill switch remains authoritative.

---

# 27. Recheck Permission

Check:

```text id="apq64"
Does AGT-002 still have:

payment.execute?
```

If permission was revoked while approval was pending:

```text id="apq65"
DENY
```

Again:

```text id="apq66"
Old Approval
≠
Permanent Authority
```

---

# 28. Verify Approval

Governance verifies:

```text id="apq67"
Approval Status:
APPROVED

Not Expired:
true

Fingerprint:
FP-PAY-2500-XYZ
```

Compare:

```text id="apq68"
Request Fingerprint
FP-PAY-2500-XYZ

Approval Fingerprint
FP-PAY-2500-XYZ
```

Result:

```text id="apq69"
MATCH
```

---

# 29. Request Modification Attack

Add an `alt` block.

Suppose original approval:

```text id="apq70"
$2,500
```

but request becomes:

```text id="apq71"
$25,000
```

New fingerprint:

```text id="apq72"
FP-PAY-25000-ABC
```

Comparison:

```text id="apq73"
FP-PAY-2500-XYZ
≠
FP-PAY-25000-ABC
```

Result:

```text id="apq74"
DENY

REQUEST_MODIFIED
```

The previous approval cannot be reused.

---

# 30. Reassess Risk

For stronger security, reassess or refresh risk before execution.

```text id="apq75"
Governance Gateway
       │
       │ Refresh Risk
       ▼
Risk Engine
```

Suppose result remains:

```text id="apq76"
MEDIUM
```

Continue.

If new signals cause:

```text id="apq77"
HIGH
```

policy may deny execution despite earlier human approval.

---

# 31. Build New Authorization Context

The second authorization request now contains:

```text id="apq78"
Agent:
AGT-002

Action:
payment.execute

Amount:
$2,500

Permission:
PASS

Risk:
MEDIUM

Approval:
true

Approval ID:
APR-1001

Fingerprint:
FP-PAY-2500-XYZ
```

Notice the important difference:

Initial request:

```text id="apq79"
approval = false
```

Second request:

```text id="apq80"
approval = true
```

---

# 32. Re-Authorization Through OPA

```text id="apq81"
Governance Gateway
       │
       │ Re-Authorize
       ▼
Authorization Service
```

Then:

```text id="apq82"
Authorization Service
       │
       │ Policy Input + Approval
       ▼
OPA
```

OPA evaluates the policy again.

---

# 33. Second Policy Evaluation

Conceptual policy:

```text id="apq83"
IF

action = payment.execute

AND

amount > $500

AND

amount <= $5,000

AND

risk != HIGH

AND

approval.valid = true

AND

approval.requestFingerprint
    =
current.requestFingerprint

THEN

ALLOW
```

---

# 34. OPA Returns ALLOW

```text id="apq84"
OPA
 │
 │ ALLOW
 ▼
Authorization Service
```

Then:

```text id="apq85"
Authorization Service
       │
       │ ALLOW
       ▼
Governance Gateway
```

Record a **second authorization decision**.

Initial:

```text id="apq86"
Decision #1

REQUIRE_APPROVAL
```

After approval:

```text id="apq87"
Decision #2

ALLOW
```

This is why your data model has:

```text id="apq88"
ACTION_REQUEST
      1
      │
      ▼
      N
AUTHORIZATION_DECISION
```

---

# 35. Audit Re-Authorization

```text id="apq89"
Governance Gateway
       │
       │ AUTHORIZATION_ALLOWED
       ▼
Audit Service
```

Audit metadata:

```text id="apq90"
Request:
REQ-2002

Decision:
ALLOW

Approval:
APR-1001

Approver:
USR-APPROVER-01

Risk:
MEDIUM

Policy Version:
1
```

---

# 36. Idempotency Check

Before financial execution:

```text id="apq91"
Idempotency Key:
IDEMP-PAY-9002
```

Check:

```text id="apq92"
Already executed?
```

For this scenario:

```text id="apq93"
NO
```

Continue.

---

# 37. Final Execution Validation

Governance invokes:

```text id="apq94"
Governance Gateway
       │
       │ Execute Authorized Request
       ▼
Tool Executor
```

Tool Executor verifies:

```text id="apq95"
Authorization = ALLOW

Agent = ACTIVE

Tool = ENABLED

Approval = VALID

Fingerprint = MATCH

Idempotency = UNUSED
```

Only if all checks pass:

```text id="apq96"
EXECUTE
```

---

# 38. Record Execution Start

```text id="apq97"
Tool Executor
      │
      │ EXECUTION_STARTED
      ▼
Audit Service
```

---

# 39. Execute Payment

```text id="apq98"
Tool Executor
      │
      │ POST Payment
      ▼
Banking Payment API
```

Payload:

```json id="apq99"
{
  "sourceAccountId": "ACC-1001",
  "destinationId": "MERCHANT-501",
  "amount": 2500,
  "currency": "USD",
  "idempotencyKey": "IDEMP-PAY-9002"
}
```

---

# 40. Banking API Executes

Banking service performs:

```text id="apq100"
Validate source

Validate balance

Validate destination

Create transaction

Execute transfer
```

Returns:

```text id="apq101"
Payment ID:
PAY-5002

Status:
SUCCESS
```

Sequence:

```text id="apq102"
Banking Payment API
       │
       │ SUCCESS
       ▼
Tool Executor
```

---

# 41. Mark Execution Complete

Tool Executor records:

```text id="apq103"
Execution:
SUCCEEDED

Payment:
PAY-5002

Request:
REQ-2002

Authorization:
ALLOW

Approval:
APR-1001
```

Then:

```text id="apq104"
Tool Executor
      │
      │ EXECUTION_SUCCEEDED
      ▼
Audit Service
```

---

# 42. Return Result

```text id="apq105"
Tool Executor
      │
      ▼
Governance Gateway
      │
      ▼
AI Agent
```

Response:

```json id="apq106"
{
  "requestId": "REQ-2002",
  "status": "SUCCEEDED",
  "paymentId": "PAY-5002",
  "approvalId": "APR-1001"
}
```

---

# 43. Agent Responds to User

```text id="apq107"
AI Agent
    │
    │ Payment approved and completed
    ▼
User
```

---

# 44. Main Sequence

The core draw.io flow should look approximately like:

```text id="apq108"
Agent      Gateway      Permission      Risk      AuthZ      OPA      Approval      Human      Executor      Bank      Audit
 │            │              │            │         │         │          │            │           │           │         │
 │───────────▶│              │            │         │         │          │            │           │           │         │
 │ Pay $2500  │              │            │         │         │          │            │           │           │         │
 │            │─────────────▶│            │         │         │          │            │           │           │         │
 │            │ Permission?  │            │         │         │          │            │           │           │         │
 │            │◀─────────────│            │         │         │          │            │           │           │         │
 │            │ PASS                      │         │         │          │            │           │           │         │
 │            │──────────────────────────▶│         │         │          │            │           │           │         │
 │            │ Risk                      │         │         │          │            │           │           │         │
 │            │◀──────────────────────────│         │         │          │            │           │           │         │
 │            │ MEDIUM                              │         │          │            │           │           │         │
 │            │────────────────────────────────────▶│         │          │            │           │           │         │
 │            │ Authorize                           │────────▶│          │            │           │           │         │
 │            │                                     │ Policy  │          │            │           │           │         │
 │            │                                     │◀────────│          │            │           │           │         │
 │            │                                     │ REQUIRE │          │            │           │           │         │
 │            │◀────────────────────────────────────│ APPROVAL│          │            │           │           │         │
 │            │──────────────────────────────────────────────▶│          │            │           │           │         │
 │            │ Create Approval                                         │            │           │           │         │
 │            │                                                         │───────────▶│           │           │         │
 │            │                                                         │ Review     │           │           │         │
 │            │                                                         │◀───────────│           │           │         │
 │            │                                                         │ APPROVE    │           │           │         │
 │            │◀────────────────────────────────────────────────────────│            │           │           │         │
 │            │ Approval Completed                                      │            │           │           │         │
 │            │─────────────▶│                                          │            │           │           │         │
 │            │ Recheck      │                                          │            │           │           │         │
 │            │◀─────────────│                                          │            │           │           │         │
 │            │──────────────────────────▶│                              │            │           │           │         │
 │            │ Refresh Risk              │                              │            │           │           │         │
 │            │◀──────────────────────────│                              │            │           │           │         │
 │            │────────────────────────────────────▶│                    │            │           │           │         │
 │            │ Re-Authorize                        │────────▶│          │            │           │           │         │
 │            │                                     │ Policy  │          │            │           │           │         │
 │            │                                     │◀────────│          │            │           │           │         │
 │            │                                     │ ALLOW   │          │            │           │           │         │
 │            │◀────────────────────────────────────│         │          │            │           │           │         │
 │            │─────────────────────────────────────────────────────────────────────────────────▶│           │         │
 │            │ Authorized Execution                                                                     │           │         │
 │            │                                                                                          │──────────▶│         │
 │            │                                                                                          │ Payment   │         │
 │            │                                                                                          │◀──────────│         │
 │            │                                                                                          │ SUCCESS   │         │
 │            │◀─────────────────────────────────────────────────────────────────────────────────────────│           │         │
 │◀───────────│ SUCCESS                                                                                              │         │
```

---

# 45. Critical `alt` Blocks

## Human Rejects

```text id="apq109"
alt Human Rejects

Human
  ↓
Approval Service

REJECTED
  ↓
Audit

APPROVAL_REJECTED
  ↓
Gateway
  ↓
Agent

DENIED

NO EXECUTION

end
```

---

## Approval Expires

```text id="apq110"
alt Approval Expired

Approval Status
=
EXPIRED

        ↓

DENY

        ↓

NO EXECUTION

end
```

---

## Agent Disabled During Approval

```text id="apq111"
alt Agent Disabled Before Re-Authorization

Human approves

        ↓

Recheck Agent

        ↓

DISABLED

        ↓

DENY

        ↓

NO EXECUTION

end
```

This is an excellent governance example.

---

## Permission Revoked During Approval

```text id="apq112"
alt Permission Revoked

Initial:
payment.execute = granted

Human reviewing...

Administrator revokes permission

Human approves

        ↓

Re-Authorization

        ↓

payment.execute = missing

        ↓

DENY

end
```

---

## Request Changed

```text id="apq113"
alt Request Fingerprint Mismatch

Approved:
$2,500

Current:
$25,000

Fingerprint mismatch

        ↓

DENY

REQUEST_MODIFIED

end
```

---

## Risk Becomes HIGH

```text id="apq114"
alt Risk Escalates

Initial Risk:
MEDIUM

After Approval:
HIGH

        ↓

OPA Re-Evaluation

        ↓

DENY

end
```

Human approval does not automatically override a prohibited risk state.

---

# 46. Most Important Concept

Your diagram should visually emphasize:

```text id="apq115"
               INITIAL REQUEST

                     │
                     ▼
                   OPA
                     │
                     ▼
             REQUIRE_APPROVAL
                     │
                     ▼
              HUMAN APPROVAL
                     │
                     ▼
              RE-AUTHORIZATION
                     │
                     ▼
                   OPA
                     │
                     ▼
                   ALLOW
                     │
                     ▼
                  EXECUTE
```

Not:

```text id="apq116"
OPA
 ↓
REQUIRE_APPROVAL
 ↓
Human
 ↓
APPROVE
 ↓
EXECUTE
```

---

# 47. Why Re-Authorization Is Important

Between initial authorization and approval:

```text id="apq117"
Agent could be disabled

Permission could be revoked

Boundary could change

Policy could change

Tool could be disabled

Risk could increase

Request could be modified

Approval could expire
```

Therefore:

```text id="apq118"
Approval
      ↓
Fresh Authorization Decision
      ↓
Execution
```

is much safer.

---

# 48. Governance Questions This Flow Answers

The system can answer:

```text id="apq119"
Which agent requested the payment?

What did it request?

What permission allowed it?

What was the risk level?

Why wasn't autonomous execution allowed?

Which policy required approval?

Which policy version?

Who approved the payment?

When did they approve it?

What exact transaction did they approve?

Did anything change after approval?

Was the request re-authorized?

Which authorization decision allowed execution?

Did the payment succeed?
```

This is exactly what **AI governance = accountability** means in practice.

---

# 49. Audit Timeline

For `REQ-2002`, the audit trail could look like:

```text id="apq120"
10:00:00
ACTION_REQUESTED

10:00:01
AGENT_AUTHENTICATED

10:00:01
PERMISSION_CHECK_PASSED

10:00:02
RISK_EVALUATED
MEDIUM

10:00:02
AUTHORIZATION_DECISION
REQUIRE_APPROVAL

10:00:03
APPROVAL_REQUESTED
APR-1001

10:02:17
APPROVAL_APPROVED
USR-APPROVER-01

10:02:18
SECURITY_CONTEXT_REFRESHED

10:02:18
RISK_REEVALUATED
MEDIUM

10:02:19
AUTHORIZATION_DECISION
ALLOW

10:02:19
EXECUTION_STARTED

10:02:20
PAYMENT_SUCCEEDED
PAY-5002

10:02:20
EXECUTION_SUCCEEDED
```

This timeline is extremely useful for the governance dashboard.

---

# 50. Judge-Friendly Version

For presentation, simplify the diagram to:

```text id="apq121"
Agent       Governance       Risk       OPA       Human       Executor       Bank
 │              │             │          │           │            │           │
 │─────────────▶│             │          │           │            │           │
 │ Pay $2,500   │             │          │           │            │           │
 │              │────────────▶│          │           │            │           │
 │              │◀────────────│          │           │            │           │
 │              │ MEDIUM                 │           │            │           │
 │              │───────────────────────▶│           │            │           │
 │              │                        │           │            │           │
 │              │◀───────────────────────│           │            │           │
 │              │ REQUIRE_APPROVAL       │           │            │           │
 │              │───────────────────────────────────▶│            │           │
 │              │ Approval Request                   │            │           │
 │              │◀───────────────────────────────────│            │           │
 │              │ APPROVED                           │            │           │
 │              │                                    │            │           │
 │              │──── Refresh Security Context ──────│            │           │
 │              │                                    │            │           │
 │              │───────────────────────▶│           │            │           │
 │              │ Re-Authorize           │           │            │           │
 │              │◀───────────────────────│           │            │           │
 │              │ ALLOW                              │            │           │
 │              │────────────────────────────────────────────────▶│           │
 │              │ Authorized Execution                            │──────────▶│
 │              │                                                 │ $2,500    │
 │              │                                                 │◀──────────│
 │              │◀────────────────────────────────────────────────│ SUCCESS   │
 │◀─────────────│                                                             
 │ SUCCESS      │
```

---

# 51. Diagram Title

Use:

**AI Agent Governance Platform — Human Approval Sequence**

Subtitle:

**Policy-driven approval with mandatory re-authorization before financial execution**

---

# 52. Core Security Principle

The diagram demonstrates three separate authorities:

```text id="apq122"
AI Agent
│
└── Proposes the action


Policy Engine
│
└── Determines authorization requirements


Human Approver
│
└── Provides required approval


Governance Enforcement Layer
│
└── Determines whether execution may proceed
```

No single actor automatically controls the entire process.

The core lifecycle is:

```text id="apq123"
AI Intent
   ↓
Permission
   ↓
Risk
   ↓
Policy
   ↓
REQUIRE_APPROVAL
   ↓
Human Decision
   ↓
Fresh Security Context
   ↓
Re-Authorization
   ↓
ALLOW
   ↓
Integrity Verification
   ↓
Controlled Execution
   ↓
Audit
```

The key principle is:

> **Human approval is an input to authorization, not a bypass around authorization.**
