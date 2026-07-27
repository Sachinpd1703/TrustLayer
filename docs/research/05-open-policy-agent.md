# Open Policy Agent (OPA)

## Overview

**Open Policy Agent (OPA)** is an open-source, general-purpose **policy engine** that allows applications and infrastructure systems to make policy-based decisions.

OPA lets us separate **policy decision logic** from **application/business logic**.

A useful mental model is:

```text
Application / Agent
        ↓
"Can this action happen?"
        ↓
       OPA
        ↓
Evaluate Policy
        ↓
Decision
        ↓
ALLOW / DENY
```

The most important concept is:

> **OPA decides. OPA does not perform the business action.**

For example:

```text
PaymentAgent

wants to:

payment.execute
      ↓
Authorization Request
      ↓
OPA
      ↓
Evaluate Rego Policies
      ↓
ALLOW
```

OPA does **not** execute the payment.

Instead:

```text
OPA → ALLOW

Application
     ↓
Payment Service
     ↓
Execute Payment
```

Therefore:

```text
OPA
=
Policy Decision

NOT

Business Action Execution
```

This separation is fundamental to understanding OPA.

---

## Why It Exists

Consider a banking platform containing:

```text
Payment Service

Customer Service

Loan Service

Fraud Service

Support Service

AI Agents
```

Each service needs authorization rules.

Without centralized policy management, developers might write authorization directly inside application code:

```text
if agent == "PaymentAgent":
    if action == "payment.execute":
        if amount < 1000:
            if risk != "high":
                allow()
```

Another service might contain:

```text
if user.role == "manager":
    ...
```

Another:

```text
if service == "fraud-service":
    ...
```

Soon authorization logic becomes distributed throughout the codebase.

```text
Application A
    └── authorization logic

Application B
    └── authorization logic

Application C
    └── authorization logic

Agent Runtime
    └── authorization logic
```

This creates several problems:

* policies are difficult to find
* policies are difficult to review
* authorization becomes inconsistent
* security changes require application changes
* auditing becomes harder
* testing policies becomes harder

OPA introduces another architecture:

```text
Applications
     │
     │ Authorization Questions
     ▼
    OPA
     │
     │ Policies
     ▼
Policy Decision
```

Applications can then ask:

> Is this request allowed?

OPA evaluates policy and returns a decision.

---

# Policy as Code

OPA is based on the idea of **policy as code**.

Instead of burying authorization rules inside business code:

```text
PaymentService.java

CustomerService.java

AgentExecutor.java
```

we maintain policies separately.

Conceptually:

```text
Application Code
      │
      ├── Business Logic
      ├── API Logic
      └── Tool Execution

Policy
      │
      ├── Authorization Rules
      ├── Security Rules
      └── Organizational Rules
```

This separation makes policies easier to:

* review
* test
* version
* audit
* reuse
* update

---

# What Is a Policy?

A **policy** is a rule describing what should or should not be permitted.

Example:

> PaymentAgent may read customer account information.

Another:

> SupportAgent cannot execute payments.

Another:

> High-risk payments require additional approval.

Conceptually:

```text
WHO
 ↓
PaymentAgent

ACTION
 ↓
account.read

RESOURCE
 ↓
CustomerAccount

CONTEXT
 ↓
Authenticated Customer

        ↓

POLICY

        ↓

ALLOW / DENY
```

Policies describe authorization requirements.

They do not perform the underlying operation.

---

# What Is Rego?

## Definition

**Rego** is OPA's declarative policy language.

It is used to express rules over structured data.

Instead of telling the computer exactly **how** to execute a workflow, we describe conditions that must be true for a decision.

For example, conceptually:

```rego
package banking.authz

default allow := false

allow if {
    input.agent == "PaymentAgent"
    input.action == "account.read"
}
```

Meaning:

```text
Default:
DENY

Allow if:

agent = PaymentAgent

AND

action = account.read
```

The important idea is:

> **Rego describes policy decisions rather than business workflows.**

---

# Declarative vs Imperative

Traditional application code is generally imperative.

Example:

```text
Step 1
Do this

Step 2
Do that

Step 3
Call API

Step 4
Update database
```

Policy languages are more declarative.

We describe:

```text
ALLOW

IF

these conditions are true.
```

For example:

```rego
allow if {
    input.agent == "PaymentAgent"
    input.action == "payment.prepare"
}
```

We are describing the conditions under which `allow` becomes true.

---

# Input

OPA makes decisions using structured information supplied to it.

This request-specific information is generally accessed through:

```text
input
```

For example, the application might provide:

```json
{
  "agent": "PaymentAgent",
  "action": "account.read",
  "resource": {
    "type": "CustomerAccount",
    "id": "ACC-928"
  }
}
```

A Rego policy can inspect:

```text
input.agent

input.action

input.resource.type
```

Conceptually:

```text
Application
     ↓
JSON Input
     ↓
OPA
     ↓
Rego evaluates input
```

---

# Rich Authorization Input

For an AI-agent system, we could send richer context.

Example:

```json
{
  "principal": {
    "id": "AGT-001",
    "type": "ai_agent",
    "risk_level": "high"
  },
  "action": "payment.execute",
  "resource": {
    "type": "payment",
    "account_id": "ACC-928"
  },
  "context": {
    "amount": 750,
    "customer_authenticated": true,
    "beneficiary_trusted": true,
    "transaction_risk": "low"
  }
}
```

OPA can evaluate policies against these attributes.

This gives us:

```text
Principal
    +
Action
    +
Resource
    +
Context
      ↓
Policy Evaluation
      ↓
Decision
```

This is very similar to the authorization model we discovered while studying AWS IAM.

---

# Data

OPA also supports policy evaluation using data separate from the request-specific `input`.

Conceptually:

```text
INPUT
=
Information about this request

DATA
=
Information available to policies
```

For example, data might contain:

```json
{
  "agents": {
    "AGT-001": {
      "department": "payments",
      "status": "active"
    }
  }
}
```

The policy can reason over both:

```text
input
   +
data
   +
policy
   ↓
decision
```

---

# Important Design Consideration: Fresh Data

Not every piece of dynamic business information should automatically be stored inside OPA.

For example:

```text
Current Account Balance

Real-Time Fraud Score

Latest Approval Status
```

may change frequently.

The application may retrieve trusted current information and include the relevant attributes in the authorization request.

Conceptually:

```text
Application
     ↓
Retrieve Trusted Context
     ↓
Build Authorization Input
     ↓
OPA
```

This helps avoid treating OPA as the application's transactional database.

---

# Default Deny

A strong authorization design generally begins with:

```text
DEFAULT

DENY
```

In Rego, a simplified example is:

```rego
default allow := false
```

Then specific rules grant permission.

```rego
allow if {
    input.principal.id == "PaymentAgent"
    input.action == "account.read"
}
```

Therefore:

```text
No applicable allow rule
        ↓
DENY
```

This follows the same security principle we observed in AWS IAM and Kubernetes RBAC.

---

# Simple OPA Example

Suppose:

```text
PaymentAgent

may:

account.read
```

A simplified policy:

```rego
package banking.authz

default allow := false

allow if {
    input.agent == "PaymentAgent"
    input.action == "account.read"
}
```

Input:

```json
{
  "agent": "PaymentAgent",
  "action": "account.read"
}
```

Result conceptually:

```json
{
  "allow": true
}
```

Now:

```json
{
  "agent": "SupportAgent",
  "action": "account.read"
}
```

If no rule allows it:

```text
allow = false
```

---

# Principal + Action + Resource

A stronger authorization model also evaluates the resource.

```rego
package banking.authz

default allow := false

allow if {
    input.principal == "PaymentAgent"
    input.action == "account.read"
    input.resource.type == "customer_account"
}
```

Now authorization depends on:

```text
WHO

PaymentAgent

WHAT ACTION

account.read

WHAT RESOURCE

customer_account
```

---

# Context-Aware Authorization

OPA becomes more powerful when policies evaluate context.

Suppose:

> PaymentAgent may automatically execute payments below $1,000 when the customer is authenticated and transaction risk is low.

Conceptually:

```rego
package banking.payments

default allow := false

allow if {
    input.principal == "PaymentAgent"
    input.action == "payment.execute"
    input.context.amount < 1000
    input.context.customer_authenticated == true
    input.context.risk == "low"
}
```

Input:

```json
{
  "principal": "PaymentAgent",
  "action": "payment.execute",
  "context": {
    "amount": 500,
    "customer_authenticated": true,
    "risk": "low"
  }
}
```

Result:

```text
ALLOW
```

But:

```json
{
  "principal": "PaymentAgent",
  "action": "payment.execute",
  "context": {
    "amount": 5000,
    "customer_authenticated": true,
    "risk": "high"
  }
}
```

would not satisfy that allow rule.

Result:

```text
DENY
```

or, with a richer policy design, the application could receive a decision indicating that additional approval is required.

---

# Beyond Boolean Allow / Deny

OPA decisions do not have to be limited to a single boolean.

Policies can produce structured decisions.

For our architecture, this could be extremely useful.

Instead of:

```text
ALLOW

or

DENY
```

we might conceptually produce:

```json
{
  "allow": false,
  "reason": "Human approval required",
  "required_controls": [
    "human_approval"
  ]
}
```

or:

```json
{
  "allow": true,
  "risk_tier": "low",
  "required_controls": []
}
```

This allows policy evaluation to participate in richer guardrail workflows.

The application still decides how to enforce the returned result.

---

# OPA Does Not Execute

This is the most important distinction in this entire file.

Suppose:

```text
Agent A

asks:

Can I read customer account?
```

OPA evaluates:

```text
Principal:
Agent A

Action:
account.read

Resource:
Customer-928
```

and returns:

```text
YES
```

OPA does **not** then retrieve the account.

The architecture is:

```text
Agent
  ↓
Application / Enforcement Layer
  ↓
OPA
  ↓
ALLOW
  ↓
Application
  ↓
Account API
  ↓
Customer Data
```

OPA's job ends at the policy decision.

Similarly:

```text
Agent
  ↓
"I want to execute payment."
  ↓
OPA
  ↓
ALLOW
```

OPA does **not** call:

```text
payment.execute()
```

The trusted application or tool gateway performs the action.

---

# Policy Decision Point (PDP)

OPA commonly acts as a **Policy Decision Point**.

The PDP answers:

> Based on the available policy and input, what is the authorization decision?

Conceptually:

```text
Authorization Request
        ↓
       PDP
        ↓
Evaluate Policy
        ↓
Decision
```

OPA can fill this role.

---

# Policy Enforcement Point (PEP)

A **Policy Enforcement Point** is the component that enforces the policy decision.

Example:

```text
Agent
  ↓
Tool Gateway
  ↓
Ask OPA
  ↓
DENY
  ↓
Tool Gateway blocks request
```

Here:

```text
OPA
=
Policy Decision Point
```

and:

```text
Tool Gateway
=
Policy Enforcement Point
```

This distinction is fundamental.

---

# PDP vs PEP

Consider:

```text
PaymentAgent
      ↓
transferMoney()
      ↓
Tool Gateway
      ↓
OPA
```

OPA responds:

```text
DENY
```

Then:

```text
Tool Gateway
      ↓
DO NOT CALL PAYMENT API
```

OPA made the decision.

The gateway enforced it.

Therefore:

```text
              Agent
                │
                ▼
        Policy Enforcement Point
          (Tool Gateway)
                │
                │ Authorization Request
                ▼
               OPA
       Policy Decision Point
                │
                │ Decision
                ▼
        Policy Enforcement Point
                │
        ┌───────┴────────┐
        │                │
      ALLOW             DENY
        │                │
        ▼                ▼
   Execute Tool         Block
```

---

# Why Enforcement Location Matters

Imagine this architecture:

```text
Agent
   ├──────────────→ Payment API
   │
   └──────────────→ OPA
```

This is dangerous.

The agent might bypass OPA and directly call the Payment API.

A stronger architecture is:

```text
Agent
   ↓
Tool Gateway
   ↓
OPA Check
   ↓
ALLOW?
   ↓
Payment API
```

The sensitive tool should only be reachable through a trusted enforcement point, or the downstream service should independently enforce authorization.

This leads to an important principle:

> **A policy engine is useful only when its decisions are reliably enforced.**

---

# OPA and AI Tool Calls

Recall our agent architecture:

```text
AI Agent

Tools:

getAccount()

getTransactions()

createPayment()

executePayment()

blockCard()
```

Instead of exposing every tool directly:

```text
Agent
   ↓
executePayment()
   ↓
Payment API
```

we can introduce an authorization layer:

```text
Agent
   ↓
Proposed Tool Call
   ↓
Tool Gateway
   ↓
Build Authorization Request
   ↓
OPA
   ↓
Policy Decision
   ↓
ALLOW / DENY
   ↓
Tool Gateway
   ↓
Execute or Block
```

This is highly relevant to our hackathon.

---

# Example: Account Read

Agent wants:

```text
getAccount(
    account = "ACC-928"
)
```

Gateway creates:

```json
{
  "principal": {
    "id": "SupportAgent"
  },
  "action": "account.read",
  "resource": {
    "type": "account",
    "id": "ACC-928"
  }
}
```

OPA evaluates policy.

Result:

```text
ALLOW
```

Gateway then calls:

```text
Account Service
```

OPA never touches the customer account itself.

---

# Example: Payment Execution

Agent proposes:

```text
executePayment(
    account = "ACC-928",
    amount = 15000
)
```

Gateway builds:

```json
{
  "principal": {
    "id": "PaymentAgent"
  },
  "action": "payment.execute",
  "resource": {
    "type": "account",
    "id": "ACC-928"
  },
  "context": {
    "amount": 15000,
    "risk": "high",
    "human_approval": false
  }
}
```

Policy might require:

```text
amount >= threshold
        ↓
human approval required
```

OPA decision:

```json
{
  "allow": false,
  "reason": "Human approval required",
  "required_controls": [
    "human_approval"
  ]
}
```

Gateway does not execute the payment.

---

# Human Approval with OPA

OPA itself does not need to become the approval workflow system.

Instead:

```text
PaymentAgent
     ↓
Tool Gateway
     ↓
OPA
     ↓
Decision:
Approval Required
     ↓
Approval Service
     ↓
Human Reviewer
     ↓
APPROVED
```

Then the application can make another authorization request containing:

```json
{
  "context": {
    "human_approval": true
  }
}
```

OPA evaluates again.

```text
Policy Conditions Satisfied
        ↓
ALLOW
```

Then:

```text
Tool Gateway
     ↓
Payment Service
```

This keeps responsibilities separated.

---

# OPA and Risk

OPA can use risk information as policy input.

For example:

```json
{
  "principal": "PaymentAgent",
  "action": "payment.execute",
  "context": {
    "amount": 500,
    "risk": "high"
  }
}
```

Policy:

```rego
allow if {
    input.principal == "PaymentAgent"
    input.action == "payment.execute"
    input.context.risk == "low"
}
```

High risk:

```text
DENY
```

or:

```text
REQUIRE ADDITIONAL CONTROL
```

depending on the decision model.

OPA does not necessarily calculate the risk itself.

A separate risk engine might calculate:

```text
Risk Score = 87
```

and provide that trusted information to the authorization layer.

Architecture:

```text
Transaction
     ↓
Risk Engine
     ↓
Risk Score
     ↓
Authorization Input
     ↓
OPA
     ↓
Policy Decision
```

This separates:

```text
Risk Engine
=
How risky is this?
```

from:

```text
OPA
=
Given that risk,
what does policy permit?
```

---

# OPA and Governance

Governance determines policies such as:

> High-risk payments require human approval.

That rule can be translated into machine-enforceable policy.

```text
Governance
     ↓
Policy Requirement
     ↓
Rego Policy
     ↓
OPA
     ↓
Runtime Decision
```

Therefore:

```text
GOVERNANCE

Defines what should happen.

        ↓

POLICY

Represents the rule.

        ↓

OPA

Evaluates the rule.

        ↓

ENFORCEMENT POINT

Enforces the result.
```

This connects our earlier research topics.

---

# OPA and Guardrails

OPA can act as part of an **action or tool guardrail**.

Architecture:

```text
AI Agent
   ↓
Proposed Action
   ↓
Guardrail Layer
   ↓
OPA
   ↓
Policy Decision
   ↓
ALLOW / DENY / REQUIRE CONTROL
```

OPA is therefore useful for enforcing policies around:

```text
Tool Access

Resource Access

Sensitive Actions

Environment Restrictions

Risk Requirements

Approval Requirements
```

OPA is not necessarily responsible for every type of guardrail.

For example:

```text
Prompt Injection Detection

PII Detection

Rate Limiting

Content Moderation
```

may be implemented by other components.

---

# OPA and MCP

Model Context Protocol (MCP) can expose tools and resources to AI applications.

Suppose an MCP server exposes:

```text
getAccount

getTransactions

createPayment

executePayment
```

A dangerous architecture would allow:

```text
Agent
   ↓
MCP Tool
   ↓
Sensitive Backend
```

without independent authorization.

A stronger architecture could introduce policy enforcement:

```text
Agent
   ↓
MCP Tool Request
   ↓
Authorization / Tool Gateway
   ↓
OPA
   ↓
ALLOW / DENY
   ↓
Backend Service
```

or authorization could be enforced inside the MCP server/tool implementation itself.

The key principle is:

> **Tool availability is not the same as authorization to use the tool for every request.**

Even if an agent can discover:

```text
executePayment
```

that does not mean every call should be permitted.

---

# Tool Discovery vs Tool Authorization

This distinction is important.

### Tool Discovery

```text
Agent:

"What tools exist?"
```

Response:

```text
getAccount

createPayment

executePayment
```

### Tool Authorization

```text
Agent:

"Can I executePayment
for Account-928
for this amount
under this context?"
```

Response:

```text
ALLOW / DENY
```

Therefore:

```text
Tool Available
      ≠
Tool Authorized
```

This is particularly important for MCP-based agent systems.

---

# Centralized vs Distributed OPA

OPA can be integrated in different deployment patterns.

One approach is a central policy service:

```text
Service A ──┐
Service B ──┼──→ OPA Service
Service C ──┘
```

Advantages can include centralized management.

But network dependency can affect latency and availability.

Another approach is running OPA close to the application:

```text
Application
    │
    ├── App Container
    │
    └── OPA
```

Conceptually:

```text
Application
    ↓
Local Policy Decision
    ↓
OPA
```

This can reduce authorization latency and dependency on a central network call.

Policy distribution then becomes an important concern.

---

# Policy Distribution

If many OPA instances exist:

```text
OPA-1

OPA-2

OPA-3

OPA-4
```

they need appropriate policies and data.

Organizations therefore need mechanisms for:

```text
Policy Versioning

Policy Distribution

Policy Updates

Rollback

Testing

Auditability
```

This connects directly with AI governance.

A governance system should know:

```text
Which policy version was active?

Who changed it?

Who approved it?

When was it deployed?

Which agents use it?
```

---

# Policy Testing

Policies are security-critical code and should be tested.

Suppose policy says:

> SupportAgent may never execute payments.

We should test:

```text
SupportAgent
+
payment.execute
      ↓
DENY
```

and:

```text
PaymentAgent
+
account.read
      ↓
expected decision
```

Testing policies reduces the chance that a policy change accidentally grants excessive authority.

---

# Policy Versioning

Policies should be version controlled.

Example:

```text
payment-policy

v1
 ↓
v2
 ↓
v3
```

Changes should be traceable.

For example:

```text
Version:
v3

Change:
Payment threshold
$500 → $1,000

Changed By:
Developer-21

Approved By:
Risk Team

Timestamp:
...
```

This connects OPA with governance and auditability.

---

# Policy Decision Logging

For sensitive agent actions, we may want to record:

```text
Agent

Action

Resource

Policy Version

Input Context

Decision

Reason

Timestamp
```

Example:

```text
Agent:
PaymentAgent

Action:
payment.execute

Resource:
ACC-928

Amount:
15000

Policy:
payment-policy-v3

Decision:
DENY

Reason:
Human approval required
```

This becomes valuable during audits and incident investigations.

Sensitive input should be handled carefully so logs do not themselves expose unnecessary customer data.

---

# Fail-Closed vs Fail-Open

Suppose the application cannot reach its policy decision point.

What should happen?

### Fail Open

```text
OPA unavailable
      ↓
Allow action anyway
```

For sensitive operations, this can be dangerous.

### Fail Closed

```text
OPA unavailable
      ↓
DENY / BLOCK
```

For high-risk banking actions, fail-closed behavior is generally much safer.

However, availability requirements matter.

Organizations need to design appropriate behavior based on action risk.

For example:

```text
Read public FAQ
      ↓
Different availability strategy
```

versus:

```text
Execute $50,000 payment
      ↓
Fail closed
```

---

# OPA vs Hardcoded Authorization

Without OPA:

```text
PaymentService

if role == ...
if amount ...
if risk ...
if environment ...
```

and:

```text
LoanService

if role == ...
if loanAmount ...
if approval ...
```

Authorization logic becomes embedded throughout the application.

With policy separation:

```text
Payment Service ──┐
Loan Service ─────┼──→ Policy Decision
Agent Gateway ────┘
```

Policies can be managed separately from business code.

---

# OPA vs IAM

Cloud IAM answers infrastructure-level questions such as:

```text
Can PaymentServiceRole
access this AWS resource?
```

OPA can evaluate application-specific questions:

```text
Can PaymentAgent

execute payment

for Account-928

for $15,000

with risk = high

without approval?
```

Therefore:

```text
Cloud IAM
   ↓
Infrastructure Authorization

OPA
   ↓
Application / Business Policy
```

They can complement each other.

Example:

```text
AI Agent
   ↓
OPA Authorization
   ↓
Payment Service
   ↓
AWS IAM
   ↓
AWS Infrastructure
```

---

# OPA vs Kubernetes RBAC

Kubernetes RBAC is well suited to:

```text
Can ServiceAccount A

get pods

in namespace B?
```

OPA can evaluate richer contextual rules such as:

```text
Can PaymentAgent

execute payment

IF

amount < threshold

AND

risk = low

AND

customer authenticated

AND

beneficiary trusted?
```

OPA is more general-purpose and policy-driven.

In fact, OPA can also be integrated with Kubernetes admission-control scenarios through projects such as OPA Gatekeeper.

---

# OPA vs Cedar

OPA and Cedar both allow authorization logic to be separated from application code, but they are different technologies.

OPA:

```text
General-purpose policy engine

Language:
Rego
```

Cedar:

```text
Authorization-focused policy language

Designed around:
Principal
Action
Resource
Context
```

We will examine Cedar in the next research file.

For now, remember:

```text
OPA
=
Policy Engine + Rego
```

while:

```text
Cedar
=
Authorization Policy Language
```

with Cedar used by authorization systems such as Amazon Verified Permissions.

---

# Real-World Banking Architecture

Consider our AI banking platform:

```text
                    CUSTOMER

                        │
                        ▼

                   AI AGENT

                        │
                        │ Proposed Tool Call
                        ▼

                 TOOL GATEWAY
                     (PEP)

                        │
                        │ Authorization Input
                        ▼

                      OPA
                     (PDP)

                        │
                        │ Policy Decision
                        ▼

                 TOOL GATEWAY

                ┌───────┴───────┐
                │               │
              ALLOW            DENY
                │               │
                ▼               ▼
         Risk / Approval       Block
                │
                ▼
          Backend Service
                │
                ▼
           Cloud / IAM
                │
                ▼
          Banking System
```

A richer implementation might perform risk evaluation before asking OPA:

```text
Agent
 ↓
Tool Gateway
 ↓
Validate Request
 ↓
Risk Engine
 ↓
Authorization Context
 ↓
OPA
 ↓
Policy Decision
 ↓
Approval if Required
 ↓
Execute
 ↓
Audit
```

---

# Example Complete Flow

Customer says:

> Send $15,000 to John.

Agent proposes:

```text
executePayment(
    amount = 15000,
    beneficiary = "John"
)
```

The gateway does **not** execute immediately.

It builds authorization context:

```json
{
  "principal": {
    "id": "PaymentAgent",
    "type": "ai_agent"
  },
  "action": "payment.execute",
  "resource": {
    "type": "customer_account",
    "id": "ACC-928"
  },
  "context": {
    "amount": 15000,
    "beneficiary_trusted": false,
    "customer_authenticated": true,
    "risk": "high",
    "human_approval": false
  }
}
```

OPA evaluates policy.

Conceptual decision:

```json
{
  "allow": false,
  "reason": "High-risk payment requires approval",
  "required_controls": [
    "human_approval"
  ]
}
```

The Tool Gateway blocks execution.

```text
OPA
 ↓
Approval Required
 ↓
Approval Workflow
 ↓
Authorized Human
 ↓
APPROVED
```

The application then re-evaluates with:

```text
human_approval = true
```

OPA evaluates again.

```text
ALLOW
```

Only then:

```text
Tool Gateway
      ↓
Payment Service
      ↓
Banking System
```

This demonstrates the complete principle:

> **Agent proposes. Policy engine decides. Enforcement layer enforces. Business service executes.**

---

# Advantages

## Separation of Policy and Application Code

Authorization rules do not need to be scattered throughout business logic.

## Centralized Policy Model

Multiple applications can follow consistent policies.

## Declarative Policies

Rego allows policies to describe desired authorization conditions.

## Context-Aware Authorization

Policies can evaluate:

```text
Principal

Action

Resource

Risk

Environment

Approval

Attributes
```

## General Purpose

OPA can be used across:

```text
APIs

Microservices

Kubernetes

CI/CD

Infrastructure

Agent Gateways
```

## Testability

Policies can be independently tested.

## Version Control

Policies can be managed like code.

## Auditing

Policy decisions and changes can be logged.

## Default Deny

Authorization can follow secure default-deny behavior.

## Structured Decisions

Policies can return richer information than only true/false.

---

# Limitations

## Rego Learning Curve

Rego differs from normal imperative programming languages and requires learning its declarative model.

## Policy Complexity

Large policy sets can become difficult to understand.

## Policy Distribution

Distributed OPA instances require reliable policy distribution and version management.

## Availability

If authorization depends on OPA, availability architecture becomes important.

## Performance

Authorization introduces another evaluation step, although OPA is designed for policy evaluation and can be deployed close to applications.

## Bad Input Produces Bad Decisions

OPA can only evaluate the information it receives.

If an application provides incorrect or untrusted context:

```text
risk = low
```

when the real risk is high, policy may produce the wrong result.

Trusted context construction is therefore critical.

## Enforcement Is External

OPA does not automatically prevent an application from ignoring its decision.

The architecture must ensure decisions are actually enforced.

This is one of the most important limitations to understand.

---

# Key Takeaways

1. **OPA is an open-source general-purpose policy engine.**

2. OPA separates policy decision logic from application logic.

3. **Rego** is OPA's declarative policy language.

4. OPA evaluates structured:

```text
input
+
data
+
policy
```

to produce a decision.

5. A strong authorization model can use:

```text
Principal
+
Action
+
Resource
+
Context
```

6. OPA can implement default-deny authorization.

7. OPA decisions can be richer than simple allow/deny.

8. OPA commonly acts as a:

> **Policy Decision Point (PDP)**

9. A gateway, middleware, API, or service can act as:

> **Policy Enforcement Point (PEP)**

10. The distinction is:

```text
OPA
=
DECIDES

Application / Gateway
=
ENFORCES

Backend Service
=
EXECUTES
```

11. **OPA does not execute payments, modify customer records, or call business tools merely because a policy allows them.**

12. Tool availability does not equal tool authorization.

13. OPA can be placed between AI agents and sensitive tools.

14. Risk information can be supplied to OPA as trusted policy context.

15. Human approval can be represented as an authorization requirement.

16. Policy changes should be tested, versioned, approved, and audited.

17. High-risk operations should generally fail closed if authorization cannot be performed.

18. OPA complements cloud IAM rather than necessarily replacing it.

---

# How We'll Use This in Our Project

OPA introduces the architectural component that connects most of our research so far.

We started with:

```text
AI Agents
     ↓
Can take actions
```

Then:

```text
Governance
     ↓
Defines ownership and rules
```

Then:

```text
Guardrails
     ↓
Enforce boundaries
```

Then:

```text
Risk Management
     ↓
Determines how dangerous
an action may be
```

Then IAM taught us:

```text
Principal
+
Action
+
Resource
+
Context
```

OPA now gives us:

```text
                     GOVERNANCE

                         │
                         ▼

                       POLICY

                         │
                         ▼

User
 ↓
AI Agent
 ↓
Proposed Action
 ↓
Tool Gateway / PEP
 ↓
Build Authorization Request
 ↓
Risk Context
 ↓
OPA / PDP
 ↓
Evaluate Rego Policy
 ↓
Decision
 │
 ├──── DENY ─────────→ Block + Audit
 │
 ├──── APPROVAL ─────→ Human Workflow
 │
 └──── ALLOW
          ↓
       Tool/API
          ↓
    Backend Service
          ↓
     Cloud IAM/RBAC
          ↓
       Resource
          ↓
        Audit
```

This suggests a possible central component for our hackathon:

```text
        AI AGENT GOVERNANCE GATEWAY

                  │
        ┌─────────┼──────────┐
        │         │          │
        ▼         ▼          ▼

   Identity     Policy      Risk

        │         │          │
        └─────────┼──────────┘
                  │
                  ▼

            OPA Decision

                  │
        ┌─────────┼──────────┐
        │         │          │
        ▼         ▼          ▼

      ALLOW     DENY      APPROVAL

        │
        ▼

      TOOL
```

Every sensitive tool request could carry an authorization envelope such as:

```json
{
  "principal": {},
  "action": "",
  "resource": {},
  "context": {}
}
```

OPA evaluates the request against centrally managed policy.

The agent never gets final authority over whether its own sensitive action is permitted.

That gives us the architectural principle we should carry forward:

> **Never ask the AI agent whether it is authorized. Ask an independent authorization system.**

And:

> **Never let the policy engine perform the business action. Let it decide whether the trusted application may perform it.**

The next topic, **Cedar**, gives us another way of expressing authorization policies, built much more explicitly around:

```text
principal

action

resource

context
```

That will allow us to compare:

```text
OPA + Rego

vs

Cedar
```

and determine which ideas are most appropriate for our hackathon architecture.

---

# Sources

* Open Policy Agent — Official Documentation
* Open Policy Agent — Policy Language / Rego Documentation
* Open Policy Agent — Policy Testing
* Open Policy Agent — REST API
* Open Policy Agent — Policy Decision Documentation
* Open Policy Agent — Management and Bundle APIs
* Open Policy Agent — Decision Logs
* Open Policy Agent — External Data
* OPA Gatekeeper — Kubernetes-native policy controller built using OPA
* Cloud Native Computing Foundation (CNCF) — Open Policy Agent project information
