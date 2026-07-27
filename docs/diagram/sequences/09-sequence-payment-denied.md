# 09 — Sequence Diagram: Payment Denied

## Purpose

This sequence demonstrates how the governance platform handles a financial action that policy determines must **never execute**.

Scenario:

> PaymentAgent requests a $25,000 payment. The agent is authenticated and has `payment.execute`, but the transaction is classified as HIGH risk and exceeds the permitted policy threshold.

OPA returns:

```text
DENY
```

The request is stopped before the Banking Payment API is contacted.

The important principle is:

> **A denied action must terminate at the governance boundary.**

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

Action:
payment.execute

Amount:
$25,000

Source:
ACC-1001

Destination:
EXT-UNKNOWN-901

Permission:
payment.execute

Risk:
HIGH
```

Policy:

```text
<= $500
LOW risk
→ ALLOW

$501 – $5,000
LOW/MEDIUM risk
→ REQUIRE_APPROVAL

> $5,000
OR
HIGH risk
→ DENY
```

Therefore:

```text
$25,000
+
HIGH Risk

     ↓

DENY
```

---

# 2. Participants

Use:

```text
User / Business System

AI Agent

Governance Gateway

Permission Service

Risk Engine

Authorization Service

OPA

Audit Service
```

Optionally show:

```text
Tool Executor

Banking Payment API
```

as inactive participants.

I recommend showing them because it visually proves:

```text
DENY
 ↓
No Tool Execution
 ↓
No Banking API Call
```

---

# 3. High-Level Flow

```text
User
 ↓
AI Agent
 ↓
Governance Gateway
 ↓
Permission Check
 ↓
Risk Assessment
 ↓
Authorization Service
 ↓
OPA
 ↓
DENY
 ↓
Audit
 ↓
Return Denial
```

And critically:

```text
                    DENY
                      │
                      X
                      │
                Tool Executor
                      │
                      X
                      │
                 Banking API
```

---

# 4. Payment Request

User requests:

```text
"Transfer $25,000 from ACC-1001
to EXT-UNKNOWN-901."
```

Sequence:

```text
User
 │
 │ Payment Request
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

Arguments:

```json
{
  "sourceAccountId": "ACC-1001",
  "destinationId": "EXT-UNKNOWN-901",
  "amount": 25000,
  "currency": "USD"
}
```

Then:

```text
AI Agent
    │
    │ Governed Action Request
    ▼
Governance Gateway
```

The agent still has the right to **request** the operation.

That does not mean it has the right to execute it.

---

# 6. Create Action Request

Governance creates:

```text
Request ID:
REQ-2003

Status:
PENDING
```

and records:

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

---

# 7. Preliminary Security Checks

As in previous sequences, governance performs:

```text
Authenticate Agent
        ↓
Check Agent Status
        ↓
Resolve Trusted Tool
        ↓
Validate Arguments
        ↓
Canonicalize Request
```

Result:

```text
Agent:
AGT-002

Status:
ACTIVE

Tool:
execute_payment

Action:
payment.execute

Arguments:
VALID
```

---

# 8. Generate Request Fingerprint

Generate a fingerprint from the security-relevant request:

```text
AGT-002

payment.execute

ACC-1001

EXT-UNKNOWN-901

25000

USD
```

Result:

```text
FP-PAY-DENY-001
```

Even denied requests should have traceable request identity.

---

# 9. Permission Check

Governance asks:

```text
Governance Gateway
       │
       │ payment.execute?
       ▼
Permission Service
```

The agent has:

```text
payment.execute
```

Result:

```text
PERMITTED
```

This is intentional.

We want this scenario to demonstrate that:

```text
Permission
≠
Automatic Authorization
```

The agent has the general capability, but contextual policy still determines whether this **specific payment** is allowed.

---

# 10. Permission vs Policy

Think of it as:

```text
Permission:

"Can this agent perform
payment operations at all?"

        ↓

YES
```

Then:

```text
Policy:

"Can this agent perform
THIS $25,000 payment
under THESE conditions?"

        ↓

NO
```

Both layers matter.

---

# 11. Risk Assessment

Governance sends:

```text
Governance Gateway
       │
       │ Assess Payment Risk
       ▼
Risk Engine
```

Risk engine considers:

```text
Amount:
$25,000

Destination:
Unknown external destination

Transaction velocity:
Unusual

Historical behavior:
Abnormal

Action:
Financial state change
```

Result:

```text
HIGH
```

Sequence:

```text
Risk Engine
      │
      │ HIGH
      ▼
Governance Gateway
```

---

# 12. Risk Evidence

For explainability, the Risk Engine may return:

```text
Risk:
HIGH

Signals:

HIGH_VALUE_TRANSACTION

UNKNOWN_DESTINATION

UNUSUAL_PAYMENT_PATTERN
```

These signals can later support:

```text
Policy evaluation

Audit investigation

Governance dashboard

Human explanation
```

---

# 13. Build Authorization Context

Governance constructs trusted context:

```text
Principal:
AGT-002

Action:
payment.execute

Amount:
$25,000

Source:
ACC-1001

Destination:
EXT-UNKNOWN-901

Permission:
PASS

Risk:
HIGH

Approval:
false

Fingerprint:
FP-PAY-DENY-001
```

Then:

```text
Governance Gateway
       │
       │ Authorize
       ▼
Authorization Service
```

---

# 14. OPA Evaluation

Authorization Service calls:

```text
Authorization Service
       │
       │ Evaluate Policy
       ▼
OPA
```

Conceptual policy:

```text
IF risk == HIGH

THEN DENY
```

Another rule:

```text
IF payment.amount > $5,000

THEN DENY
```

This request matches both.

---

# 15. OPA Returns DENY

```text
OPA
 │
 │ DENY
 ▼
Authorization Service
```

Decision:

```text
DENY
```

Reason codes:

```text
HIGH_RISK_TRANSACTION

AMOUNT_EXCEEDS_POLICY_LIMIT
```

Then:

```text
Authorization Service
       │
       │ DENY
       ▼
Governance Gateway
```

---

# 16. Important — No Human Approval

Do **not** send this request for human approval.

The policy explicitly says:

```text
HIGH risk
→ DENY
```

Therefore:

```text
DENY
```

does not mean:

```text
Ask a human whether
we should allow it.
```

It means:

```text
STOP
```

---

# 17. Three Different Outcomes

This distinction should be clear across your sequence diagrams.

```text
ALLOW
  │
  ▼
Execute
```

```text
REQUIRE_APPROVAL
       │
       ▼
Human Review
       │
       ▼
Re-Authorize
```

```text
DENY
  │
  ▼
STOP
```

---

# 18. Why Approval Cannot Override DENY

Suppose a human administrator says:

```text
"I approve the $25,000 payment."
```

That should not automatically convert:

```text
DENY
```

into:

```text
ALLOW
```

unless the governance architecture explicitly defines a separate privileged override mechanism.

For the hackathon MVP:

```text
DENY = FINAL
```

This keeps the authorization model clear and safe.

---

# 19. Record Authorization Decision

Store:

```text
Request:
REQ-2003

Decision:
DENY

Risk:
HIGH

Policy:
payment-policy

Policy Version:
1

Reason:
HIGH_RISK_TRANSACTION

Fingerprint:
FP-PAY-DENY-001
```

---

# 20. Audit Denial

```text
Governance Gateway
       │
       │ AUTHORIZATION_DENIED
       ▼
Audit Service
```

Audit event should capture:

```text
Request ID

Agent ID

Action

Resource

Amount

Risk Level

Policy

Policy Version

Decision

Reason Code

Timestamp
```

Be careful not to place unnecessary sensitive data into logs.

---

# 21. Update Request State

Action request becomes:

```text
REQ-2003

Status:
DENIED
```

Lifecycle:

```text
PENDING
   ↓
DENIED
```

It never reaches:

```text
AUTHORIZED

EXECUTING

SUCCEEDED
```

---

# 22. Tool Executor Is Never Called

This is one of the most important visual elements.

Show:

```text
Governance Gateway

       │

       X  NO CALL

       │

Tool Executor
```

Add note:

```text
Authorization denied.
Execution path terminated.
```

---

# 23. Banking API Is Never Called

Similarly:

```text
Tool Executor

       │

       X

       │

Banking Payment API
```

No request reaches the protected banking system.

This demonstrates **enforcement**, not merely policy evaluation.

---

# 24. Why Enforcement Matters

Imagine OPA correctly returns:

```text
DENY
```

but application code does:

```text
OPA → DENY

but

Agent → Banking API
```

Then OPA provides no actual security.

Correct architecture:

```text
Agent
  ↓
Governance Enforcement Point
  ↓
OPA Decision
  ↓
DENY
  ↓
STOP
```

The agent must not have an alternate path to the protected service.

---

# 25. Return Safe Denial

Governance returns:

```text
Governance Gateway
       │
       │ DENIED
       ▼
AI Agent
```

Conceptual response:

```json
{
  "requestId": "REQ-2003",
  "status": "DENIED",
  "reason": "Transaction violates payment policy."
}
```

Avoid exposing unnecessary internal policy implementation details.

---

# 26. Agent Responds to User

```text
AI Agent
    │
    │ Payment could not be authorized
    ▼
User
```

The agent must not attempt to circumvent the governance decision using another equivalent tool.

---

# 27. Prevent Tool Switching

This is an important agent-specific guardrail.

Suppose:

```text
execute_payment
      ↓
DENIED
```

The agent should not attempt:

```text
transfer_funds
```

or:

```text
direct_bank_api
```

to accomplish the same prohibited action.

All sensitive tools must pass through the same governance boundary.

---

# 28. Main Draw.io Sequence

Use approximately:

```text
User   Agent   Gateway   Permission   Risk   AuthZ   OPA   Executor   Bank   Audit
 │       │        │          │          │      │      │       │        │      │
 │──────▶│        │          │          │      │      │       │        │      │
 │ Pay   │        │          │          │      │      │       │        │      │
 │$25K   │        │          │          │      │      │       │        │      │
 │       │───────▶│          │          │      │      │       │        │      │
 │       │ Action │          │          │      │      │       │        │      │
 │       │        │─────────▶│          │      │      │       │        │      │
 │       │        │Permission│          │      │      │       │        │      │
 │       │        │◀─────────│          │      │      │       │        │      │
 │       │        │ PASS                │      │      │       │        │      │
 │       │        │────────────────────▶│      │      │       │        │      │
 │       │        │ Risk                │      │      │       │        │      │
 │       │        │◀────────────────────│      │      │       │        │      │
 │       │        │ HIGH                       │      │       │        │      │
 │       │        │───────────────────────────▶│      │       │        │      │
 │       │        │ Authorize                  │─────▶│       │        │      │
 │       │        │                            │Policy│       │        │      │
 │       │        │                            │◀─────│       │        │      │
 │       │        │                            │ DENY │       │        │      │
 │       │        │◀───────────────────────────│      │       │        │      │
 │       │        │ DENY                              │       │        │      │
 │       │        │──────────────────────────────────────────────────────────▶│
 │       │        │ AUTHORIZATION_DENIED                                    │
 │       │        │                                  │       │        │      │
 │       │        │                                  │   X   │        │      │
 │       │        │                                  │ NO EXECUTION   │      │
 │       │        │                                  │       │   X    │      │
 │       │        │                                  │       │ NO BANK CALL  │
 │       │◀───────│                                  │       │        │      │
 │       │ DENIED │                                  │       │        │      │
 │◀──────│        │                                  │       │        │      │
 │Denied │        │                                  │       │        │      │
```

---

# 29. Recommended `alt` Block

The main policy fragment can be:

```text
alt OPA Decision

    [ALLOW]

        Continue to execution

    [REQUIRE_APPROVAL]

        Create approval request

    [DENY]

        Audit denial
        Return DENIED
        Stop

end
```

For this specific diagram, highlight:

```text
[DENY]
```

---

# 30. Denial Due to Missing Permission

You can include a smaller alternative:

```text
alt Permission Missing

Permission Service
       ↓
Gateway

DENY

Reason:
MISSING_PERMISSION

       ↓

Audit

       ↓

Return DENIED

end
```

In that case OPA may not even need to be called, depending on your architecture.

---

# 31. Denial Due to Disabled Agent

Another early-denial example:

```text
Agent Status
     ↓
DISABLED
     ↓
DENY
```

No:

```text
Risk Evaluation

OPA Evaluation

Execution
```

is necessary.

This demonstrates **fail fast**.

---

# 32. Denial Due to Disabled Tool

Similarly:

```text
execute_payment

Tool Status:
DISABLED

      ↓

DENY
```

Reason:

```text
TOOL_DISABLED
```

---

# 33. Denial Due to Policy

The scenario in this diagram specifically represents:

```text
Identity
   ✓

Agent Status
   ✓

Tool
   ✓

Permission
   ✓

Input
   ✓

Risk
   HIGH

Policy
   ✕

     ↓

DENY
```

This is useful because it proves authorization is contextual rather than just RBAC.

---

# 34. Why RBAC Alone Is Insufficient

Basic permission system:

```text
Does AGT-002 have payment.execute?

YES

     ↓

Execute
```

That would permit both:

```text
$250 payment
```

and:

```text
$25,000 payment
```

The governance model adds context:

```text
Who?

What action?

Which resource?

How much?

What risk?

Under which conditions?

Which policy?
```

Therefore:

```text
payment.execute
+
$250
+
LOW risk

→ ALLOW
```

while:

```text
payment.execute
+
$25,000
+
HIGH risk

→ DENY
```

---

# 35. Policy Decision vs Enforcement

Add a small note:

```text
OPA
=
Policy Decision Point
(PDP)
```

and:

```text
Governance Gateway
+
Tool Executor
=
Policy Enforcement Point
(PEP)
```

Flow:

```text
PEP
 │
 │ Ask
 ▼
PDP
 │
 │ DENY
 ▼
PEP
 │
 │ Enforce
 ▼
STOP
```

---

# 36. Important Audit Timeline

For `REQ-2003`:

```text
14:10:00
ACTION_REQUESTED

14:10:00
AGENT_AUTHENTICATED

14:10:01
AGENT_STATUS_VERIFIED

14:10:01
TOOL_RESOLVED

14:10:01
PERMISSION_CHECK_PASSED

14:10:02
RISK_EVALUATED
HIGH

14:10:02
AUTHORIZATION_DECISION
DENY

14:10:02
ACTION_DENIED
```

There should be no:

```text
EXECUTION_STARTED
```

and no:

```text
PAYMENT_CREATED
```

for this request.

That absence itself is useful audit evidence.

---

# 37. Governance Dashboard Representation

The dashboard could eventually show:

```text
Request
REQ-2003

Agent
PaymentAgent

Action
payment.execute

Amount
$25,000

Risk
HIGH

Decision
DENIED

Reason
High-risk transaction

Policy
payment-policy v1

Executed
NO
```

This provides immediate accountability.

---

# 38. Security Properties Demonstrated

The diagram demonstrates:

```text
Context-aware authorization

Risk-based authorization

Policy-enforced financial limits

Fail-closed behavior

No automatic approval escalation

No direct agent-to-bank access

Central enforcement

Denied-action auditing

Explainable policy decisions
```

---

# 39. Fail-Closed Principle

The platform should generally behave:

```text
Cannot authenticate?
→ DENY

Cannot load permissions?
→ DENY

Risk service unavailable?
→ DENY / safe fallback

OPA unavailable?
→ DENY

Malformed policy response?
→ DENY

Request integrity failure?
→ DENY
```

For sensitive financial actions, uncertainty should not silently become permission.

---

# 40. Three Payment Diagrams Together

Your three sequences now tell a very clear story.

### `07-sequence-payment-allow.drawio`

```text
$250
+
LOW risk

      ↓

ALLOW

      ↓

EXECUTE
```

### `08-sequence-payment-approval.drawio`

```text
$2,500
+
MEDIUM risk

      ↓

REQUIRE_APPROVAL

      ↓

Human Approval

      ↓

Re-Authorization

      ↓

ALLOW

      ↓

EXECUTE
```

### `09-sequence-payment-deny.drawio`

```text
$25,000
+
HIGH risk

      ↓

DENY

      ↓

STOP
```

This gives you the complete policy lifecycle:

```text
                 ACTION REQUEST
                       │
                       ▼
                POLICY EVALUATION
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
        ALLOW       APPROVAL       DENY
          │            │            │
          ▼            ▼            ▼
       EXECUTE       HUMAN         STOP
                       │
                       ▼
                  RE-AUTHORIZE
                       │
                       ▼
                     ALLOW
                       │
                       ▼
                    EXECUTE
```

---

# 41. Judge-Friendly Diagram

For the hackathon presentation, the essential version is:

```text
Agent        Governance        Risk        OPA        Bank
 │               │              │           │          │
 │──────────────▶│              │           │          │
 │ Pay $25,000   │              │           │          │
 │               │─────────────▶│           │          │
 │               │ Assess Risk  │           │          │
 │               │◀─────────────│           │          │
 │               │ HIGH                     │          │
 │               │─────────────────────────▶│          │
 │               │ Policy Evaluation        │          │
 │               │◀─────────────────────────│          │
 │               │ DENY                     │          │
 │               │                          │          │
 │               │                          │    X     │
 │               │                          │ NO CALL  │
 │◀──────────────│                          │          │
 │ DENIED        │                          │          │
```

The most important visual is:

```text
OPA → DENY

Bank → NEVER CALLED
```

---

# 42. Diagram Title

Use:

**AI Agent Governance Platform — Payment Denial Sequence**

Subtitle:

**High-risk financial action blocked before protected-service execution**

---

# 43. Core Message

The full path is:

```text
AI Intent
   ↓
Authentication
   ↓
Permission
   ↓
Risk Assessment
   ↓
Policy Evaluation
   ↓
DENY
   ↓
Audit
   ↓
STOP
```

The architecture guarantees:

> **An AI agent's permission to use a capability does not mean every use of that capability is authorized.**

And most importantly:

> **A policy decision only provides security when the architecture guarantees that denied actions cannot bypass the enforcement point.**
