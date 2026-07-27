# Design Decisions

## 1. Overview

This document records the major architectural and security decisions for the **AI Agent Governance and Authorization Gateway**.

The purpose is to answer:

> Why was the system designed this way?

Architecture diagrams describe **what** exists.

Design decisions explain **why** it exists.

Each important decision is documented using:

```text
Context
Decision
Rationale
Alternatives Considered
Trade-offs
Production Evolution
```

---

# 2. Core Design Philosophy

The central architectural principle is:

> AI agents may reason and propose actions, but they must not independently determine their own authority.

We separate:

```text
INTELLIGENCE
     │
     │ proposes actions
     ▼
────────────────────────
    GOVERNANCE
────────────────────────
     │
     │ authorizes actions
     ▼
   EXECUTION
```

The AI controls:

```text
Reasoning
Planning
Task decomposition
Tool selection
Action proposals
```

The governance platform controls:

```text
Identity
Permissions
Risk
Policies
Approval
Execution authority
Audit
```

This principle influences almost every design decision below.

---

# 3. Decision 1 — Externalize Authorization From AI Agents

## Context

An AI agent could theoretically determine whether it should perform an action through its system prompt.

Example:

```text
SYSTEM:

Never execute payments above ₹5,000.
```

The problem is that LLM behavior is probabilistic and may be influenced by:

```text
Prompt injection

Indirect prompt injection

Context poisoning

Model errors

Hallucination

Conflicting instructions
```

## Decision

Authorization is implemented outside the AI agent.

```text
AI Agent
    │
    │ Action Request
    ▼
Governance Gateway
    │
    ▼
Authorization
```

## Rationale

Security-sensitive authorization should not depend exclusively on probabilistic model behavior.

Even if the agent becomes manipulated:

```text
Compromised Agent
      ↓
Dangerous Request
      ↓
External Authorization
      ↓
DENY
```

## Alternatives Considered

### System Prompt Rules

```text
"Never perform unauthorized actions."
```

Rejected as the primary authorization mechanism because instructions can be ignored or manipulated.

### Agent-Side Authorization Code

Authorization logic could run inside each agent.

Rejected because compromised agents could potentially bypass it, and policy logic would become duplicated.

## Trade-offs

External authorization adds:

```text
Network calls

Latency

Infrastructure

Implementation complexity
```

But provides a much stronger security boundary.

## Production Evolution

Production systems could deploy authorization services close to workloads or use local policy evaluation to reduce latency while preserving external policy control.

---

# 4. Decision 2 — Use a Governance Gateway as the Policy Enforcement Point

## Context

Agents need access to sensitive enterprise capabilities.

Examples:

```text
account.read

transaction.read

payment.create

payment.execute
```

We need a component that actually enforces authorization decisions.

## Decision

Use the Governance Gateway as the primary:

```text
Policy Enforcement Point (PEP)
```

Architecture:

```text
Agent
  │
  ▼
Governance Gateway
  │
  ├── Authenticate
  ├── Check permissions
  ├── Evaluate risk
  ├── Request policy decision
  ├── Require approval
  └── Enforce decision
  │
  ▼
Protected Service
```

## Rationale

Central enforcement prevents authorization logic from being duplicated across every agent.

It also provides one place for:

```text
Authentication

Authorization

Rate limiting

Audit

Guardrails

Tool execution
```

## Alternatives Considered

### Every Agent Enforces Its Own Policies

Rejected because enforcement becomes distributed across untrusted workloads.

### Every Banking Service Implements Agent Governance

Possible in production, but significantly increases integration complexity.

## Trade-offs

The Gateway becomes security-critical infrastructure and a potential:

```text
Bottleneck

Failure point

Attack target
```

It therefore requires strong availability and security.

---

# 5. Decision 3 — Agents Cannot Directly Access Protected Banking APIs

## Context

Suppose authorization works like:

```text
Agent
   ↓
Governance
   ↓
ALLOW
   ↓
Agent
   ↓
Banking API
```

The agent remains responsible for respecting the decision.

A compromised agent could potentially bypass governance entirely.

## Decision

Protected services are accessible through the controlled execution path.

```text
Agent
   ↓
Governance Gateway
   ↓
Authorization
   ↓
Tool Executor
   ↓
Banking Service
```

The agent itself should not possess direct banking credentials.

## Rationale

Authorization only works when the enforcement point cannot be bypassed.

## Alternatives Considered

### Return Authorization Token to Agent

The agent could receive a short-lived capability token.

This is a valid architecture for some production systems, but introduces:

```text
Token theft

Replay

Scope management

Delegation complexity
```

For the MVP, server-side execution is simpler and easier to demonstrate securely.

## Trade-offs

The Gateway handles more execution traffic.

However, the security model becomes significantly easier to reason about.

---

# 6. Decision 4 — Separate Policy Decision From Policy Enforcement

## Context

A policy engine determines whether an action is allowed.

It should not necessarily execute that action.

## Decision

Separate:

```text
Policy Decision Point
```

from:

```text
Policy Enforcement Point
```

Architecture:

```text
Governance Gateway
       │
       ▼
Authorization Service
       │
       ▼
Policy Engine
       │
       ▼
Decision
       │
       ▼
Governance Gateway
       │
       ▼
Enforcement
```

## Rationale

The policy engine answers:

```text
Should this action be allowed?
```

The Gateway answers:

```text
What should happen because of that decision?
```

This creates clean separation of concerns.

---

# 7. Decision 5 — Use OPA as the Primary MVP Policy Engine

## Context

We researched:

```text
Open Policy Agent

Cedar

AWS IAM

Google Cloud IAM

Kubernetes RBAC
```

We need a practical policy engine for the hackathon implementation.

## Decision

Use **Open Policy Agent (OPA)** as the initial policy engine.

OPA evaluates authorization input and returns a decision.

Conceptually:

```text
Input
  │
  ▼
OPA
  │
  ▼
Decision
```

## Rationale

OPA provides:

```text
Policy-as-code

Separation of policy from application logic

Structured input

Deterministic evaluation

Rego policies

Mature ecosystem

Local deployment

Good container support
```

It is also suitable for demonstrating externalized authorization.

## Alternatives Considered

### Cedar

Cedar has a clean authorization model:

```text
Principal

Action

Resource

Context
```

and remains highly relevant to the architecture.

However, OPA provides greater flexibility for the initial hackathon prototype.

### Hard-Coded Authorization

Example:

```text
if agent == "PaymentAgent":
    allow()
```

Rejected because authorization logic becomes embedded throughout application code.

## Trade-offs

Rego introduces a learning curve.

Poorly written policies can still create vulnerabilities.

Therefore:

```text
Policy Engine
≠
Automatically Secure Policies
```

Policies still require testing and review.

---

# 8. Decision 6 — Keep the Authorization Model Policy-Engine Independent

## Context

OPA is our MVP implementation choice.

However, the entire system should not conceptually depend on Rego.

## Decision

The application uses a generic authorization model:

```text
Principal

Action

Resource

Context
```

Example:

```json
{
  "principal": {
    "type": "agent",
    "id": "AGT-002"
  },
  "action": "payment.execute",
  "resource": {
    "type": "payment",
    "id": "PAY-1001"
  },
  "context": {
    "risk": "MEDIUM",
    "humanApproval": false
  }
}
```

The authorization service translates this into the format required by the configured policy engine.

## Rationale

This prevents application code from becoming tightly coupled to OPA.

Future implementations could potentially support:

```text
OPA

Cedar

Cloud-native authorization

Custom policy engines
```

without redesigning the entire system.

## Trade-offs

An abstraction layer introduces some additional code.

For the MVP, the abstraction should remain lightweight.

---

# 9. Decision 7 — Use Fine-Grained Actions Instead of Broad Roles Alone

## Context

Traditional RBAC might define:

```text
SupportAgent

PaymentAgent

FraudAgent
```

But roles alone can become too broad.

## Decision

Authorization operates on explicit actions.

Examples:

```text
account.read

transaction.read

payment.create

payment.execute

payment.cancel
```

Roles may group permissions, but policies ultimately reason about actions.

## Rationale

Fine-grained permissions support least privilege.

Example:

```text
SupportAgent

account.read
transaction.read
```

instead of:

```text
SupportAgent

BANKING_ACCESS
```

## Trade-offs

More granular permissions mean more configuration.

However, they provide much better security control and auditability.

---

# 10. Decision 8 — Introduce Permission Boundaries

## Context

Administrative mistakes can accidentally grant excessive permissions.

Example:

```text
SupportAgent

Assigned:
account.read
payment.execute
```

## Decision

Agents may have maximum permission boundaries.

Effective permissions become:

```text
Assigned Permissions
        ∩
Permission Boundary
        =
Effective Permissions
```

Example:

```text
Assigned:
account.read
payment.execute

Boundary:
account.read
transaction.read

Effective:
account.read
```

## Rationale

Permission boundaries provide defense in depth against accidental or malicious permission grants.

## Alternatives Considered

### Trust Administrator Configuration

Rejected because configuration mistakes are a realistic security risk.

## Trade-offs

Permission calculation becomes slightly more complex.

The additional protection is worth that complexity.

---

# 11. Decision 9 — Default Deny

## Context

The system may encounter:

```text
Unknown agent

Unknown action

Unknown resource

Missing permission

Missing policy

Unexpected context
```

## Decision

When authorization cannot establish explicit permission:

```text
DENY
```

## Rationale

Unknown state must never silently create authority.

```text
No Explicit Authorization
        ↓
DENY
```

## Alternatives Considered

### Default Allow

Rejected because new or misconfigured actions could become accessible accidentally.

---

# 12. Decision 10 — Fail Closed for Sensitive Actions

## Context

Security dependencies can fail.

Examples:

```text
OPA unavailable

Risk Service unavailable

Permission database unavailable
```

## Decision

Sensitive operations fail closed.

```text
Cannot Safely Authorize
        ↓
NO EXECUTION
```

## Rationale

Availability failures must not become authorization bypasses.

## Trade-offs

Security infrastructure failures can temporarily reduce service availability.

For banking operations, protecting integrity is more important than silently executing without authorization.

---

# 13. Decision 11 — Separate Permissions From Policies

## Context

A permission answers:

> Does this agent possess this capability?

A policy answers:

> Can this capability be exercised under these conditions?

These are different questions.

## Decision

Maintain both layers.

Example:

```text
Permission:

PaymentAgent
→ payment.execute
```

Policy:

```text
payment.execute

LOW risk
→ ALLOW

MEDIUM risk
→ REQUIRE_APPROVAL

HIGH risk
→ DENY
```

## Rationale

Permission alone is too coarse.

Policy alone can become difficult to manage without a basic capability model.

Together:

```text
Permission
     +
Contextual Policy
     =
Authorization
```

---

# 14. Decision 12 — Risk Is Server-Side Trusted Context

## Context

An agent could claim:

```json
{
  "risk": "LOW"
}
```

## Decision

Authoritative risk is calculated by trusted governance infrastructure.

```text
Agent
→ Proposed Action

Risk Engine
→ Trusted Risk Context
```

## Rationale

An entity requesting authority must not determine the security classification of its own request.

## Trade-offs

Risk evaluation adds another processing step.

For the MVP, the risk engine can remain deterministic and simple.

---

# 15. Decision 13 — Use Deterministic Risk Scoring for the MVP

## Context

Risk could potentially be calculated using machine learning or another LLM.

## Decision

Use rule-based deterministic risk scoring initially.

Example:

```text
Small read operation
→ LOW

Sensitive financial action
→ MEDIUM

Large/unusual payment
→ HIGH
```

## Rationale

For a hackathon, deterministic scoring is:

```text
Explainable

Predictable

Testable

Fast to implement

Easy to demonstrate
```

## Alternatives Considered

### ML Risk Model

Potential future enhancement.

### LLM Risk Classification

Useful for generating signals, but not ideal as the sole authoritative security decision.

## Production Evolution

Production risk systems could combine:

```text
Fraud models

Transaction history

Device signals

Behavior analytics

Anomaly detection

Threat intelligence
```

---

# 16. Decision 14 — Human Approval Is a Policy Outcome

## Context

Some actions should not be automatically allowed or denied.

Example:

```text
MEDIUM-risk payment
```

## Decision

Authorization supports:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

## Rationale

Binary authorization is insufficient for autonomous enterprise agents.

Human-in-the-loop governance provides an intermediate control.

---

# 17. Decision 15 — Approval Does Not Automatically Execute the Action

## Context

Between request and human approval:

```text
Permissions may change

Agent may be disabled

Risk may change

Policy may change

Resource state may change
```

## Decision

After approval:

```text
Approval Recorded
       ↓
Re-Authorization
       ↓
Execution
```

not:

```text
Approval
   ↓
Execution
```

## Rationale

Approval is additional authorization context, not permanent authority.

This reduces stale authorization and TOCTOU risks.

## Trade-offs

Re-authorization creates additional requests and complexity.

For high-impact actions, this is justified.

---

# 18. Decision 16 — Bind Approval to the Exact Request

## Context

An approval for:

```text
₹1,000
→ Account A
```

must not authorize:

```text
₹10,000
→ Account B
```

## Decision

Approvals are bound to security-relevant request data.

Conceptually:

```text
Agent
+
Action
+
Resource
+
Parameters
        ↓
Canonical Representation
        ↓
Fingerprint
```

Approval references that fingerprint.

## Rationale

This prevents approval reuse and request modification.

---

# 19. Decision 17 — Use Request Fingerprinting

## Context

Security-sensitive parameters could theoretically change between authorization and execution.

## Decision

Generate a deterministic fingerprint of canonical request data.

Example conceptually:

```text
SHA-256(
    agent
    + action
    + resource
    + relevant parameters
)
```

Before execution:

```text
Authorized Fingerprint
        ==
Execution Fingerprint
```

must hold.

## Rationale

This cryptographically binds authorization to the intended operation.

## Trade-offs

Canonical serialization must be carefully defined.

---

# 20. Decision 18 — Use Idempotency for Financial Actions

## Context

Network failures can produce ambiguous states.

Example:

```text
Gateway
→ Execute Payment

Bank executes payment

Response is lost
```

Retrying blindly could create a duplicate payment.

## Decision

Financial execution requests use idempotency keys.

```text
KEY-123
      ↓
Payment Execution
```

Retry:

```text
KEY-123
      ↓
Return Existing Result
```

## Rationale

This protects against duplicate side effects caused by retries.

## Important Distinction

```text
Request Fingerprint
```

protects authorization integrity.

```text
Idempotency Key
```

protects execution integrity.

They solve different problems.

---

# 21. Decision 19 — Maintain a Trusted Tool Registry

## Context

Agents may discover or hallucinate tool names.

MCP may also expose tools dynamically.

## Decision

Governance maintains trusted mappings such as:

```text
Tool:
execute_payment

Action:
payment.execute

Service:
BankingPaymentService
```

The agent cannot define this mapping.

## Rationale

Natural-language tool descriptions must not become security authority.

```text
Agent Tool Name
      ↓
Trusted Registry
      ↓
Canonical Action
```

Unknown actions are denied.

---

# 22. Decision 20 — MCP Is a Tool Interface, Not an Authorization System

## Context

MCP can expose tools and resources to AI agents.

An agent seeing a tool does not mean the agent should be authorized to use it.

## Decision

MCP remains separate from authorization.

```text
MCP
→ Discovery / Invocation Interface

Governance
→ Authority
```

## Rationale

The fundamental rule is:

```text
Tool Visibility
≠
Tool Permission
```

Any sensitive MCP-backed action must still pass governance.

---

# 23. Decision 21 — Prefer Narrow Business Tools Over Generic Infrastructure Tools

## Context

We could expose:

```text
executeSQL(query)

executeShell(command)

httpRequest(url)
```

These are extremely powerful.

## Decision

Prefer narrow tools:

```text
getAccount(accountId)

getTransactions(accountId)

executePayment(paymentId)
```

## Rationale

Narrow tools reduce:

```text
Blast radius

Injection risk

Unexpected behavior

Authorization complexity
```

and make policies easier to understand.

---

# 24. Decision 22 — Apply Guardrails at Multiple Stages

## Context

Guardrails are often treated only as prompt filters.

That is insufficient.

## Decision

Guardrails exist:

```text
BEFORE
DURING
AFTER
```

an action.

### Before

```text
Input validation

Authentication

Permission checks

Rate limits

Context filtering
```

### During

```text
Policy enforcement

Tool restrictions

Risk controls

Approval

Execution constraints
```

### After

```text
Output filtering

PII masking

Audit

Monitoring
```

## Rationale

Different threats occur at different stages.

No single guardrail can protect the entire lifecycle.

---

# 25. Decision 23 — Use Output Guardrails

## Context

An agent may be authorized to call a service but should not necessarily receive every returned field.

## Decision

Responses may pass through output filtering.

```text
Banking Service
      ↓
Raw Result
      ↓
Output Guardrail
      ↓
Sanitized Result
      ↓
Agent
```

## Rationale

Authorization to perform an action does not imply unlimited access to all resulting data.

---

# 26. Decision 24 — Preserve Original Agent Identity

## Context

The Governance Gateway uses its own service credentials to call protected systems.

This creates confused-deputy risk.

## Decision

The original requesting principal remains part of the authorization context throughout execution.

```text
Original Principal:
AGT-002

Service Principal:
GovernanceGateway
```

These identities serve different purposes.

## Rationale

The Gateway's infrastructure privileges must never automatically become the agent's privileges.

---

# 27. Decision 25 — Treat Agents as Untrusted Workloads

## Context

Agents belong to our system, but they can still be:

```text
Compromised

Manipulated

Misconfigured

Incorrect
```

## Decision

Agent requests cross a trust boundary.

The Gateway independently establishes:

```text
Identity

Status

Permission

Risk

Approval
```

## Rationale

Trust should derive from verified evidence, not simply from the fact that an agent is internally deployed.

---

# 28. Decision 26 — Include an Agent Kill Switch

## Context

If an agent is compromised, permissions may need to be revoked immediately.

## Decision

Agents have runtime status such as:

```text
ACTIVE

DISABLED
```

Every protected request verifies agent status.

## Rationale

This gives administrators a simple incident-response mechanism.

```text
Suspicious Agent
      ↓
Disable
      ↓
Future Requests
      ↓
DENY
```

---

# 29. Decision 27 — Audit Decisions, Not Just Executions

## Context

If only successful actions are logged, important governance information disappears.

Example:

```text
Agent attempted unauthorized payment
→ DENY
```

This is security-relevant even though no payment occurred.

## Decision

Audit the lifecycle:

```text
ACTION_REQUESTED

PERMISSION_CHECKED

RISK_ASSESSED

POLICY_EVALUATED

AUTHORIZATION_DENIED

APPROVAL_REQUIRED

APPROVAL_GRANTED

EXECUTION_STARTED

EXECUTION_SUCCEEDED

EXECUTION_FAILED
```

## Rationale

Governance requires accountability for decisions as well as actions.

---

# 30. Decision 28 — Use Correlation IDs Across the Entire Flow

## Context

One request may touch:

```text
Gateway

Permission Service

Risk Engine

OPA

Approval Service

Tool Executor

Banking Service

Audit Service
```

## Decision

Every governance request receives a correlation/request ID.

Example:

```text
REQ-1001
```

The same identifier follows the request across components.

## Rationale

This simplifies:

```text
Debugging

Audit reconstruction

Monitoring

Incident investigation
```

---

# 31. Decision 29 — Use PostgreSQL for Governance State

## Context

The platform needs persistent storage for:

```text
Agents

Permissions

Policies

Approvals

Audit metadata

Tools

Requests

Execution records
```

## Decision

Use PostgreSQL.

## Rationale

The data is highly relational.

Examples:

```text
Agent
→ Permissions

Agent
→ Requests

Request
→ Authorization Decision

Request
→ Approval

Request
→ Audit Events
```

PostgreSQL provides:

```text
Transactions

Constraints

Relational integrity

Indexes

Mature tooling

JSON support where needed
```

## Alternatives Considered

### MongoDB

Flexible, but the governance model benefits strongly from relational integrity.

### In-Memory Storage

Suitable for very small demos but weak for demonstrating real governance state.

---

# 32. Decision 30 — Keep Audit Data Logically Append-Only

## Context

Audit history loses value if records can be casually edited.

## Decision

Application-level audit events are treated as append-only.

Normal application flows should not provide:

```text
UPDATE audit_event

DELETE audit_event
```

## Rationale

Historical governance evidence should represent what actually happened.

## Production Evolution

Production could use:

```text
Immutable log storage

WORM storage

SIEM

Cryptographic integrity

Separate audit infrastructure
```

---

# 33. Decision 31 — Start With a Modular Monolith

## Context

The architecture contains logical components:

```text
Agent Registry

Permission Service

Risk Engine

Authorization Service

Approval Service

Tool Registry

Audit Service
```

These could become independent microservices.

## Decision

For the hackathon, implement them primarily as modules inside one backend application.

Conceptually:

```text
Governance Backend

├── agents
├── permissions
├── authorization
├── risk
├── policies
├── approvals
├── tools
└── audit
```

## Rationale

The hackathon prioritizes:

```text
Speed

Correctness

Demonstrability

Lower operational complexity
```

Microservices would add:

```text
Service discovery

Network communication

Deployment complexity

Distributed tracing

More failure modes
```

without proving significantly more of the core idea.

## Production Evolution

High-scale components could later be extracted independently.

---

# 34. Decision 32 — Preserve Logical Service Boundaries

## Context

A modular monolith can become tightly coupled if modules freely access each other's internals.

## Decision

Maintain explicit internal boundaries even inside one deployment.

Example:

```text
Authorization Service
      ↓
Permission Service API

not

Authorization Service
      ↓
Direct random permission-table queries
```

## Rationale

This keeps future service extraction possible.

---

# 35. Decision 33 — Keep the Risk Engine Separate From Policy Evaluation

## Context

Risk and authorization are related but different.

## Decision

Risk Engine produces:

```text
Risk Context
```

Policy Engine consumes it.

```text
Action
   ↓
Risk Engine
   ↓
Risk = MEDIUM
   ↓
Policy Engine
   ↓
REQUIRE_APPROVAL
```

## Rationale

This separates:

```text
What is the risk?
```

from:

```text
What should we do about that risk?
```

A company can later change its policy without rewriting risk calculations.

---

# 36. Decision 34 — Keep Business Execution Separate From Governance

## Context

The governance system should not contain actual banking business logic.

## Decision

Separate:

```text
Governance
```

from:

```text
Banking Services
```

Governance decides:

```text
Can payment.execute happen?
```

Banking service decides:

```text
How is a payment executed?
```

## Rationale

This preserves clear system responsibilities.

---

# 37. Decision 35 — Use a Simulated Banking Service for the Hackathon

## Context

Real banking integrations introduce:

```text
Credentials

Compliance requirements

Financial risk

External dependencies

Integration complexity
```

## Decision

Build a controlled mock/demo banking service exposing realistic operations.

Example:

```text
GET /accounts/{id}

GET /accounts/{id}/transactions

POST /payments

POST /payments/{id}/execute
```

## Rationale

The project is demonstrating **AI governance**, not payment-processing infrastructure.

A simulated bank lets us demonstrate authorization safely.

---

# 38. Decision 36 — Use Docker Compose for the MVP Deployment

## Context

The system requires several runtime components.

Example:

```text
Frontend

Governance Backend

PostgreSQL

OPA

Demo Banking Service
```

## Decision

Use Docker Compose for local hackathon deployment.

```text
docker compose up
```

starts the system.

## Rationale

Docker Compose provides:

```text
Reproducibility

Simple setup

Service isolation

Networking

Fast development
```

without requiring Kubernetes.

## Alternatives Considered

### Kubernetes

Relevant for production, but unnecessary operational complexity for the MVP.

### Manual Local Processes

Simpler initially but harder to reproduce consistently across team machines.

---

# 39. Decision 37 — Do Not Use Kubernetes Merely to Demonstrate Complexity

## Context

We researched Kubernetes RBAC because it teaches useful authorization concepts.

That does not mean Kubernetes must be part of the implementation.

## Decision

Use lessons from Kubernetes RBAC without requiring Kubernetes deployment.

Examples adopted:

```text
Explicit subjects

Explicit permissions

Least privilege

Role separation

Declarative authorization concepts
```

## Rationale

Technology should solve an actual project requirement rather than exist only to make the architecture appear sophisticated.

---

# 40. Decision 38 — Research AWS IAM and Google Cloud IAM as Design References

## Context

AWS IAM and Google Cloud IAM solve authorization at massive scale.

## Decision

Use them as conceptual references rather than dependencies.

Concepts adopted include:

```text
Principal

Permission

Resource

Policy

Explicit deny

Permission boundaries

Least privilege
```

## Rationale

The project should learn from established authorization systems without attempting to recreate their entire complexity.

---

# 41. Decision 39 — Separate Governance Administration From Agent Runtime

## Context

Agents should not manage their own authority.

Dangerous:

```text
Agent
→ Grant itself payment.execute
```

## Decision

Administrative APIs are separate from runtime agent APIs.

Conceptually:

```text
Agent Runtime API

POST /agent-actions
```

versus:

```text
Administrative API

POST /agents
POST /permissions
POST /policies
POST /agents/{id}/disable
```

## Rationale

An agent must never control the system that defines its own authority.

---

# 42. Decision 40 — Separate Human and Agent Authentication

## Context

Humans and autonomous agents are different principal types.

## Decision

Model them separately.

```text
Principal

├── HUMAN
└── AGENT
```

They may use different authentication mechanisms.

## Rationale

This enables policies such as:

```text
Agent may request payment.

Human may approve payment.
```

without confusing the identities.

---

# 43. Decision 41 — Make Policies Versioned

## Context

Policies change over time.

If an audit record says:

```text
Policy allowed action.
```

we need to know which policy version made that decision.

## Decision

Policies have immutable versions.

Example:

```text
payment-policy

v1
v2
v3 ← ACTIVE
```

Authorization records store the evaluated version.

## Rationale

This supports:

```text
Auditability

Rollback

Debugging

Change history

Incident investigation
```

---

# 44. Decision 42 — Validate Policy Before Activation

## Context

A malformed policy could break authorization.

## Decision

Policy lifecycle:

```text
DRAFT
   ↓
VALIDATE
   ↓
TEST
   ↓
DEPLOY
   ↓
VERIFY
   ↓
ACTIVE
```

Only after successful deployment does the database mark the version active.

## Rationale

Database state should not claim that a policy is active when the policy engine failed to load it.

---

# 45. Decision 43 — Keep Previous Policy Version Available for Rollback

## Context

A syntactically valid policy may still behave incorrectly.

## Decision

Maintain previous versions.

```text
v3 ACTIVE
v4 INACTIVE
```

If v4 causes problems:

```text
Rollback
   ↓
v3 ACTIVE
```

## Rationale

Authorization changes can have large blast radius.

Fast rollback reduces operational risk.

---

# 46. Decision 44 — Do Not Use the LLM as Final Policy Decision Point

## Context

An LLM could theoretically receive:

```text
Agent = PaymentAgent
Action = payment.execute
Amount = ₹10,000

Should this be allowed?
```

and answer:

```text
Yes
```

## Decision

The final security decision comes from deterministic authorization logic and policy.

## Rationale

LLMs are:

```text
Probabilistic

Non-deterministic

Prompt-sensitive

Harder to formally test
```

## Allowed LLM Roles

An LLM may assist with:

```text
Risk signals

Classification

Explanation

Summarization

Threat analysis
```

but should not independently grant enterprise authority.

---

# 47. Decision 45 — Distinguish Authentication, Permission, Risk, and Policy

## Context

These concepts are often incorrectly combined.

## Decision

Treat them as separate stages.

```text
Authentication
→ Who are you?

Permission
→ What capabilities do you possess?

Risk
→ How dangerous is this request?

Policy
→ Is this action permitted under these conditions?
```

## Rationale

Separating them makes the architecture easier to:

```text
Understand

Test

Audit

Modify

Scale
```

---

# 48. Decision 46 — Authorization Produces Structured Decisions

## Context

Returning only:

```text
true
```

or:

```text
false
```

provides little governance context.

## Decision

Authorization returns structured information.

Example:

```json
{
  "decision": "REQUIRE_APPROVAL",
  "reasonCode": "MEDIUM_RISK_PAYMENT",
  "policyId": "payment-policy",
  "policyVersion": "3",
  "riskLevel": "MEDIUM"
}
```

## Rationale

Structured decisions improve:

```text
Auditability

UI explanations

Debugging

Analytics

Approval workflows
```

---

# 49. Decision 47 — Use Machine-Readable Reason Codes

## Context

Human-readable strings change easily.

Example:

```text
"Sorry, this action isn't currently permitted."
```

is poor for program logic.

## Decision

Use stable codes such as:

```text
MISSING_PERMISSION

AGENT_DISABLED

OUTSIDE_PERMISSION_BOUNDARY

HIGH_RISK

APPROVAL_REQUIRED

APPROVAL_EXPIRED

TOOL_DISABLED

POLICY_UNAVAILABLE
```

## Rationale

Reason codes support reliable:

```text
Frontend behavior

Metrics

Testing

Audit analysis

Alerts
```

---

# 50. Decision 48 — Separate Authorization From Execution Result

## Context

An authorized operation may still fail.

Example:

```text
Authorization:
ALLOW

Banking Service:
500 Internal Server Error
```

## Decision

Store separate states.

```text
Authorization Decision
        ↓
ALLOW

Execution Result
        ↓
FAILED
```

## Rationale

`ALLOW` means:

> The action may be attempted.

It does not mean:

> The action successfully completed.

---

# 51. Decision 49 — Model Request Lifecycle Explicitly

## Context

Agent actions can move through several states.

## Decision

Use an explicit state machine.

Example:

```text
RECEIVED
   ↓
VALIDATING
   ↓
AUTHORIZING
   │
   ├── DENIED
   │
   ├── PENDING_APPROVAL
   │
   └── AUTHORIZED
            ↓
        EXECUTING
         │     │
         ▼     ▼
     SUCCEEDED FAILED
```

## Rationale

Explicit states reduce ambiguous behavior and simplify audit trails.

---

# 52. Decision 50 — Model Approval Lifecycle Explicitly

## Decision

Approvals use states such as:

```text
PENDING

APPROVED

REJECTED

EXPIRED

CANCELLED

CONSUMED
```

## Rationale

An approval is not simply:

```text
boolean approved
```

It has lifecycle, expiration, identity, and context.

---

# 53. Decision 51 — Approval Is Single-Purpose

## Context

A human approval should not become a reusable privilege.

## Decision

Approval applies only to the request it was created for.

After successful use:

```text
APPROVED
   ↓
CONSUMED
```

## Rationale

This prevents approval from becoming a reusable authorization token.

---

# 54. Decision 52 — Rate Limit Per Agent and Action

## Context

Different actions have different risk.

Example:

```text
account.read
```

may tolerate more requests than:

```text
payment.execute
```

## Decision

Rate limits can consider:

```text
Agent

Action

Time Window
```

## Rationale

This helps control:

```text
Agent loops

DoS

Compromised credentials

Unexpected automation
```

---

# 55. Decision 53 — Validate Inputs With Explicit Schemas

## Context

LLM-generated tool arguments may be malformed or unexpected.

## Decision

Every action has an explicit input schema.

Example:

```text
payment.execute

paymentId:
required string

idempotencyKey:
required string
```

Unexpected fields may be rejected.

## Rationale

LLM output should always be treated as untrusted input.

---

# 56. Decision 54 — Keep Security-Relevant Context Server Controlled

## Context

Agents may send fields such as:

```text
role

risk

approved

tenant

permissions
```

## Decision

Security-relevant context is reconstructed from trusted services whenever possible.

```text
Agent Claims
      ↓
UNTRUSTED

Verified Identity
Database
Risk Service
Approval Service
      ↓
TRUSTED CONTEXT
```

## Rationale

A requester must not manufacture the evidence used to authorize itself.

---

# 57. Decision 55 — Prioritize Explainability

## Context

A governance platform must answer:

```text
Why was this allowed?

Why was this denied?

Which policy applied?

Who approved it?

What risk was calculated?
```

## Decision

Authorization decisions retain sufficient metadata to explain outcomes.

## Rationale

Explainability supports:

```text
Security

Compliance

Debugging

Human approval

Hackathon demonstration
```

---

# 58. Decision 56 — Optimize the Hackathon for Security Demonstration, Not Feature Count

## Context

It would be possible to add:

```text
Many agents

Many banking services

Complex ML

Multiple clouds

Kubernetes

Multiple policy engines
```

## Decision

Focus implementation effort on proving the governance architecture.

The MVP should strongly demonstrate:

```text
Agent Identity

Permissions

Permission Boundaries

Risk

OPA Policies

Human Approval

Re-Authorization

Kill Switch

Audit

Guardrails

Fail-Closed Behavior
```

## Rationale

A smaller system with strong architectural depth is more valuable than many shallow features.

---

# 59. MVP vs Production

The architecture intentionally distinguishes between hackathon implementation and production evolution.

| Area              | Hackathon MVP                 | Production Evolution                |
| ----------------- | ----------------------------- | ----------------------------------- |
| Backend           | Modular monolith              | Selective service extraction        |
| Deployment        | Docker Compose                | Kubernetes / cloud platform         |
| Policy            | OPA                           | OPA/Cedar/enterprise PDP            |
| Risk              | Rule-based                    | Fraud + anomaly models              |
| Authentication    | Simplified secure auth        | Workload identity, OAuth/OIDC, mTLS |
| Database          | PostgreSQL                    | HA PostgreSQL                       |
| Approval          | Basic workflow                | Enterprise approval integration     |
| Audit             | PostgreSQL append-only model  | Immutable/SIEM pipeline             |
| Secrets           | Environment/config management | Cloud secret manager                |
| Banking           | Simulated service             | Internal banking APIs               |
| Monitoring        | Basic logs/dashboard          | Metrics, tracing, SIEM              |
| Tool integration  | Controlled tools              | Enterprise APIs/MCP ecosystem       |
| Policy management | Basic versioning              | CI/CD + review + simulation         |

---

# 60. Decisions Explicitly Deferred

Some capabilities are intentionally not required for the first implementation.

```text
Full Kubernetes deployment

Multi-region architecture

Advanced ML risk scoring

Full SIEM integration

Enterprise IAM federation

Cryptographically immutable audit ledger

Multiple simultaneous policy engines

Complex multi-agent delegation

Production banking integration

Advanced policy simulation

Full compliance automation
```

These are valid future directions but not necessary to prove the core architecture.

---

# 61. Architecture Decision Summary

|  # | Decision                           | Primary Reason                              |
| -: | ---------------------------------- | ------------------------------------------- |
|  1 | External authorization             | Agents are not security authorities         |
|  2 | Governance Gateway as PEP          | Central enforcement                         |
|  3 | No direct banking access           | Prevent governance bypass                   |
|  4 | Separate PDP and PEP               | Separation of concerns                      |
|  5 | OPA for MVP                        | Flexible policy-as-code                     |
|  6 | Engine-independent model           | Avoid OPA lock-in                           |
|  7 | Fine-grained actions               | Least privilege                             |
|  8 | Permission boundaries              | Defense in depth                            |
|  9 | Default deny                       | Safe unknown state                          |
| 10 | Fail closed                        | Dependency failure must not bypass security |
| 11 | Permission + policy                | Capability and context are different        |
| 12 | Trusted risk context               | Agent cannot self-classify risk             |
| 13 | Deterministic MVP risk             | Explainability                              |
| 14 | Approval policy outcome            | Human-in-the-loop governance                |
| 15 | Re-authorize after approval        | Prevent stale authorization                 |
| 16 | Bind approval to request           | Prevent approval reuse                      |
| 17 | Request fingerprint                | Detect mutation                             |
| 18 | Idempotency                        | Prevent duplicate financial effects         |
| 19 | Trusted tool registry              | Prevent tool spoofing                       |
| 20 | MCP ≠ authorization                | Discovery does not imply authority          |
| 21 | Narrow tools                       | Reduce blast radius                         |
| 22 | Multi-stage guardrails             | Defense in depth                            |
| 23 | Output filtering                   | Data minimization                           |
| 24 | Preserve agent identity            | Prevent confused deputy                     |
| 25 | Agents are untrusted               | Zero-trust-style reasoning                  |
| 26 | Kill switch                        | Incident response                           |
| 27 | Audit decisions                    | Accountability                              |
| 28 | Correlation IDs                    | Traceability                                |
| 29 | PostgreSQL                         | Relational governance data                  |
| 30 | Append-only audit                  | Evidence integrity                          |
| 31 | Modular monolith                   | Hackathon speed                             |
| 32 | Logical boundaries                 | Future scalability                          |
| 33 | Separate risk/policy               | Independent evolution                       |
| 34 | Separate governance/business logic | Clear responsibilities                      |
| 35 | Simulated banking                  | Safe demonstration                          |
| 36 | Docker Compose                     | Reproducible MVP                            |
| 37 | No unnecessary Kubernetes          | Avoid accidental complexity                 |
| 38 | IAM systems as references          | Learn from mature designs                   |
| 39 | Separate admin/runtime APIs        | Agents cannot grant authority               |
| 40 | Human/agent principals             | Different trust models                      |
| 41 | Policy versioning                  | Audit + rollback                            |
| 42 | Validate before activation         | Safe policy deployment                      |
| 43 | Policy rollback                    | Reduce change risk                          |
| 44 | LLM not final PDP                  | Deterministic security                      |
| 45 | Separate auth concepts             | Clarity                                     |
| 46 | Structured decisions               | Explainability                              |
| 47 | Reason codes                       | Reliable automation                         |
| 48 | Authorization ≠ execution          | Accurate state                              |
| 49 | Request state machine              | Predictable lifecycle                       |
| 50 | Approval state machine             | Correct workflow                            |
| 51 | Single-purpose approvals           | Prevent reuse                               |
| 52 | Agent/action rate limits           | Control automation                          |
| 53 | Schema validation                  | Untrusted LLM output                        |
| 54 | Server-controlled context          | Prevent forged authority                    |
| 55 | Explainability                     | Governance/accountability                   |
| 56 | Security-focused MVP               | Demonstrate core innovation                 |

---

# 62. Architectural Principles

The decisions above can be reduced to several reusable principles.

## Principle 1 — Never Trust Agent Intent as Authority

```text
Agent:
"I should execute this."

Governance:
"That does not mean you may."
```

---

## Principle 2 — Authority Must Be Explicit

```text
Unknown
≠
Allowed
```

Instead:

```text
Unknown
→ DENY
```

---

## Principle 3 — Separate Intelligence From Authority

```text
LLM
→ Think

Policy
→ Decide Authority

Gateway
→ Enforce
```

---

## Principle 4 — Preserve Identity

```text
User
→ Agent A
→ Agent B
→ Gateway
```

must not collapse into:

```text
Gateway
```

The original security context matters.

---

## Principle 5 — Security Context Must Be Trusted

Do not trust the agent to declare:

```text
I am admin.

Risk is low.

Human approved this.

I belong to tenant X.
```

Verify independently.

---

## Principle 6 — Authorization Must Bind to Execution

```text
Authorized Action
        =
Executed Action
```

If important parameters change:

```text
Re-authorize.
```

---

## Principle 7 — Human Approval Is Additional Context

```text
Approval
≠
Unlimited Authority
```

It remains subject to policy.

---

## Principle 8 — Security Failure Must Not Become Permission

```text
OPA Down
≠
ALLOW

Database Error
≠
ALLOW

Unknown Agent
≠
ALLOW
```

---

## Principle 9 — Tool Access Is Authority

Giving an agent a tool is not merely a developer convenience.

It expands what the agent can potentially affect.

Therefore:

```text
Tool Design
=
Security Design
```

---

## Principle 10 — Governance Must Be Explainable

Every important action should eventually answer:

```text
WHO

requested

WHAT

against WHICH RESOURCE

under WHICH PERMISSION

with WHAT RISK

evaluated by WHICH POLICY

approved by WHOM

and produced WHAT RESULT?
```

---

# 63. Final Architecture Rationale

The project starts from a simple observation:

```text
Traditional Software

Developer determines execution flow
```

Autonomous agents change this model:

```text
AI Agent

Reasons
Plans
Chooses tools
Generates parameters
Initiates actions
```

This creates a new security problem.

Traditional authorization often assumes software behavior is relatively deterministic.

Agentic systems introduce a component whose behavior can change based on:

```text
Prompts

Context

External documents

Tool results

Model behavior

Other agents
```

Therefore we introduce a governance boundary:

```text
                  ┌─────────────────┐
                  │      USER       │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │    AI AGENT     │
                  │                 │
                  │ Reason          │
                  │ Plan            │
                  │ Propose         │
                  └────────┬────────┘
                           │
                           │ Action Request
                           ▼
══════════════════════════════════════════════
              GOVERNANCE BOUNDARY
══════════════════════════════════════════════
                           │
                           ▼
                  ┌─────────────────┐
                  │    IDENTITY     │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   PERMISSION    │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │      RISK       │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │     POLICY      │
                  └────────┬────────┘
                           │
               ┌───────────┼───────────┐
               │           │           │
               ▼           ▼           ▼
             DENY       APPROVAL     ALLOW
                           │           │
                           ▼           │
                       HUMAN           │
                           │           │
                           ▼           │
                    RE-AUTHORIZE       │
                           │           │
                           └─────┬─────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ TOOL EXECUTOR   │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ BANKING SERVICE │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │      AUDIT      │
                        └─────────────────┘
```

The resulting architecture does not attempt to make AI agents perfectly trustworthy.

Instead, it assumes:

```text
Agents can make mistakes.

Agents can be manipulated.

Agents can be compromised.
```

and designs the surrounding system accordingly.

The final security relationship is therefore:

```text
AI AUTONOMY
     │
     ▼
GOVERNED AUTHORITY
     │
     ▼
CONTROLLED EXECUTION
     │
     ▼
AUDITABLE OUTCOME
```

This is the fundamental architectural decision behind the project:

> **An AI agent may determine what action it wants to take, but trusted governance infrastructure determines whether the organization will allow that action to happen.**
