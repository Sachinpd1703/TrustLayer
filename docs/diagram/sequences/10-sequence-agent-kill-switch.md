# 10 — Sequence Diagram: Agent Kill Switch

## Purpose

This sequence diagram demonstrates the **emergency agent disable / kill-switch mechanism**.

Scenario:

> `PaymentAgent (AGT-002)` is active and has permission to execute payments. A security administrator detects suspicious behavior and disables the agent.

After the agent is disabled:

```text
AGT-002
ACTIVE
   ↓
DISABLED
```

all new governed actions must be denied.

More importantly, pending actions must **not automatically continue** merely because they were requested or approved before the agent was disabled.

Core principle:

> **Disabling an agent immediately removes its ability to perform future governed actions.**

---

# 1. Scenario

Assume:

```text
Agent:
PaymentAgent

Agent ID:
AGT-002

Current Status:
ACTIVE

Permission:
payment.execute

Administrator:
USR-ADMIN-01
```

The agent currently has:

```text
Valid authentication

payment.execute permission

Active permission boundary

Registered tools
```

Security monitoring detects suspicious behavior.

An administrator decides:

```text
Disable AGT-002
```

---

# 2. Participants

Use these participants from left to right:

```text
Security Administrator

Admin Dashboard

Governance API

Authentication / IAM

Agent Registry

Approval Service

Authorization Service

OPA

Tool Executor

Audit Service

AI Agent
```

Optionally show:

```text
Banking API
```

at the far right to demonstrate that no protected action reaches it after the kill switch is active.

---

# 3. High-Level Flow

The primary sequence is:

```text
Security Administrator
        │
        ▼
Admin Dashboard
        │
        │ Disable AGT-002
        ▼
Governance API
        │
        ├── Authenticate Administrator
        │
        ├── Authorize Disable Operation
        │
        ▼
Agent Registry
        │
        │ ACTIVE → DISABLED
        ▼
Approval Service
        │
        │ Cancel / invalidate pending work
        ▼
Audit Service
        │
        │ Record who disabled agent
        ▼

             Later...

AI Agent
   │
   │ Requests Action
   ▼
Governance
   │
   ▼
Agent Registry
   │
   │ DISABLED
   ▼
DENY
```

---

# 4. Initial State

Before the kill switch:

```text
AGT-002

Status:
ACTIVE
```

Therefore:

```text
Authenticated
     +
Permissions
     +
Policy
     ↓
Potentially Authorized
```

The agent is not automatically authorized for everything, but it is eligible to participate in authorization.

---

# 5. Security Event Detected

Suppose monitoring detects:

```text
Unusual payment frequency

Repeated denied requests

Abnormal tool usage

Unexpected destination patterns
```

This could originate from:

```text
Security monitoring

SIEM

Fraud detection

Human investigation

Governance dashboard
```

For this diagram, assume the administrator manually decides to disable the agent.

---

# 6. Administrator Opens Governance Dashboard

```text
Security Administrator
        │
        │ Open Agent Management
        ▼
Admin Dashboard
```

The dashboard displays:

```text
PaymentAgent

AGT-002

Status:
ACTIVE

Risk:
Elevated

Recent Actions:
...

Permissions:
payment.execute
```

---

# 7. Administrator Selects Disable

```text
Security Administrator
        │
        │ Disable Agent
        ▼
Admin Dashboard
```

The UI should require explicit confirmation.

Example:

```text
Disable PaymentAgent?

Agent:
AGT-002

Impact:
New actions will be blocked.

Pending operations may be invalidated.

[Cancel] [Disable Agent]
```

---

# 8. Disable Request

Admin Dashboard sends:

```text
Admin Dashboard
       │
       │ Disable AGT-002
       ▼
Governance API
```

Conceptually:

```http
POST /agents/AGT-002/disable
```

Request may include:

```json
{
  "reason": "Suspicious payment activity"
}
```

---

# 9. Authenticate Administrator

Before disabling anything:

```text
Governance API
      │
      │ Verify Admin Identity
      ▼
Authentication / IAM
```

Response:

```text
Principal:
USR-ADMIN-01

Authenticated:
true
```

---

# 10. Authorize Administrative Action

Authentication alone is insufficient.

The system must verify:

```text
Can USR-ADMIN-01
disable AI agents?
```

Conceptual permission:

```text
agent.disable
```

Authorization context:

```text
Principal:
USR-ADMIN-01

Action:
agent.disable

Resource:
AGT-002
```

---

# 11. Administrative Authorization

```text
Governance API
      │
      │ Authorize agent.disable
      ▼
Authorization Service
```

Authorization Service may call:

```text
OPA
```

Sequence:

```text
Authorization Service
      │
      │ Policy Evaluation
      ▼
OPA
```

OPA returns:

```text
ALLOW
```

Only authorized administrators can use the kill switch.

---

# 12. Why the Kill Switch Is Governed

Do not implement:

```text
Anyone calls:

POST /agents/{id}/disable

      ↓

Agent Disabled
```

The kill switch itself is a privileged governance action.

Therefore:

```text
Authenticated Human
      ↓
Administrative Permission
      ↓
Policy
      ↓
ALLOW
      ↓
Disable Agent
```

---

# 13. Update Agent Registry

After administrative authorization:

```text
Governance API
      │
      │ Disable AGT-002
      ▼
Agent Registry
```

Current:

```text
status = ACTIVE
```

Update:

```text
status = DISABLED

disabled_at = timestamp
```

Optionally:

```text
disabled_by = USR-ADMIN-01

disable_reason =
Suspicious payment activity
```

---

# 14. Agent State Transition

Show prominently:

```text
┌────────────────────────┐
│       AGT-002          │
│                        │
│       ACTIVE           │
└───────────┬────────────┘
            │
            │ Kill Switch
            ▼
┌────────────────────────┐
│       AGT-002          │
│                        │
│      DISABLED          │
└────────────────────────┘
```

This state transition is the core of the diagram.

---

# 15. Audit the Disable Operation

Immediately record:

```text
Governance API
      │
      │ AGENT_DISABLED
      ▼
Audit Service
```

Audit information:

```text
Event:
AGENT_DISABLED

Agent:
AGT-002

Actor:
USR-ADMIN-01

Reason:
Suspicious payment activity

Timestamp:
...

Previous Status:
ACTIVE

New Status:
DISABLED
```

---

# 16. Accountability

This directly answers:

```text
Who disabled the agent?

USR-ADMIN-01


Which agent?

AGT-002


When?

timestamp


Why?

Suspicious payment activity
```

This is a core governance requirement.

---

# 17. Invalidate Cached Authorization State

If your system caches agent status or permissions, the kill switch must invalidate that state.

Conceptually:

```text
Agent Registry
      │
      ▼
Authorization Cache
      │
      ▼
Invalidate AGT-002
```

Otherwise:

```text
Database:
DISABLED

Cache:
ACTIVE
```

could temporarily allow actions.

For the MVP, if no authorization caching exists, add a note:

```text
Agent status is checked from trusted
governance state before execution.
```

---

# 18. Authentication Session Handling

Optionally invalidate credentials or sessions associated with the agent.

```text
Governance API
      │
      │ Revoke Agent Session / Credential
      ▼
Authentication / IAM
```

This provides defense in depth.

However:

```text
Credential Revocation
```

should not be the only kill-switch mechanism.

The governance layer must still enforce:

```text
Agent Status = DISABLED
```

---

# 19. Pending Approval Requests

Suppose AGT-002 already has:

```text
REQ-3001

Payment:
$2,500

Status:
PENDING_APPROVAL
```

and:

```text
APR-3001

Status:
PENDING
```

What happens when the agent is disabled?

Recommended behavior:

```text
Agent Disabled
      ↓
Pending Approval
      ↓
CANCELLED / INVALIDATED
```

---

# 20. Cancel Pending Approvals

Governance calls:

```text
Governance API
      │
      │ Invalidate pending approvals for AGT-002
      ▼
Approval Service
```

Approval Service finds:

```text
APR-3001
```

and updates:

```text
PENDING
   ↓
CANCELLED
```

Reason:

```text
AGENT_DISABLED
```

---

# 21. Audit Approval Cancellation

```text
Approval Service
      │
      │ APPROVAL_CANCELLED
      ▼
Audit Service
```

Record:

```text
Approval:
APR-3001

Request:
REQ-3001

Agent:
AGT-002

Reason:
AGENT_DISABLED
```

---

# 22. What If a Human Already Approved?

Consider:

```text
Payment Request
      ↓
REQUIRE_APPROVAL
      ↓
Human APPROVES
      ↓
Agent gets DISABLED
      ↓
Execution?
```

The answer must be:

```text
NO
```

because the platform re-checks agent status before execution.

---

# 23. Approved But Not Executed Scenario

Suppose:

```text
APR-3002

Status:
APPROVED
```

but payment has not executed yet.

Then:

```text
AGT-002
ACTIVE → DISABLED
```

Before execution:

```text
Tool Executor
      │
      │ Check Current Agent State
      ▼
Agent Registry
```

Result:

```text
DISABLED
```

Therefore:

```text
DENY EXECUTION
```

---

# 24. Important Principle

```text
Previous Authorization
        +
Previous Approval

        ≠

Permanent Execution Authority
```

Current governance state still matters.

---

# 25. New Action After Disable

Now suppose AGT-002 attempts:

```text
execute_payment(
    amount = $250
)
```

Sequence:

```text
AI Agent
    │
    │ Payment Request
    ▼
Governance API
```

The request reaches the governance boundary.

---

# 26. Authentication May Still Succeed

An important nuance:

The agent might still possess a technically valid credential.

Therefore:

```text
Authentication
      ↓
VALID CREDENTIAL
```

does not necessarily mean:

```text
Agent may operate
```

Governance still checks:

```text
Agent Registry
```

---

# 27. Agent Status Check

```text
Governance API
      │
      │ Get AGT-002
      ▼
Agent Registry
```

Response:

```text
Agent:
AGT-002

Status:
DISABLED
```

---

# 28. Fail Fast

Once status is:

```text
DISABLED
```

the request should terminate immediately.

Do not continue through:

```text
Tool Resolution

Permission Evaluation

Risk Assessment

OPA Business Policy

Human Approval

Tool Execution
```

Instead:

```text
DISABLED
   ↓
DENY
```

---

# 29. Audit Blocked Attempt

```text
Governance API
      │
      │ DISABLED_AGENT_ACTION_BLOCKED
      ▼
Audit Service
```

Record:

```text
Agent:
AGT-002

Requested Action:
payment.execute

Decision:
DENY

Reason:
AGENT_DISABLED

Timestamp:
...
```

---

# 30. Return Denial

```text
Governance API
      │
      │ DENIED
      ▼
AI Agent
```

Conceptual response:

```json
{
  "status": "DENIED",
  "reason": "AGENT_DISABLED"
}
```

Depending on external exposure, the public response can use a less detailed message while preserving the detailed internal reason in audit logs.

---

# 31. No Tool Execution

Show explicitly:

```text
Governance API

      │
      X
      │

Tool Executor
```

Label:

```text
NO EXECUTION
```

---

# 32. No Banking API Call

Also:

```text
Tool Executor

      │
      X
      │

Banking API
```

Therefore:

```text
Agent Disabled
      ↓
Governance Blocks Request
      ↓
Protected System Never Contacted
```

---

# 33. Main Sequence Diagram

The main draw.io flow can look like:

```text
Admin    Dashboard    Governance    IAM    Registry    Approval    AuthZ    OPA    Executor    Bank    Audit
 │          │             │          │        │           │         │       │        │         │       │
 │─────────▶│             │          │        │           │         │       │        │         │       │
 │ Disable  │             │          │        │           │         │       │        │         │       │
 │ AGT-002  │────────────▶│          │        │           │         │       │        │         │       │
 │          │             │─────────▶│        │           │         │       │        │         │       │
 │          │             │ Auth     │        │           │         │       │        │         │       │
 │          │             │◀─────────│        │           │         │       │        │         │       │
 │          │             │ Admin OK │        │           │         │       │        │         │       │
 │          │             │──────────────────────────────▶│         │       │        │         │       │
 │          │             │ Authorize agent.disable      │────────▶│       │        │         │       │
 │          │             │                              │         │──────▶│        │         │       │
 │          │             │                              │         │◀──────│        │         │       │
 │          │             │                              │         │ ALLOW │        │         │       │
 │          │             │◀─────────────────────────────│         │       │        │         │       │
 │          │             │──────────────▶│              │         │       │        │         │       │
 │          │             │ Disable Agent │              │         │       │        │         │       │
 │          │             │◀──────────────│              │         │       │        │         │       │
 │          │             │ DISABLED      │              │         │       │        │         │       │
 │          │             │─────────────────────────────▶│         │       │        │         │       │
 │          │             │ Cancel Pending Approvals    │         │       │        │         │       │
 │          │             │─────────────────────────────────────────────────────────────────────────▶│
 │          │             │ AGENT_DISABLED                                                         │
 │◀─────────│◀────────────│                                                                         │
 │ Success  │             │                                                                         │
```

Then continue in the same diagram:

```text
Agent        Governance        Registry        Executor        Bank        Audit
 │               │                │               │             │            │
 │──────────────▶│                │               │             │            │
 │ Pay $250      │                │               │             │            │
 │               │───────────────▶│               │             │            │
 │               │ Check Status   │               │             │            │
 │               │◀───────────────│               │             │            │
 │               │ DISABLED       │               │             │            │
 │               │──────────────────────────────────────────────────────────▶│
 │               │ BLOCKED: AGENT_DISABLED                                 │
 │◀──────────────│                                                          │
 │ DENIED        │                │               X             X            │
 │               │                │          NO EXECUTION   NO BANK CALL     │
```

---

# 34. Recommended Diagram Structure

Divide the diagram horizontally into three phases.

```text
════════════════════════════════════════════

PHASE 1
ADMINISTRATOR ACTIVATES KILL SWITCH

════════════════════════════════════════════

PHASE 2
PENDING AUTHORITY IS INVALIDATED

════════════════════════════════════════════

PHASE 3
FUTURE AGENT ACTION IS BLOCKED

════════════════════════════════════════════
```

This makes the diagram much easier to present.

---

# 35. Phase 1 — Kill Switch

Show:

```text
Administrator
     ↓
Admin Dashboard
     ↓
Governance
     ↓
Authenticate
     ↓
Authorize agent.disable
     ↓
OPA → ALLOW
     ↓
Agent Registry
     ↓
ACTIVE → DISABLED
     ↓
Audit
```

---

# 36. Phase 2 — Pending Work

Show:

```text
Agent Disabled
      ↓
Find Pending Approvals
      ↓
Cancel / Invalidate
      ↓
Audit
```

Then add a note:

```text
Previously approved but unexecuted
actions must re-check current agent
status before execution.
```

---

# 37. Phase 3 — Future Request

Show:

```text
Disabled Agent
      ↓
Requests Payment
      ↓
Governance
      ↓
Check Agent
      ↓
DISABLED
      ↓
DENY
      ↓
Audit
```

And visually terminate before:

```text
Tool Executor

Banking API
```

---

# 38. Important `alt` — Unauthorized Admin

The kill switch itself needs protection.

```text
alt User lacks agent.disable

    Governance
        ↓
    Authorization

    DENY

        ↓

    Audit

    UNAUTHORIZED_ADMIN_ACTION

        ↓

    Agent remains ACTIVE

end
```

This prevents ordinary users from disabling agents.

---

# 39. Important `alt` — Agent Already Disabled

If:

```text
AGT-002
=
DISABLED
```

and another disable request arrives:

```text
Disable AGT-002
```

the operation should be idempotent.

Return:

```text
Already Disabled
```

rather than creating inconsistent state.

Still audit the administrative attempt if useful.

---

# 40. Important `alt` — Pending Approval

```text
alt Pending Approval Exists

    AGT-002 disabled

        ↓

    APR-3001
    PENDING

        ↓

    CANCELLED

        ↓

    Reason:
    AGENT_DISABLED

end
```

---

# 41. Important `alt` — Previously Approved Action

```text
alt Action Approved Before Disable

    Human Approval
        ↓
    APPROVED

    Administrator disables agent

        ↓

    Execution begins

        ↓

    Check Current Agent Status

        ↓

    DISABLED

        ↓

    DENY EXECUTION

end
```

This is probably the strongest kill-switch example.

---

# 42. Race Condition

There is an important edge case:

```text
T1:
Executor checks agent = ACTIVE

T2:
Administrator disables agent

T3:
Executor sends payment
```

A naive implementation could still execute.

For the MVP, document the guarantee as:

> Agent status is revalidated as close as possible to the protected execution boundary.

For production systems, stronger coordination may be required depending on the criticality of the action.

---

# 43. Already Executing Actions

A kill switch cannot always safely undo an external operation that has already committed.

Example:

```text
Payment API
    ↓
Payment completed
    ↓
Administrator disables agent
```

The system cannot pretend:

```text
Payment never happened
```

Instead:

```text
Kill Switch
     ↓
Blocks subsequent actions
```

and the completed operation remains in the audit trail.

If compensation is needed:

```text
Refund

Reversal

Manual investigation
```

is a separate business workflow.

---

# 44. Kill Switch Semantics

Define the kill switch precisely:

```text
DISABLE AGENT

means:

✓ Reject new governed actions

✓ Prevent pending actions from gaining execution authority

✓ Cancel pending approvals where appropriate

✓ Revalidate approved-but-unexecuted actions

✓ Record administrator identity

✓ Record reason

✓ Record timestamp

✓ Invalidate relevant caches

✓ Optionally revoke active credentials
```

It does **not necessarily mean**:

```text
✗ Reverse completed actions

✗ Delete audit history

✗ Delete the agent

✗ Delete permissions

✗ Delete policies
```

---

# 45. Disable vs Delete

Do not delete the agent.

Wrong:

```text
DELETE FROM agents
WHERE id = 'AGT-002'
```

Better:

```text
AGT-002

status:
DISABLED

disabled_at:
...

disabled_by:
...
```

Why?

Because historical records still reference:

```text
AGT-002
```

Deleting it would damage governance history.

---

# 46. Disable vs Permission Revocation

These are different controls.

```text
Permission Revocation

payment.execute
    ↓
REVOKED
```

means:

> Agent can continue operating but cannot execute payments.

Whereas:

```text
Agent Disable

ACTIVE
   ↓
DISABLED
```

means:

> The agent cannot perform governed actions at all.

This distinction is useful for the governance dashboard.

---

# 47. Disable vs Tool Disable

Also distinguish:

```text
Agent Disable
```

from:

```text
Tool Disable
```

Example:

```text
Disable AGT-002

→ Only PaymentAgent stops
```

versus:

```text
Disable execute_payment

→ No agent can use that tool
```

These give administrators different emergency controls.

---

# 48. Governance Control Hierarchy

You can represent:

```text
GLOBAL / TOOL CONTROL

execute_payment
DISABLED

        ↓

Blocks payment tool for all agents
```

```text
AGENT CONTROL

AGT-002
DISABLED

        ↓

Blocks all governed actions for AGT-002
```

```text
PERMISSION CONTROL

AGT-002
payment.execute
REVOKED

        ↓

Blocks only payment.execute
```

This is a strong governance model.

---

# 49. Audit Timeline

Example:

```text
16:20:00
SUSPICIOUS_ACTIVITY_DETECTED

16:20:15
ADMIN_LOGIN
USR-ADMIN-01

16:20:20
AGENT_DISABLE_REQUESTED
AGT-002

16:20:20
ADMIN_AUTHORIZATION_ALLOWED

16:20:21
AGENT_DISABLED
AGT-002

16:20:21
APPROVAL_CANCELLED
APR-3001

16:21:03
ACTION_REQUESTED
AGT-002

16:21:03
ACTION_DENIED

Reason:
AGENT_DISABLED
```

This provides a complete incident timeline.

---

# 50. Governance Dashboard

The dashboard should eventually show:

```text
PaymentAgent
AGT-002

STATUS
🔴 DISABLED

Disabled By
USR-ADMIN-01

Disabled At
16:20:21

Reason
Suspicious payment activity

────────────────────

Permissions

payment.execute

────────────────────

Recent Activity

16:21:03
payment.execute
DENIED
AGENT_DISABLED
```

The permissions may remain assigned even though the agent is disabled.

That allows restoration without reconstructing the agent's configuration.

---

# 51. Re-Enabling an Agent

Re-enable should be a separate privileged action:

```text
agent.enable
```

Flow:

```text
Administrator
      ↓
Authenticate
      ↓
Authorize agent.enable
      ↓
Agent Registry
      ↓
DISABLED → ACTIVE
      ↓
Audit
```

Do not automatically re-enable an agent after some timeout unless explicitly designed that way.

---

# 52. Re-Enable Does Not Restore Old Approvals

Important:

Suppose:

```text
APR-3001

Cancelled because:
AGENT_DISABLED
```

Then administrator later:

```text
ENABLE AGT-002
```

Do not automatically restore:

```text
APR-3001
```

The agent should create a fresh request if necessary.

This prevents stale approvals from resurfacing.

---

# 53. Fail-Closed Behavior

If the governance platform cannot determine current agent status:

```text
Agent Registry unavailable
```

for a sensitive operation, recommended behavior is:

```text
Cannot verify ACTIVE
        ↓
DENY
```

not:

```text
Cannot verify
        ↓
Assume ACTIVE
```

---

# 54. Judge-Friendly Diagram

For the hackathon pitch, simplify everything to:

```text
Admin        Governance       Agent Registry       Agent       Bank
 │               │                  │                │           │
 │──────────────▶│                  │                │           │
 │ Disable Agent │                  │                │           │
 │               │─────────────────▶│                │           │
 │               │ ACTIVE→DISABLED │                │           │
 │               │◀─────────────────│                │           │
 │◀──────────────│ Success          │                │           │
 │               │                  │                │           │
 │               │                  │                │           │
 │               │                  │                │           │
 │               │◀─────────────────────────────────│           │
 │               │          Request Payment         │           │
 │               │─────────────────▶│                │           │
 │               │ Check Agent     │                │           │
 │               │◀─────────────────│                │           │
 │               │ DISABLED        │                │           │
 │               │─────────────────────────────────▶│           │
 │               │              DENIED              │           │
 │               │                                  │     X     │
 │               │                                  │ NO BANK   │
```

The audience immediately sees:

```text
Admin
 ↓
Kill Switch
 ↓
Agent Disabled
 ↓
Future Action
 ↓
Blocked
```

---

# 55. Security Properties Demonstrated

This diagram demonstrates:

```text
Emergency administrative control

Human accountability

Privileged administrative authorization

Agent lifecycle governance

Immediate authority revocation

Pending-work invalidation

Execution-time revalidation

Auditability

Fail-closed enforcement

Protected-service isolation
```

---

# 56. Governance Questions Answered

The system can answer:

```text
Who created the agent?

Who disabled the agent?

When was it disabled?

Why was it disabled?

Who had permission to disable it?

Which policy authorized the disable operation?

What permissions did the agent have?

What approvals were pending?

Which approvals were cancelled?

Did the agent attempt actions afterward?

Were those actions blocked?

Did any protected service receive them?
```

This directly connects back to:

> **Governance = Accountability**

---

# 57. Relationship to Previous Diagrams

The sequence set now demonstrates:

```text
06 — Account Read

LOW-RISK READ
→ ALLOW


07 — Payment Allow

LOW-RISK FINANCIAL ACTION
→ ALLOW


08 — Payment Approval

SENSITIVE FINANCIAL ACTION
→ REQUIRE_APPROVAL
→ RE-AUTHORIZE
→ ALLOW


09 — Payment Deny

HIGH-RISK FINANCIAL ACTION
→ DENY


10 — Agent Kill Switch

ADMINISTRATIVE EMERGENCY
→ DISABLE AGENT
→ BLOCK FUTURE AUTHORITY
```

Together, these show much more than simple authorization.

They demonstrate the **complete governed lifecycle of an AI agent**.

---

# 58. Diagram Title

Use:

**AI Agent Governance Platform — Agent Kill Switch Sequence**

Subtitle:

**Emergency agent disablement with pending-work invalidation and execution blocking**

---

# 59. Core Message

The core lifecycle is:

```text
Administrator
      ↓
Authenticated & Authorized
      ↓
Disable Agent
      ↓
ACTIVE → DISABLED
      ↓
Invalidate Pending Authority
      ↓
Audit
      ↓
Future Agent Request
      ↓
Check Current Agent Status
      ↓
DISABLED
      ↓
DENY
      ↓
NO EXECUTION
```

The most important architectural principle is:

> **Authorization is not permanent. An agent's authority must be revocable, and current governance state must be checked before sensitive execution.**

And the governance principle is:

> **A kill switch is useful only when disabling the agent actually prevents it from reaching protected systems.**
