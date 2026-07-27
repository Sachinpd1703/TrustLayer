# Cedar Policy Language

## Overview

**Cedar** is an open-source policy language designed specifically for expressing **authorization policies**.

It was created by AWS and is used by services such as **Amazon Verified Permissions**.

Cedar is designed around a simple authorization question:

> **Is this principal allowed to perform this action on this resource in this context?**

The core mental model is:

```text
Principal
    +
Action
    +
Resource
    +
Context
       ↓
Authorization Policies
       ↓
Decision
       ↓
ALLOW / DENY
```

For an AI-agent system:

```text
Principal:
PaymentAgent

Action:
payment.execute

Resource:
CustomerAccount-928

Context:
amount = 500
risk = low

        ↓

Cedar Authorization

        ↓

ALLOW / DENY
```

The most important idea is:

> **Cedar describes authorization policy. It does not execute the requested business action.**

If Cedar determines:

```text
ALLOW
```

another component still needs to perform:

```text
executePayment()
```

Therefore:

```text
Cedar
=
Authorization Policy

Application / Gateway
=
Policy Enforcement

Backend
=
Action Execution
```

---

## Why It Exists

Applications often contain authorization directly inside business code.

For example:

```java
if (user.getRole().equals("admin")) {
    allow();
}
```

or:

```java
if (
    agent.equals("PaymentAgent")
    && amount < 1000
    && risk.equals("low")
) {
    executePayment();
}
```

This mixes two different responsibilities:

```text
Business Logic
      +
Authorization Logic
```

As systems grow, authorization becomes scattered across:

```text
Payment Service

Loan Service

Customer Service

Agent Gateway

Support Service

Admin Service
```

This makes policies harder to:

* understand
* audit
* modify
* review
* test
* reuse

Cedar separates authorization policy from normal application code.

Instead of:

```text
Application
    ↓
Hardcoded authorization conditions
```

we move toward:

```text
Application
    ↓
Authorization Request
    ↓
Policy Evaluation
    ↓
ALLOW / DENY
```

---

# Policy ≠ Application Code

This distinction is fundamental.

Application code performs operations:

```text
createPayment()

getCustomer()

updateLoan()

blockCard()
```

Authorization policy describes whether those operations are permitted.

For example:

```text
PaymentAgent

may

execute payment

on

PaymentResource
```

The policy does not execute the payment.

Therefore:

```text
POLICY

describes

WHAT IS ALLOWED
```

while:

```text
APPLICATION CODE

performs

WHAT HAPPENS
```

---

# Core Authorization Model

Cedar authorization revolves around four important concepts:

```text
Principal

Action

Resource

Context
```

A request can therefore be modeled as:

```text
Can

PRINCIPAL

perform

ACTION

on

RESOURCE

given

CONTEXT?
```

Example:

```text
Can

PaymentAgent

perform

payment.execute

on

Account-928

when

amount = 500
risk = low?
```

---

# Principal

## Definition

The **principal** represents the entity attempting to perform an action.

Conceptually:

```text
WHO is making the request?
```

Examples:

```text
User

Employee

Service

Application

AI Agent
```

For our project:

```text
Agent::"PaymentAgent"

Agent::"FraudAgent"

Agent::"SupportAgent"
```

The exact entity modeling depends on the schema used by the authorization system.

---

# Action

## Definition

The **action** represents what the principal wants to do.

Examples:

```text
account.read

transaction.read

payment.prepare

payment.execute

loan.recommend

fraud_case.update
```

Conceptually:

```text
Principal
    ↓
wants to perform
    ↓
Action
```

For example:

```text
PaymentAgent
      ↓
payment.execute
```

---

# Resource

## Definition

The **resource** represents the object against which the action will occur.

Examples:

```text
Customer Account

Payment

Loan Application

Customer Profile

Fraud Case
```

Conceptually:

```text
Principal
    +
Action
    +
Resource
```

Example:

```text
PaymentAgent

payment.execute

Account-928
```

---

# Context

## Definition

**Context** contains additional information about the current authorization request.

Examples might include:

```text
Transaction amount

Request time

Authentication state

Network information

Risk information

Approval state
```

depending on what the application provides and the policy schema permits.

For an AI-agent platform:

```text
Principal:
PaymentAgent

Action:
payment.execute

Resource:
Payment-123

Context:

amount = 500
risk = "low"
humanApproval = false
```

Context allows authorization to go beyond simple RBAC.

---

# Basic Cedar Policy

A simplified Cedar permit policy looks like:

```cedar
permit (
    principal,
    action,
    resource
);
```

Conceptually:

```text
Permit this principal

to perform this action

on this resource.
```

However, real policies generally constrain those variables.

For example:

```cedar
permit (
    principal == Agent::"PaymentAgent",
    action == Action::"account.read",
    resource
);
```

Conceptually:

> PaymentAgent may perform `account.read`.

The actual entity types and actions would be defined according to the application's authorization schema.

---

# Conditional Policy

Cedar policies can include conditions using `when`.

Conceptually:

```cedar
permit (
    principal == Agent::"PaymentAgent",
    action == Action::"payment.execute",
    resource
)
when {
    context.amount < 1000
};
```

Meaning:

```text
Permit PaymentAgent

to execute payment

WHEN

amount < 1000
```

This introduces contextual authorization.

---

# Permit

A `permit` policy describes circumstances under which an action is allowed.

Conceptually:

```text
permit(
    principal,
    action,
    resource
)
```

means:

```text
This request is potentially authorized
when the policy's constraints
and conditions match.
```

Example:

```cedar
permit (
    principal == Agent::"SupportAgent",
    action == Action::"customer.read",
    resource
);
```

---

# Forbid

Cedar also supports:

```text
forbid
```

A `forbid` policy explicitly prohibits requests matching its conditions.

Conceptually:

```cedar
forbid (
    principal,
    action == Action::"iam.modify",
    resource
);
```

Meaning:

```text
Nobody covered by this policy
may perform iam.modify.
```

This is useful for creating hard security boundaries.

---

# Permit vs Forbid

Suppose one policy says:

```text
PERMIT

PaymentAgent
→ payment.execute
```

but another applicable policy says:

```text
FORBID

AI agents
→ payment.execute

when risk = high
```

If the high-risk condition applies:

```text
PERMIT
   +
FORBID
   ↓
DENY
```

A matching forbid takes precedence over permits.

This resembles the **explicit deny** concept we studied in AWS IAM.

---

# Default Deny

Cedar follows an important security principle:

> If no permit policy authorizes a request, the request is denied.

Conceptually:

```text
Authorization Request
        ↓
Matching Permit?
        │
        ├── NO
        │
        ▼
       DENY
```

Therefore:

```text
DEFAULT
   ↓
DENY
```

This is exactly the type of behavior we want for sensitive AI-agent actions.

---

# Simplified Cedar Evaluation

A useful mental model is:

```text
Authorization Request
        ↓
Evaluate Applicable Policies
        ↓
Matching FORBID?
        │
        ├── YES → DENY
        │
        └── NO
             ↓
Matching PERMIT?
        │
        ├── YES → ALLOW
        │
        └── NO → DENY
```

So:

```text
No Permit
=
DENY

Permit
=
ALLOW

Permit + Forbid
=
DENY
```

This gives Cedar a relatively understandable authorization model.

---

# Example: Account Read

Suppose:

```text
PaymentAgent

may read

Customer Accounts
```

Conceptually:

```cedar
permit (
    principal == Agent::"PaymentAgent",
    action == Action::"account.read",
    resource
);
```

Request:

```text
Principal:
PaymentAgent

Action:
account.read

Resource:
Account-928
```

Result:

```text
ALLOW
```

But:

```text
Principal:
SupportAgent

Action:
account.read

Resource:
Account-928
```

would require another applicable permit.

Otherwise:

```text
DENY
```

---

# Example: Payment Authorization

Suppose policy states:

> PaymentAgent may execute low-value payments when transaction risk is low.

Conceptually:

```cedar
permit (
    principal == Agent::"PaymentAgent",
    action == Action::"payment.execute",
    resource
)
when {
    context.amount < 1000 &&
    context.risk == "low"
};
```

Request:

```text
PaymentAgent

payment.execute

Payment-123

amount = 500
risk = low
```

Result:

```text
ALLOW
```

But:

```text
amount = 5000
risk = high
```

does not satisfy the policy.

Unless another permit applies:

```text
DENY
```

---

# Example: Hard Restriction

Suppose governance defines:

> AI agents must never modify their own authorization policies.

We could conceptually express a prohibition such as:

```cedar
forbid (
    principal is Agent,
    action == Action::"policy.modify",
    resource
);
```

The exact production policy would depend on the application's schema and resource model.

Conceptually:

```text
AI Agent
   ↓
policy.modify
   ↓
FORBID
   ↓
DENY
```

Even if another permit accidentally grants broad access, the applicable forbid prevents authorization.

This is valuable for AI-agent governance.

---

# Entity Types

Cedar supports typed entities.

Examples for our system could conceptually include:

```text
Agent

User

Account

Payment

Loan

Tool
```

For example:

```text
Agent::"PaymentAgent"

Account::"ACC-928"

Payment::"PAY-1001"
```

This is useful because authorization can reason about actual domain entities rather than only strings.

---

# Entity Hierarchies

Entities can participate in relationships or hierarchies.

For example, conceptually:

```text
PaymentAgent

is part of

PaymentsDepartment
```

or:

```text
Account-928

belongs to

Region-India
```

Policies can use these relationships.

This allows authorization to represent organizational structures.

For example:

```text
Agent
   ↓
Department
   ↓
Organization
```

or:

```text
Resource
   ↓
Resource Group
```

---

# The `in` Operator

Cedar can use `in` for membership or hierarchy relationships.

Conceptually:

```cedar
principal in Group::"PaymentAgents"
```

This could represent:

```text
PaymentAgent
      ↓
member of
      ↓
PaymentAgents
```

Then a policy can authorize the entire group.

This prevents us from writing one policy for every individual agent.

---

# RBAC with Cedar

Cedar can model role-based authorization patterns.

Suppose:

```text
PaymentAgent
    ↓
PaymentOperator
```

and:

```text
PaymentOperator
    ↓
payment.read
payment.prepare
```

Policies can use entity relationships to express these permissions.

Conceptually:

```text
Principal
   ↓
Role / Group
   ↓
Policy
   ↓
Action
```

Therefore Cedar is not restricted to one authorization model.

---

# ABAC with Cedar

Cedar can also express attribute-based authorization.

Suppose an agent has:

```text
department = payments

riskTier = low
```

and a resource has:

```text
department = payments
```

A policy could use these attributes.

Conceptually:

```text
principal.department
        =
resource.department
```

then:

```text
ALLOW
```

when the rest of the policy conditions are satisfied.

This enables ABAC-style authorization.

---

# RBAC + ABAC

Real systems often need both.

Example:

```text
ROLE

PaymentOperator
```

plus:

```text
ATTRIBUTES

department = payments

environment = production

risk = low
```

Authorization becomes:

```text
Role
  +
Principal Attributes
  +
Resource Attributes
  +
Context
      ↓
Policy
      ↓
Decision
```

This is more expressive than simple:

```text
if user == "admin"
```

---

# Cedar Schema

Cedar supports schemas that describe the authorization model.

A schema can define concepts such as:

```text
Entity Types

Actions

Resource Types

Context Structure

Relationships
```

For our project, a conceptual schema might contain:

```text
Entities:

Agent
User
Account
Payment
Loan
```

Actions:

```text
account.read

payment.prepare

payment.execute

loan.recommend

fraud_case.update
```

Context:

```text
amount

risk

humanApproval

customerAuthenticated
```

A schema helps make policies more structured and allows policy validation against the application's authorization model.

---

# Why Schemas Matter

Suppose someone accidentally writes:

```text
action = payment.execut
```

instead of:

```text
payment.execute
```

or references an attribute that should not exist.

Schema-aware validation can help identify policy mistakes before deployment.

This is especially valuable in security-critical environments.

---

# Policy Validation

Authorization policies should be validated before deployment.

A good lifecycle is:

```text
Write Policy
    ↓
Validate
    ↓
Test
    ↓
Review
    ↓
Approve
    ↓
Deploy
    ↓
Monitor
```

This connects directly with AI governance.

Policies should not be changed casually in production.

---

# Cedar Does Not Execute Actions

As with OPA, this is essential.

Suppose Cedar determines:

```text
PaymentAgent

payment.execute

Payment-123

        ↓

ALLOW
```

Cedar does not execute:

```text
paymentService.execute()
```

Instead:

```text
Agent
   ↓
Gateway
   ↓
Authorization Engine
   ↓
Evaluate Cedar
   ↓
ALLOW
   ↓
Gateway
   ↓
Payment Service
```

Therefore:

```text
CEDAR

describes and evaluates
authorization policy

        ≠

PAYMENT EXECUTION
```

---

# Policy Decision Point and Enforcement Point

The same PDP/PEP model from OPA applies conceptually.

```text
AI Agent
    ↓
Tool Gateway
    ↓
Authorization Request
    ↓
Cedar-Based Authorization
    ↓
Decision
    ↓
Tool Gateway
    ↓
Execute / Block
```

Here:

```text
Authorization Engine
=
Policy Decision Point
```

and:

```text
Tool Gateway
=
Policy Enforcement Point
```

The gateway must enforce the result.

---

# Cedar and Amazon Verified Permissions

Cedar is the policy language used by **Amazon Verified Permissions**, a managed AWS authorization service.

Conceptually:

```text
Application
     ↓
Authorization Request
     ↓
Amazon Verified Permissions
     ↓
Cedar Policies
     ↓
Authorization Decision
     ↓
Application
```

This distinction matters:

```text
Cedar
=
Policy Language
```

while:

```text
Amazon Verified Permissions
=
Managed Authorization Service
using Cedar
```

Do not confuse the language with the service.

---

# Cedar and AI Agents

Imagine:

```text
PaymentAgent

FraudAgent

SupportAgent
```

Each has different capabilities.

### Payment Agent

```text
account.read          ✓

transaction.read      ✓

payment.prepare       ✓

payment.execute       CONDITIONAL

iam.modify            ✗
```

### Fraud Agent

```text
account.read          ✓

transaction.read      ✓

fraud_case.read       ✓

fraud_case.update     ✓

payment.execute       ✗
```

### Support Agent

```text
customer.read         LIMITED

support_case.update   ✓

payment.execute       ✗

iam.modify            ✗
```

Cedar policies can describe these relationships independently from the AI model.

The AI itself does not decide:

```text
"I think I'm authorized."
```

Instead:

```text
Agent
  ↓
Requests Action
  ↓
Independent Authorization System
  ↓
Policy Evaluation
  ↓
ALLOW / DENY
```

---

# Cedar and Human Approval

A policy could include approval state as context.

For example:

```text
PaymentAgent

payment.execute

amount = 5000

humanApproval = false
```

Policy conditions may fail:

```text
DENY
```

After approval:

```text
humanApproval = true
```

the authorization request can be evaluated again.

Conceptually:

```text
Agent
 ↓
Sensitive Action
 ↓
Authorization
 ↓
Approval Missing
 ↓
DENY / Approval Workflow
 ↓
Human Approval
 ↓
Re-evaluate
 ↓
ALLOW
```

The approval workflow itself remains outside Cedar.

---

# Cedar and Risk

Risk can also be supplied as authorization context.

Example:

```text
Principal:
PaymentAgent

Action:
payment.execute

Context:

amount = 500

risk = high
```

A policy can prohibit high-risk execution:

```text
risk = high
    ↓
FORBID / no applicable permit
    ↓
DENY
```

Again, Cedar does not necessarily calculate the risk.

A separate component may calculate:

```text
Risk Score
```

and provide trustworthy risk context to authorization.

This separation gives us:

```text
Risk Engine

"How risky is this?"
```

versus:

```text
Authorization Engine

"Given this risk,
what does policy permit?"
```

---

# Cedar and MCP

Suppose an MCP server exposes:

```text
getAccount

getTransactions

createPayment

executePayment
```

Tool discovery does not mean every tool invocation should be authorized.

Architecture:

```text
AI Agent
   ↓
MCP Tool Request
   ↓
Tool Gateway / MCP Server
   ↓
Authorization Request
   ↓
Cedar-Based Authorization
   ↓
ALLOW / DENY
   ↓
Backend
```

For example:

```text
Principal:
SupportAgent

Action:
Tool::executePayment

Resource:
Payment-123
```

Policy:

```text
DENY
```

The MCP layer should then block execution.

---

# Tool Availability ≠ Authorization

This principle appears again:

```text
Agent can see:

executePayment()
```

does not imply:

```text
Agent can execute
every payment.
```

Instead:

```text
Tool Exists
     ↓
Agent Requests Tool
     ↓
Authorization
     ↓
Policy Decision
     ↓
Execute / Block
```

This is important for agentic systems.

---

# Cedar vs Hardcoded Authorization

### Hardcoded

```java
if (
    agent.equals("PaymentAgent") &&
    amount < 1000 &&
    risk.equals("low")
) {
    allow();
}
```

Problems:

```text
Authorization mixed with code

Harder to audit

Harder to review

Harder to update

Rules duplicated across services
```

### Policy-Based

```text
Application
    ↓
Authorization Request
    ↓
Cedar Policy
    ↓
Decision
```

Authorization becomes an independent concern.

---

# Cedar vs Traditional RBAC

Traditional RBAC might say:

```text
PaymentAgent
     ↓
PaymentRole
     ↓
payment.execute
```

But this can become too broad.

Cedar can additionally evaluate:

```text
PaymentAgent

payment.execute

Payment-123

amount = 500

risk = low

customerAuthenticated = true
```

Therefore Cedar can express richer authorization than simple role membership.

---

# Cedar vs AWS IAM

Cedar's authorization model will feel familiar after studying AWS IAM.

AWS IAM:

```text
Principal
+
Action
+
Resource
+
Condition
+
Policy
```

Cedar:

```text
Principal
+
Action
+
Resource
+
Context
+
Policy
```

Both also include concepts resembling:

```text
Permit / Allow

Forbid / Deny
```

But Cedar is an application authorization language rather than simply the policy language of AWS IAM.

It can model authorization for application-domain resources such as:

```text
Account

Document

Payment

AI Tool

Loan Application
```

---

# Cedar vs OPA/Rego

This is the most important comparison for our research.

## OPA

OPA is a:

> **General-purpose policy engine**

and uses:

> **Rego**

OPA can evaluate many kinds of policies.

Examples:

```text
API Authorization

Kubernetes Policies

Infrastructure Rules

CI/CD Rules

Agent Tool Policies
```

Its basic mental model is:

```text
Input
  +
Data
  +
Rego Policy
      ↓
Decision
```

---

## Cedar

Cedar is primarily designed for:

> **Authorization**

Its mental model is intentionally centered around:

```text
Principal
+
Action
+
Resource
+
Context
```

This makes the authorization structure explicit.

---

# Comparison

| Area                              | OPA / Rego                    | Cedar                                           |
| --------------------------------- | ----------------------------- | ----------------------------------------------- |
| Primary purpose                   | General-purpose policy        | Authorization                                   |
| Language                          | Rego                          | Cedar                                           |
| Core model                        | Input + Data + Policy         | Principal + Action + Resource + Context         |
| Policy engine                     | OPA provides one              | Cedar is primarily a language/library ecosystem |
| Managed service                   | Not tied to one cloud service | Amazon Verified Permissions uses Cedar          |
| Authorization                     | Yes                           | Yes                                             |
| Infrastructure policy             | Strong use case               | Not primary focus                               |
| Kubernetes ecosystem              | Strong                        | Not primary focus                               |
| Structured authorization entities | Can be modeled                | Core design                                     |
| Permit                            | Can model allow               | Native `permit`                                 |
| Explicit prohibition              | Can model decisions/rules     | Native `forbid`                                 |
| Default deny                      | Common policy design          | Built into authorization semantics              |
| Schema                            | Policy/data models possible   | Authorization schema is a major concept         |

---

# Which Is Easier to Understand for Authorization?

For a simple authorization problem:

```text
Can Agent A
perform Action B
on Resource C?
```

Cedar's model is very natural:

```text
principal

action

resource

context
```

OPA is more flexible:

```text
input
+
data
+
arbitrary policy logic
```

That flexibility is powerful, but Rego may require more learning.

Therefore:

```text
Cedar

More opinionated toward authorization
```

while:

```text
OPA

More general-purpose policy framework
```

Neither is automatically "better."

The correct choice depends on system requirements.

---

# OPA Example vs Cedar Example

Suppose:

> PaymentAgent may read customer accounts.

### OPA / Rego

```rego
package banking.authz

default allow := false

allow if {
    input.principal == "PaymentAgent"
    input.action == "account.read"
}
```

### Cedar

Conceptually:

```cedar
permit (
    principal == Agent::"PaymentAgent",
    action == Action::"account.read",
    resource
);
```

The conceptual difference is clear.

OPA asks:

```text
What does the input contain,
and what decision should policy produce?
```

Cedar asks:

```text
Can this principal perform
this action on this resource?
```

---

# Important Security Principle

Whether we use:

```text
OPA

or

Cedar
```

the most important architecture remains:

```text
             AI AGENT

                 │
                 ▼

          PROPOSED ACTION

                 │
                 ▼

       POLICY ENFORCEMENT POINT

                 │
                 ▼

        AUTHORIZATION ENGINE

                 │
                 ▼

              POLICY

                 │
                 ▼

          ALLOW / DENY

                 │
        ┌────────┴────────┐
        │                 │
      ALLOW              DENY
        │                 │
        ▼                 ▼
      TOOL              BLOCK
```

The AI agent should never be the final authority over its own permissions.

---

# Policy Administration

Policies themselves are sensitive resources.

If:

```text
PaymentAgent
```

can modify:

```text
PaymentAgent Policy
```

then the agent could potentially increase its own authority.

Therefore:

```text
AI Agent
    ↓
policy.modify
    ↓
DENY
```

Policy administration should belong to a separate governance/control plane.

For example:

```text
Administrator
     ↓
Policy Management
     ↓
Review
     ↓
Approval
     ↓
Policy Store
```

Runtime agents only consume authorization decisions.

---

# Policy Governance

Our governance system should track:

```text
Policy ID

Policy Version

Policy Owner

Created By

Approved By

Changed By

Created At

Updated At

Status

Affected Agents

Affected Resources
```

For example:

```text
Policy:
PAYMENT-001

Version:
3

Rule:
Payments above threshold require approval.

Owner:
Risk Team

Status:
ACTIVE
```

This creates accountability.

---

# Policy Lifecycle

Policies should have a lifecycle.

```text
Draft
  ↓
Review
  ↓
Approve
  ↓
Test
  ↓
Deploy
  ↓
Monitor
  ↓
Update
  ↓
Retire
```

For sensitive banking systems, authorization policy should not simply become active because someone edited a file.

This connects:

```text
Governance
    +
Authorization
    +
Auditability
```

---

# Real-World Banking Example

Suppose the bank operates:

```text
PaymentAgent

FraudAgent

SupportAgent
```

Customer requests:

```text
Transfer $5,000
to a new beneficiary.
```

The PaymentAgent proposes:

```text
executePayment()
```

The gateway constructs:

```text
Principal:
PaymentAgent

Action:
payment.execute

Resource:
Payment-987

Context:

amount = 5000
beneficiaryTrusted = false
risk = high
humanApproval = false
```

Authorization evaluates Cedar policies.

Policy says conceptually:

```text
High Risk
    +
New Beneficiary
    +
No Approval
       ↓
DENY
```

The gateway blocks execution.

```text
PaymentAgent
     ↓
Tool Gateway
     ↓
Authorization
     ↓
DENY
     ↓
Payment API NOT CALLED
```

The system starts an approval workflow.

After approval:

```text
humanApproval = true
```

A new authorization request is evaluated.

If all policy requirements are satisfied:

```text
ALLOW
```

Then:

```text
Tool Gateway
     ↓
Payment Service
     ↓
Banking Infrastructure
```

Again:

> **Policy authorizes. Application executes.**

---

# Advantages

## Authorization-Focused Design

Cedar is specifically designed for authorization.

## Clear Mental Model

The core model is straightforward:

```text
Principal
+
Action
+
Resource
+
Context
```

## Policy Separation

Authorization can be separated from application code.

## Permit and Forbid

Both positive permissions and hard prohibitions can be represented.

## Default Deny

Requests without an applicable permit are denied.

## Context-Aware Authorization

Policies can evaluate request-specific information.

## RBAC and ABAC

Role-based and attribute-based patterns can both be modeled.

## Entity Relationships

Policies can reason about relationships between entities.

## Schemas

Authorization models can be explicitly defined and validated.

## Testing and Validation

Policies can be validated and tested before deployment.

## Application-Level Authorization

Cedar can model domain-specific resources and actions.

---

# Limitations

## Authorization-Specific

Cedar is intentionally focused on authorization.

OPA/Rego is more general-purpose when policies need to cover broader infrastructure or operational concerns.

## New Language

Developers need to learn Cedar syntax and semantics.

## Policy Modeling

Good authorization still requires careful modeling of:

```text
Principals

Actions

Resources

Relationships

Context
```

## Context Trust

Authorization is only as reliable as the information supplied to it.

If an application falsely provides:

```text
risk = low
```

when the real risk is high, authorization may be incorrect.

## Policy Complexity

Large numbers of policies and entity relationships can still become difficult to manage.

## Enforcement Remains External

Cedar policies do not automatically enforce themselves.

Applications must respect authorization decisions.

## Business Workflow Is Separate

Cedar does not replace:

```text
Approval Systems

Risk Engines

Payment Services

Audit Systems

Agent Runtime
```

It participates in authorization.

---

# Key Takeaways

1. **Cedar is an open-source authorization policy language created by AWS.**

2. Cedar is used by **Amazon Verified Permissions**.

3. Cedar's core authorization model is:

```text
Principal
+
Action
+
Resource
+
Context
```

4. `principal` represents WHO is requesting access.

5. `action` represents WHAT they want to do.

6. `resource` represents WHAT they want to act upon.

7. `context` provides additional request-specific information.

8. Cedar supports:

```text
permit

forbid
```

9. Applicable `forbid` policies override permits.

10. Without an applicable permit:

```text
DENY
```

11. Cedar can model RBAC.

12. Cedar can model ABAC-style authorization.

13. Cedar supports typed entities and relationships.

14. Schemas can define the authorization model and improve policy validation.

15. Cedar policies should be tested, reviewed, versioned, and audited.

16. Cedar does **not** execute business operations.

17. The authorization system acts as a **Policy Decision Point**.

18. A gateway/application acts as the **Policy Enforcement Point**.

19. AI agents should not control or modify their own authorization policies.

20. Tool discovery does not imply authorization to use a tool.

21. Cedar is more authorization-focused than OPA/Rego.

22. OPA is more general-purpose.

---

# How We'll Use This in Our Project

Cedar gives us a very useful conceptual model for our authorization request.

Our system could standardize every sensitive AI-agent action into:

```json
{
  "principal": {},
  "action": "",
  "resource": {},
  "context": {}
}
```

For example:

```json
{
  "principal": {
    "type": "Agent",
    "id": "PaymentAgent"
  },
  "action": "payment.execute",
  "resource": {
    "type": "Payment",
    "id": "PAY-928"
  },
  "context": {
    "amount": 5000,
    "risk": "high",
    "humanApproval": false
  }
}
```

This becomes a **standard authorization envelope**.

Every tool request can be transformed into this model.

---

## 1. Standardize Authorization Requests

Instead of every tool having completely different authorization logic:

```text
Payment Tool
Customer Tool
Loan Tool
Fraud Tool
```

all sensitive operations could produce:

```text
Principal
+
Action
+
Resource
+
Context
```

This is one of the strongest ideas from Cedar for our architecture.

---

## 2. Separate Policies From Agents

Agents should not contain:

```text
"I am allowed to execute payments."
```

Instead:

```text
Agent
  ↓
requests action
  ↓
Authorization System
  ↓
Policy
  ↓
Decision
```

Authorization remains independent from AI reasoning.

---

## 3. Support Hard Restrictions

We may want organization-wide restrictions such as:

```text
FORBID

AI agents

FROM

modifying their own permissions.
```

or:

```text
FORBID

Support Agents

FROM

executing payments.
```

This creates strong boundaries.

---

## 4. Use Context for Dynamic Authorization

Static permissions alone are insufficient.

We may need:

```text
Agent
+
Action
+
Resource
+
Amount
+
Risk
+
Environment
+
Approval
```

For example:

```text
PaymentAgent

CAN

payment.execute

ONLY WHEN

amount < threshold

AND

risk = low

AND

customer authenticated
```

---

## 5. Keep Risk Separate

The authorization engine should not necessarily calculate fraud risk.

Instead:

```text
Risk Engine
     ↓
risk = high
     ↓
Authorization Context
     ↓
Policy Engine
```

This creates clean responsibilities.

---

## 6. Keep Human Approval Separate

Similarly:

```text
Authorization
     ↓
Approval Required
     ↓
Approval Service
     ↓
Human
     ↓
Approval State
     ↓
Re-evaluate Authorization
```

Authorization policy defines the requirement.

The approval system performs the workflow.

---

## 7. Govern the Policies

Policies themselves need governance.

```text
Policy
 ↓
Owner
 ↓
Version
 ↓
Review
 ↓
Approval
 ↓
Deployment
 ↓
Audit
```

This directly connects:

```text
AI Governance
      +
Policy-Based Authorization
```

---

# Final OPA vs Cedar Architectural Comparison

We can now compare the two main approaches we researched.

## OPA Architecture

```text
Agent
  ↓
Gateway / PEP
  ↓
Authorization Input
  ↓
OPA
  ↓
Rego
  ↓
Decision
  ↓
Gateway
  ↓
Tool
```

OPA's conceptual model:

```text
INPUT
  +
DATA
  +
POLICY
    ↓
DECISION
```

---

## Cedar Architecture

```text
Agent
  ↓
Gateway / PEP
  ↓
Authorization Request

Principal
+
Action
+
Resource
+
Context

  ↓
Cedar Authorization
  ↓
Policies
  ↓
ALLOW / DENY
  ↓
Gateway
  ↓
Tool
```

Cedar's conceptual model:

```text
PRINCIPAL
   +
ACTION
   +
RESOURCE
   +
CONTEXT
   ↓
POLICY
   ↓
DECISION
```

---

# Final Research Insight

Across all the technologies studied, the same architectural pattern keeps appearing.

```text
                         GOVERNANCE
                              │
                              ▼
                           POLICIES
                              │
                              ▼

USER
 │
 ▼
AI AGENT
 │
 │ proposes action
 ▼
TOOL / ACTION GATEWAY
 │
 │
 ├──────────────→ RISK ENGINE
 │                     │
 │                     ▼
 │                Risk Context
 │                     │
 ◄─────────────────────┘
 │
 │ Authorization Request
 ▼
POLICY DECISION POINT
 │
 │
 │ Principal
 │ Action
 │ Resource
 │ Context
 │
 ▼
POLICY EVALUATION
 │
 ├──────────── DENY ───────────→ BLOCK
 │
 ├──────── APPROVAL ───────────→ HUMAN
 │
 └──────────── ALLOW
                 │
                 ▼
               TOOL
                 │
                 ▼
          BACKEND SERVICE
                 │
                 ▼
           CLOUD IAM / RBAC
                 │
                 ▼
              RESOURCE

                 │
                 ▼
               AUDIT
```

This gives us a strong candidate architecture for the hackathon.

The most important principle from the entire research phase is:

> **The AI agent proposes an action. An independent policy system determines whether that action is authorized. A trusted enforcement layer enforces the decision. Only then does the backend perform the operation.**

In short:

```text
AGENT
=
PROPOSES

POLICY ENGINE
=
DECIDES

GATEWAY
=
ENFORCES

TOOL
=
EXECUTES

GOVERNANCE
=
CONTROLS THE RULES

AUDIT
=
RECORDS WHAT HAPPENED
```

That separation is the foundation of a governable AI-agent architecture.

---

# Sources

* Cedar Policy Language — Official Documentation
* Cedar Policy Language — GitHub Repository
* Cedar Policy Language — Authorization Documentation
* Cedar Policy Language — Policy Syntax
* Cedar Policy Language — Schema Documentation
* Cedar Policy Language — Entity and Hierarchy Documentation
* Cedar Policy Language — Policy Validation
* AWS — Amazon Verified Permissions Documentation
* AWS — Cedar and Amazon Verified Permissions
* AWS Security Blog — Cedar authorization and policy-based access-control materials
