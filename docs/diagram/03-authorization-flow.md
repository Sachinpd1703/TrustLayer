# 03 — Authorization Flow Diagram

## 1. Purpose

This diagram describes the complete authorization decision flow for an AI agent action.

It answers:

> What happens between an AI agent requesting an action and that action actually reaching a protected banking service?

The core flow is:

```text
Agent Request
      ↓
Authentication
      ↓
Agent Status
      ↓
Tool Validation
      ↓
Permission
      ↓
Permission Boundary
      ↓
Risk Assessment
      ↓
Policy Evaluation
      ↓
ALLOW / DENY / REQUIRE_APPROVAL
      ↓
Controlled Execution
      ↓
Audit
```

---

# 2. Diagram Type

Unlike the previous architecture diagrams, this should primarily be a **flowchart**.

Use:

* Rectangles for processing steps
* Diamonds for decisions
* Rounded rectangles for START/END
* Document/event shapes for audit events if desired
* Dashed arrows for approval/re-authorization loops

Recommended orientation:

```text
TOP
 ↓
 ↓
 ↓
BOTTOM
```

A vertical flow makes authorization logic easier to understand.

---

# 3. Start

Begin with:

```text
╭───────────────────────────╮
│   AI Agent Action Request │
╰─────────────┬─────────────╯
              │
              ▼
```

Example request:

```text
Agent: AGT-002
Tool: execute_payment
Resource: PAY-1001
Parameters:
    amount = $2,500
```

The request represents **intent**, not authorization.

---

# 4. Assign Request ID

First governance operation:

```text
┌─────────────────────────┐
│ Create Request Context  │
│                         │
│ Request ID              │
│ Timestamp               │
│ Correlation ID          │
└────────────┬────────────┘
             │
             ▼
```

Example:

```text
REQ-1001
```

This ID follows the action throughout the entire lifecycle.

---

# 5. Basic Request Validation

Next:

```text
◇─────────────────────────◇
│ Request Schema Valid?   │
◇────────────┬────────────◇
             │
       ┌─────┴─────┐
       │           │
      NO          YES
       │           │
       ▼           ▼
```

If invalid:

```text
DENY
Reason:
INVALID_REQUEST
```

Then:

```text
Audit
 ↓
Return Error
```

---

# 6. Rate Limit Check

Next:

```text
◇─────────────────────────◇
│ Rate Limit Exceeded?    │
◇────────────┬────────────◇
             │
       ┌─────┴─────┐
      YES          NO
       │            │
       ▼            ▼

   REJECT       Continue
```

Reason code:

```text
RATE_LIMIT_EXCEEDED
```

This protects against:

```text
Agent loops
Credential abuse
DoS
Runaway automation
```

---

# 7. Authenticate Agent

Next processing step:

```text
┌───────────────────────────┐
│ Authenticate Credential   │
│                           │
│ Resolve Trusted Principal │
└─────────────┬─────────────┘
              │
              ▼
```

Then decision:

```text
◇─────────────────────────◇
│ Authentication Valid?   │
◇────────────┬────────────◇
```

### NO

```text
DENY

Reason:
AUTHENTICATION_FAILED
```

### YES

Continue with the verified principal.

Important:

```text
Request Body Agent ID
        ≠
Authenticated Identity
```

Trusted identity comes from authentication.

---

# 8. Check Agent Registration

Next:

```text
◇─────────────────────────◇
│ Agent Registered?       │
◇────────────┬────────────◇
```

NO:

```text
DENY

UNKNOWN_AGENT
```

YES:

continue.

---

# 9. Check Kill Switch / Agent Status

Next:

```text
◇─────────────────────────◇
│ Agent ACTIVE?           │
◇────────────┬────────────◇
```

NO:

```text
DENY

AGENT_DISABLED
```

YES:

continue.

This check should happen early.

---

# 10. Resolve Tool

The agent may request:

```text
execute_payment
```

The Tool Registry resolves this into:

```text
Tool:
execute_payment

Canonical Action:
payment.execute

Target:
Payment Service
```

Flow:

```text
┌──────────────────────────┐
│ Resolve Tool Registry    │
│                          │
│ Tool → Canonical Action  │
└────────────┬─────────────┘
             │
             ▼
```

Then:

```text
◇─────────────────────────◇
│ Tool Exists?            │
◇────────────┬────────────◇
```

NO:

```text
DENY

UNKNOWN_TOOL
```

---

# 11. Check Tool Status

Next:

```text
◇─────────────────────────◇
│ Tool Enabled?           │
◇────────────┬────────────◇
```

NO:

```text
DENY

TOOL_DISABLED
```

YES:

continue.

This provides another kill switch at the capability level.

---

# 12. Validate Tool Parameters

Validate generated arguments against the trusted tool schema.

```text
┌──────────────────────────┐
│ Validate Tool Arguments  │
│ Against Input Schema     │
└────────────┬─────────────┘
             │
             ▼

◇─────────────────────────◇
│ Arguments Valid?        │
◇────────────┬────────────◇
```

NO:

```text
DENY

INVALID_TOOL_ARGUMENTS
```

YES:

continue.

Remember:

> LLM-generated tool arguments are untrusted input.

---

# 13. Build Canonical Action

At this point, governance knows:

```text
Principal
Action
Resource
Parameters
```

Example:

```text
Principal:
AGT-002

Action:
payment.execute

Resource:
PAY-1001

Amount:
$2,500
```

Create:

```text
┌───────────────────────────┐
│ Build Canonical Request   │
└─────────────┬─────────────┘
              │
              ▼
```

---

# 14. Generate Request Fingerprint

Next:

```text
┌───────────────────────────┐
│ Generate Request          │
│ Fingerprint               │
│                           │
│ SHA-256(canonical input)  │
└─────────────┬─────────────┘
              │
              ▼
```

Conceptually:

```text
Principal
+
Action
+
Resource
+
Security-Relevant Parameters

          ↓

Canonical Representation

          ↓

SHA-256

          ↓

Request Fingerprint
```

This fingerprint will later bind:

```text
Authorization
Approval
Execution
```

to the same request.

---

# 15. Permission Check

Next:

```text
┌──────────────────────────┐
│ Load Assigned            │
│ Permissions              │
└────────────┬─────────────┘
             │
             ▼

◇─────────────────────────◇
│ Has Requested           │
│ Permission?             │
◇────────────┬────────────◇
```

Example:

```text
Agent:
PaymentAgent

Requested:
payment.execute
```

If missing:

```text
DENY

MISSING_PERMISSION
```

This should happen before policy evaluation.

---

# 16. Permission Boundary Check

Even if permission exists:

```text
◇──────────────────────────◇
│ Inside Permission       │
│ Boundary?               │
◇────────────┬────────────◇
```

Example:

```text
Assigned:
payment.execute

Boundary:
account.read
transaction.read
```

Result:

```text
DENY

OUTSIDE_PERMISSION_BOUNDARY
```

Effective authority is:

```text
Assigned Permission
        ∩
Boundary
```

---

# 17. Resource-Level Validation

Next determine whether the agent can access the requested resource.

```text
◇──────────────────────────◇
│ Resource Scope Valid?   │
◇────────────┬────────────◇
```

This may consider:

```text
Tenant

Customer

Account

Region

Ownership

Case assignment
```

Example:

```text
Agent belongs to:
Tenant A

Resource belongs to:
Tenant B
```

Result:

```text
DENY

RESOURCE_SCOPE_VIOLATION
```

---

# 18. Risk Assessment

Now pass trusted context to the Risk Engine.

```text
┌──────────────────────────┐
│       Risk Engine        │
│                          │
│ Evaluate Request Risk    │
└────────────┬─────────────┘
             │
             ▼
```

Inputs:

```text
Principal

Action

Resource

Amount

Frequency

Historical signals

Transaction characteristics
```

Output:

```text
LOW
MEDIUM
HIGH
```

For example:

```text
payment.execute
$2,500
      ↓
MEDIUM
```

---

# 19. Risk Engine Failure

Include:

```text
◇──────────────────────────◇
│ Risk Assessment         │
│ Successful?             │
◇────────────┬────────────◇
```

NO:

For a sensitive action:

```text
DENY / ERROR

RISK_ENGINE_UNAVAILABLE
```

Do **not** do:

```text
Risk Engine Failed
      ↓
Assume LOW
```

The system fails closed.

---

# 20. Build Authorization Context

Now combine all trusted information.

```text
┌────────────────────────────┐
│ Build Authorization Input  │
│                            │
│ Principal                  │
│ Action                     │
│ Resource                   │
│ Permissions                │
│ Risk                       │
│ Approval Context           │
│ Request Context            │
└─────────────┬──────────────┘
              │
              ▼
```

Example conceptually:

```json
{
  "principal": {
    "type": "AGENT",
    "id": "AGT-002"
  },
  "action": "payment.execute",
  "resource": {
    "type": "PAYMENT",
    "id": "PAY-1001"
  },
  "context": {
    "risk": "MEDIUM",
    "approved": false
  }
}
```

---

# 21. Send to OPA

Next:

```text
┌──────────────────────────┐
│ Evaluate Policy          │
│                          │
│ Authorization → OPA      │
└────────────┬─────────────┘
             │
             ▼
```

OPA acts as:

```text
Policy Decision Point
```

---

# 22. OPA Availability

Check:

```text
◇──────────────────────────◇
│ OPA Evaluation          │
│ Successful?             │
◇────────────┬────────────◇
```

NO:

```text
DENY / ERROR

POLICY_ENGINE_UNAVAILABLE
```

Important:

```text
OPA unavailable
      ↓
FAIL CLOSED
```

Never:

```text
OPA unavailable
      ↓
ALLOW
```

---

# 23. Policy Decision

This is the central branch.

Use a large diamond:

```text
                 ◇────────────────────◇
                 │   POLICY DECISION  │
                 ◇─────────┬──────────◇
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
           ALLOW         DENY      REQUIRE_APPROVAL
```

Make this visually prominent.

---

# 24. DENY Branch

If OPA returns:

```text
DENY
```

flow:

```text
DENY
 │
 ▼
┌──────────────────────────┐
│ Record Decision          │
│                          │
│ Decision = DENY          │
│ Reason Code              │
│ Policy Version           │
│ Risk                     │
└────────────┬─────────────┘
             │
             ▼
          AUDIT
             │
             ▼
╭──────────────────────────╮
│ Return DENIED to Agent   │
╰──────────────────────────╯
```

Absolutely no Tool Executor call occurs.

---

# 25. ALLOW Branch

If:

```text
ALLOW
```

do not immediately execute.

First perform execution-time checks.

```text
ALLOW
  │
  ▼
┌──────────────────────────┐
│ Prepare Authorized       │
│ Execution                │
└────────────┬─────────────┘
             │
             ▼
```

Then continue to request integrity verification.

---

# 26. REQUIRE_APPROVAL Branch

If:

```text
REQUIRE_APPROVAL
```

flow:

```text
REQUIRE_APPROVAL
       │
       ▼
┌──────────────────────────┐
│ Create Approval Request  │
│                          │
│ Request ID               │
│ Fingerprint              │
│ Agent                    │
│ Action                   │
│ Resource                 │
│ Risk                     │
│ Expiration               │
└────────────┬─────────────┘
             │
             ▼
```

Approval state:

```text
PENDING
```

---

# 27. Send to Human Approver

```text
Approval Request
       │
       ▼
┌──────────────────────────┐
│     Human Approver       │
│                          │
│ Review Context           │
└────────────┬─────────────┘
             │
             ▼
```

Decision:

```text
◇──────────────────────────◇
│ Human Decision?         │
◇────────────┬────────────◇
```

Branches:

```text
APPROVE

REJECT

EXPIRE
```

---

# 28. Human Rejects

Flow:

```text
REJECT
  │
  ▼
Approval = REJECTED
  │
  ▼
Audit
  │
  ▼
Return DENIED
```

Reason:

```text
APPROVAL_REJECTED
```

---

# 29. Approval Expires

If the approval is not completed in time:

```text
PENDING
  ↓
EXPIRED
```

Result:

```text
DENY

APPROVAL_EXPIRED
```

No execution.

---

# 30. Human Approves

This is critical.

Do **not** draw:

```text
Human Approves
      ↓
Tool Executor
```

Instead:

```text
Human Approves
      │
      ▼
┌──────────────────────────┐
│ Record Approval          │
│                          │
│ APPROVED                 │
│ Approver ID              │
│ Timestamp                │
│ Fingerprint              │
└────────────┬─────────────┘
             │
             ▼
        RE-AUTHORIZE
```

---

# 31. Re-Authorization

After approval, return to authorization.

```text
APPROVED
   │
   ▼
┌──────────────────────────┐
│ Refresh Security Context │
└────────────┬─────────────┘
             │
             ▼
```

Re-check at minimum:

```text
Agent still ACTIVE?

Permission still exists?

Still inside boundary?

Approval still valid?

Request unchanged?

Risk still acceptable?

Policy still allows?
```

Then:

```text
Authorization Service
        ↓
       OPA
```

with:

```text
approved = true
```

---

# 32. Why Re-Authorization Matters

Show a small annotation:

```text
Permission may have changed
Agent may have been disabled
Policy may have changed
Risk may have changed
Request may have changed
```

Therefore:

```text
Approval
≠
Automatic Execution
```

---

# 33. Second Policy Decision

After approval:

```text
OPA
 │
 ▼
◇──────────────────────────◇
│ Re-Authorization       │
│ Decision               │
◇────────────┬────────────◇
```

Possible:

```text
ALLOW

DENY
```

If DENY:

```text
REAUTHORIZATION_FAILED
```

and stop.

---

# 34. Request Integrity Check

Both direct `ALLOW` and approved `ALLOW` eventually merge here.

```text
       Direct ALLOW
            │
            │
            ▼
        ┌───────┐
        │ MERGE │
        └───┬───┘
            ▲
            │
Approved + Reauthorized
```

Then:

```text
◇──────────────────────────◇
│ Request Fingerprint     │
│ Still Matches?          │
◇────────────┬────────────◇
```

NO:

```text
DENY

REQUEST_MODIFIED
```

YES:

continue.

---

# 35. Idempotency Check

For financial side effects:

```text
◇──────────────────────────◇
│ Idempotency Key         │
│ Already Used?           │
◇────────────┬────────────◇
```

If YES with same fingerprint:

```text
Return Previous Result
```

Do not execute again.

If YES with different fingerprint:

```text
REJECT

IDEMPOTENCY_CONFLICT
```

If NO:

continue.

---

# 36. Final Tool Validation

Before execution:

```text
◇──────────────────────────◇
│ Tool Still Enabled?     │
◇────────────┬────────────◇
```

NO:

```text
DENY

TOOL_DISABLED
```

YES:

continue.

This protects against tool status changing while an approval was pending.

---

# 37. Controlled Execution

Only now:

```text
┌──────────────────────────┐
│      TOOL EXECUTOR       │
│                          │
│ Execute Authorized       │
│ Action                   │
└────────────┬─────────────┘
             │
             ▼
```

Then:

```text
┌──────────────────────────┐
│ Protected Banking API    │
└────────────┬─────────────┘
             │
             ▼
```

This is the first point where the financial/business operation actually occurs.

---

# 38. Execution Result

Decision:

```text
◇──────────────────────────◇
│ Execution Successful?   │
◇────────────┬────────────◇
```

Branches:

```text
YES

NO
```

Remember:

```text
Authorization ALLOW
≠
Execution Success
```

---

# 39. Execution Failure

If the Banking Service fails:

```text
Execution
   ↓
FAILED
```

Record:

```text
EXECUTION_FAILED
```

This does **not** mean authorization was denied.

Keep the two states separate.

---

# 40. Output Guardrail

If execution returns data:

```text
Banking API
      │
      ▼
┌──────────────────────────┐
│    Output Guardrail      │
│                          │
│ Field Filtering          │
│ PII Masking              │
│ Secret Removal           │
└────────────┬─────────────┘
             │
             ▼
```

Only sanitized output returns to the agent.

---

# 41. Final Audit

Before completing:

```text
┌──────────────────────────┐
│ Record Final Audit Event │
│                          │
│ Request                  │
│ Principal                │
│ Action                   │
│ Risk                     │
│ Policy                   │
│ Approval                 │
│ Execution Result          │
└────────────┬─────────────┘
             │
             ▼
```

---

# 42. End

Success:

```text
╭──────────────────────────╮
│ Return Result to Agent   │
│                          │
│ SUCCEEDED                │
╰──────────────────────────╯
```

Denied:

```text
╭──────────────────────────╮
│ Return Decision to Agent │
│                          │
│ DENIED                   │
╰──────────────────────────╯
```

Approval pending:

```text
╭──────────────────────────╮
│ Return Approval Required │
│                          │
│ PENDING_APPROVAL         │
╰──────────────────────────╯
```

---

# 43. Recommended Complete Flow

The main `.drawio` should approximately follow:

```text
╭─────────────────────────╮
│ AI Agent Action Request │
╰────────────┬────────────╯
             ▼
┌─────────────────────────┐
│ Create Request Context  │
└────────────┬────────────┘
             ▼
◇─────────────────────────◇
│ Request Valid?          │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
◇─────────────────────────◇
│ Rate Limit OK?          │──NO──▶ REJECT → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
┌─────────────────────────┐
│ Authenticate Agent      │
└────────────┬────────────┘
             ▼
◇─────────────────────────◇
│ Authenticated?          │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
◇─────────────────────────◇
│ Agent Registered?       │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
◇─────────────────────────◇
│ Agent ACTIVE?           │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
┌─────────────────────────┐
│ Resolve Tool → Action   │
└────────────┬────────────┘
             ▼
◇─────────────────────────◇
│ Tool Exists + Enabled?  │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
◇─────────────────────────◇
│ Arguments Valid?        │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
┌─────────────────────────┐
│ Canonicalize Request    │
│ + Generate Fingerprint  │
└────────────┬────────────┘
             ▼
◇─────────────────────────◇
│ Has Permission?         │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
◇─────────────────────────◇
│ Inside Boundary?        │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
◇─────────────────────────◇
│ Resource Scope Valid?   │──NO──▶ DENY → AUDIT → END
◇────────────┬────────────◇
            YES
             ▼
┌─────────────────────────┐
│ Risk Assessment         │
└────────────┬────────────┘
             ▼
◇─────────────────────────◇
│ Risk Engine Available?  │──NO──▶ FAIL CLOSED
◇────────────┬────────────◇
            YES
             ▼
┌─────────────────────────┐
│ Build Trusted Policy    │
│ Context                 │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ OPA Policy Evaluation   │
└────────────┬────────────┘
             ▼
◇─────────────────────────◇
│ OPA Available?          │──NO──▶ FAIL CLOSED
◇────────────┬────────────◇
            YES
             ▼

        ◇────────────────◇
        │    DECISION    │
        ◇───────┬────────◇
                │
      ┌─────────┼──────────────────┐
      │         │                  │
      ▼         ▼                  ▼
    DENY      ALLOW       REQUIRE_APPROVAL
      │         │                  │
      ▼         │                  ▼
    AUDIT       │          Create Approval
      │         │                  │
      ▼         │                  ▼
     END        │             Human Review
                │                  │
                │        ┌─────────┼─────────┐
                │        │         │         │
                │      REJECT   EXPIRE    APPROVE
                │        │         │         │
                │        ▼         ▼         ▼
                │      AUDIT     AUDIT   Re-Authorize
                │        │         │         │
                │        ▼         ▼         │
                │       END       END        │
                │                            ▼
                │                      OPA Decision
                │                            │
                │                      ┌─────┴─────┐
                │                      │           │
                │                    DENY        ALLOW
                │                      │           │
                │                      ▼           │
                │                    AUDIT         │
                │                      │           │
                │                      ▼           │
                │                     END          │
                │                                  │
                └─────────────────┬────────────────┘
                                  ▼
                         Verify Fingerprint
                                  │
                                  ▼
                         ◇────────────────◇
                         │ Matches?       │
                         ◇───────┬────────◇
                            NO   │   YES
                             │   │
                             ▼   ▼
                           DENY Idempotency Check
                             │        │
                             ▼        ▼
                           AUDIT  Final Tool Check
                                      │
                                      ▼
                               ┌───────────────┐
                               │ Tool Executor │
                               └───────┬───────┘
                                       ▼
                               Banking Service
                                       │
                                       ▼
                                Execution Result
                                       │
                                       ▼
                                Output Guardrail
                                       │
                                       ▼
                                     Audit
                                       │
                                       ▼
                              ╭────────────────╮
                              │ Return Result  │
                              ╰────────────────╯
```

---

# 44. Simplified Judge-Friendly Version

The full flow above is useful for documentation, but it can become large.

For presentations, use this simplified version:

```text
Agent Action
     │
     ▼
Authenticate
     │
     ▼
Agent Active?
     │
     ▼
Tool Valid?
     │
     ▼
Permission?
     │
     ▼
Inside Boundary?
     │
     ▼
Risk Assessment
     │
     ▼
OPA Policy
     │
     ▼
┌───────────┬────────────────────┬────────────┐
│           │                    │            │
▼           ▼                    ▼
DENY       ALLOW          REQUIRE APPROVAL
│           │                    │
▼           │                    ▼
STOP        │                  HUMAN
            │                    │
            │               Re-authorize
            │                    │
            └─────────┬──────────┘
                      ▼
              Verify Integrity
                      │
                      ▼
               Tool Executor
                      │
                      ▼
                Banking API
                      │
                      ▼
              Output Guardrail
                      │
                      ▼
                    Audit
```

This version is excellent for explaining the project verbally.

---

# 45. Important DENY Reasons

You can place a small side panel:

```text
DENY REASONS

AUTHENTICATION_FAILED

UNKNOWN_AGENT

AGENT_DISABLED

UNKNOWN_TOOL

TOOL_DISABLED

INVALID_TOOL_ARGUMENTS

MISSING_PERMISSION

OUTSIDE_PERMISSION_BOUNDARY

RESOURCE_SCOPE_VIOLATION

HIGH_RISK

POLICY_DENIED

APPROVAL_REJECTED

APPROVAL_EXPIRED

REQUEST_MODIFIED

IDEMPOTENCY_CONFLICT
```

This demonstrates explainable authorization.

---

# 46. Trust Context

Add another small annotation:

```text
TRUSTED SECURITY CONTEXT

Identity
← Authentication

Agent Status
← Agent Registry

Permissions
← Permission Service

Tool Mapping
← Tool Registry

Risk
← Risk Engine

Approval
← Approval Service

Policy Decision
← OPA
```

Then contrast it with:

```text
UNTRUSTED

Agent-declared identity
Agent-declared permissions
Agent-declared risk
Agent-declared approval
Agent-generated tool arguments
```

---

# 47. Key Security Principle

Put this near the OPA decision:

```text
AI Agent
   │
   │ proposes
   ▼
Action

Governance
   │
   │ authorizes
   ▼
Execution
```

The agent never moves directly from:

```text
Intent
→
Execution
```

Instead:

```text
Intent
→
Validation
→
Authorization
→
Controlled Execution
```

---

# 48. Key Human Approval Principle

Visually emphasize:

```text
Human Approval
      │
      ▼
Re-Authorization
      │
      ▼
Execution
```

not:

```text
Human Approval
      │
      ▼
Execution
```

This is an important security differentiator.

---

# 49. Key OPA Principle

Label the OPA box:

```text
OPEN POLICY AGENT

Policy Decision Point

DECIDES
but
DOES NOT EXECUTE
```

Then:

```text
OPA
 ↓
Decision
 ↓
Governance Gateway
 ↓
Enforcement
```

---

# 50. Diagram Title

Use:

**AI Agent Governance Platform — Authorization Flow**

Subtitle:

**Identity → Permission → Risk → Policy → Approval → Controlled Execution**

---

# 51. Final Message

The entire diagram should communicate one fundamental rule:

> **An AI agent requesting an action is only the beginning of the process—not permission to execute it.**

The security equation is:

```text
Verified Identity
      +
Active Agent
      +
Valid Tool
      +
Permission
      +
Permission Boundary
      +
Resource Scope
      +
Trusted Risk
      +
Policy Decision
      +
Human Approval (when required)
      +
Request Integrity
      =
Authorized Execution
```

And:

```text
Failure of any required control
        ↓
DENY / STOP
        ↓
NO PROTECTED ACTION
```
