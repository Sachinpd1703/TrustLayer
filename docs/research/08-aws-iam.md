# AWS Identity and Access Management (IAM)

## Overview

**AWS Identity and Access Management (IAM)** is the authorization and identity-management system used to control access to AWS resources.

At a high level, AWS IAM answers:

> **Who can perform which action on which AWS resource, under what conditions?**

A useful simplified model is:

```text
WHO?
 ↓
Principal

WANTS TO DO WHAT?
 ↓
Action

ON WHAT?
 ↓
Resource

UNDER WHAT CONDITIONS?
 ↓
Condition

        ↓

AWS Policy Evaluation

        ↓

ALLOW / DENY
```

For example:

```text
Principal:
PaymentServiceRole

Action:
s3:GetObject

Resource:
CustomerDocumentsBucket

        ↓

IAM

        ↓

ALLOW / DENY
```

AWS IAM is important for our AI-agent research because it demonstrates several mature authorization concepts:

* principals and identities
* actions and resources
* identity-based policies
* resource-based policies
* roles
* temporary credentials
* conditions
* least privilege
* default deny
* explicit deny
* centralized organizational restrictions
* policy evaluation

These concepts can influence how we design authorization for AI agents.

---

## Why It Exists

Imagine an organization running:

```text
500 Employees

200 Applications

100 Microservices

50 AI Agents

Thousands of AWS Resources
```

Those workloads may need access to:

```text
Amazon S3

Amazon DynamoDB

AWS Lambda

Amazon SQS

Amazon SNS

AWS Secrets Manager

Amazon Bedrock

Amazon RDS
```

Not every identity should access every resource.

For example:

```text
Payment Service

S3 Payment Documents       READ
Payment Queue              WRITE
Payment Secret             READ

HR Database                NONE
Loan Documents             NONE
IAM Administration         NONE
```

Without centralized authorization, individual applications might contain rules such as:

```text
if service == "payment-service":
    allow()
```

This becomes difficult to manage across thousands of resources.

IAM instead provides a policy-based authorization model.

---

## Core Concepts

The most important concepts for our research are:

1. Principal
2. Identity
3. Action
4. Resource
5. Policy
6. Identity-Based Policy
7. Resource-Based Policy
8. IAM Role
9. Temporary Credentials
10. Conditions
11. Default Deny
12. Explicit Deny
13. Policy Evaluation
14. Permissions Boundaries
15. Service Control Policies
16. Least Privilege

---

# Principal

## Definition

A **principal** is an entity that can make a request to AWS.

Depending on the situation, a principal may represent:

```text
AWS Account

IAM User

IAM Role

Federated User

AWS Service

Workload using assumed-role credentials
```

Conceptually:

> **Principal = WHO is making the request?**

Example:

```text
Principal:
PaymentServiceRole
```

For our project, this reinforces an important principle:

> Every independently governed AI agent or agent workload should have a distinguishable identity.

Instead of:

```text
AI-System
```

we want to distinguish:

```text
PaymentAgent

FraudAgent

LoanAgent

SupportAgent
```

when their authority differs.

---

# Action

## Definition

An **action** represents an operation that can be performed on an AWS service.

Examples include:

```text
s3:GetObject

s3:PutObject

s3:DeleteObject

dynamodb:GetItem

dynamodb:PutItem

secretsmanager:GetSecretValue
```

Conceptually:

> **Action = WHAT does the principal want to do?**

Example:

```text
Principal:
ReportingRole

Action:
s3:GetObject
```

---

# Resource

## Definition

A **resource** is the AWS object against which an action is performed.

Resources are commonly identified using an **Amazon Resource Name (ARN)**.

Conceptually:

```text
arn:aws:s3:::customer-documents/*
```

The important idea for our research is not ARN syntax itself.

It is that authorization should consider:

```text
Principal
    +
Action
    +
Resource
```

rather than simply asking:

> Is this agent generally trusted?

---

# IAM Policies

## Definition

An IAM policy is a document containing statements that define permissions.

AWS IAM policies commonly use JSON.

A simplified example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::customer-documents/*"
    }
  ]
}
```

Conceptually:

```text
ALLOW

Action:
Read Object

Resource:
Customer Documents
```

The policy describes authorization.

It does not itself retrieve the object.

This reinforces:

> **Policy decides authority. Service code performs the operation.**

---

# Policy Statement Structure

An AWS policy statement commonly contains concepts such as:

```text
Effect

Principal

Action

Resource

Condition
```

Not every policy type uses every element in exactly the same way.

A useful conceptual model is:

```text
Effect
   ↓
ALLOW / DENY

Principal
   ↓
WHO?

Action
   ↓
WHAT?

Resource
   ↓
ON WHAT?

Condition
   ↓
UNDER WHAT CIRCUMSTANCES?
```

This model will later look familiar when we study policy engines such as OPA and Cedar.

---

# Identity-Based Policies

## Definition

An **identity-based policy** is attached to an IAM identity such as a user, group, or role.

Example:

```text
PaymentServiceRole
        │
        │ Identity Policy
        ▼
Allow:
s3:GetObject

Resource:
PaymentDocuments
```

Conceptually:

> **What is this identity allowed to do?**

For example:

```text
PaymentRole

Can:
Read Payment Documents
Write Payment Events

Cannot:
Read HR Documents
Administer IAM
```

---

# Resource-Based Policies

## Definition

A **resource-based policy** is attached directly to a resource.

Instead of asking:

> What can PaymentRole access?

we can also define:

> Who can access this resource?

Example:

```text
S3 Bucket
   │
   │ Bucket Policy
   ▼

PaymentRole       → ALLOW

ReportingRole     → ALLOW

UnknownRole       → no grant
```

This gives AWS two useful perspectives.

### Identity perspective

```text
Identity
   ↓
What can I access?
```

### Resource perspective

```text
Resource
   ↓
Who can access me?
```

This distinction is important for our project.

We may eventually need both:

```text
Agent Policy

"What can PaymentAgent do?"
```

and:

```text
Resource Policy

"Which agents may access PaymentService?"
```

---

# IAM Roles

## Definition

An **IAM role** is an AWS identity with permissions that can be assumed by trusted principals.

Unlike a traditional IAM user, a role is commonly used to obtain **temporary security credentials**.

Example:

```text
Application
     ↓
Assume PaymentRole
     ↓
Temporary Credentials
     ↓
AWS Resource
```

Roles are heavily used for:

* applications
* AWS services
* workloads
* cross-account access
* federated users
* temporary privileged access

---

## Why Roles Matter for AI Agents

Imagine:

```text
PaymentAgent

FraudAgent

SupportAgent
```

Bad design:

```text
All Agents
    ↓
Shared Administrator Credentials
```

Better:

```text
PaymentAgent
    ↓
PaymentRole
    ↓
Payment Resources
```

```text
FraudAgent
    ↓
FraudRole
    ↓
Fraud Resources
```

```text
SupportAgent
    ↓
SupportRole
    ↓
Support Resources
```

Now each workload receives authority appropriate to its purpose.

---

# Trust Policies and Role Assumption

A role has another important authorization question:

> **Who is allowed to assume this role?**

Conceptually:

```text
PaymentRole
     │
     │ Trust Policy
     ▼

Trusted workload:
PaymentService

Untrusted workload:
SupportService
```

This creates two separate questions:

```text
1. Who may assume this role?

2. What can the role do after being assumed?
```

Conceptually:

```text
Workload
   ↓
Can assume PaymentRole?
   ↓
YES
   ↓
Temporary Credentials
   ↓
What can PaymentRole access?
   ↓
Permissions Policies
```

This separation is extremely useful.

---

# Temporary Credentials

Instead of storing permanent credentials inside an application:

```text
Application
    ↓
Long-Lived Secret Key
    ↓
AWS
```

AWS commonly encourages workloads to use roles and temporary credentials:

```text
Trusted Workload
      ↓
Assume Role
      ↓
Temporary Credentials
      ↓
AWS Resource
```

Temporary credentials expire.

This reduces the risk associated with leaked long-lived credentials.

For AI-agent architecture, the lesson is:

> **Prefer short-lived, workload-bound credentials over permanent secrets embedded in agents.**

---

# Conditions

## Definition

AWS policy conditions allow authorization decisions to depend on request context.

Instead of:

```text
Principal
    +
Action
    +
Resource
```

authorization can become:

```text
Principal
    +
Action
    +
Resource
    +
Context
```

Conditions can evaluate supported context keys related to areas such as:

```text
Principal attributes

Resource tags

Request tags

Network context

Time

Organization

Authentication properties
```

depending on the service and policy.

---

## Example

Conceptually:

```text
ALLOW

PaymentRole

to read PaymentDocument

ONLY IF

the required context conditions are satisfied.
```

This is more flexible than basic role membership alone.

---

# Attribute-Based Access Control

AWS IAM can use tags and policy conditions to implement **attribute-based access control (ABAC)** patterns.

Suppose:

```text
Principal Tag:

department = payments
```

and:

```text
Resource Tag:

department = payments
```

A policy can conceptually allow access when appropriate attributes match.

```text
Principal.department
        =
Resource.department

        ↓

ALLOW
```

This can reduce the need to create large numbers of specialized roles.

---

# RBAC vs ABAC

### RBAC

Authorization based mainly on roles:

```text
PaymentRole
      ↓
Payment Permissions
```

### ABAC

Authorization based on attributes:

```text
Principal Attributes
        +
Resource Attributes
        +
Context
        ↓
Authorization
```

Large systems often use combinations of these approaches.

This will matter later when we compare IAM systems with Cedar and OPA.

---

# Default Deny

One of the most important IAM principles is:

> **Requests are denied by default unless applicable authorization grants access.**

Conceptually:

```text
Request
   ↓
Any applicable permission allowing it?
   ↓
NO
   ↓
DENY
```

This is safer than:

```text
Anything not explicitly forbidden
is automatically allowed.
```

For our project, default deny should be an important architectural principle.

---

# Explicit Deny

AWS also has a particularly important concept:

> **An applicable explicit Deny overrides an Allow.**

Suppose one policy says:

```text
ALLOW

PaymentRole
→ s3:GetObject
```

but another applicable policy says:

```text
DENY

PaymentRole
→ access SensitiveArchive
```

For the restricted resource:

```text
ALLOW
   +
EXPLICIT DENY
   ↓
DENY
```

This is extremely useful for defining hard security boundaries.

---

# Why Explicit Deny Matters for AI Agents

Imagine:

```text
PaymentAgent

Role:
PaymentOperator
```

The role generally permits:

```text
payment.read

payment.prepare

payment.execute
```

But organizational policy states:

```text
AI Agents

MUST NEVER

modify IAM permissions.
```

Conceptually:

```text
General Allow
      +
Hard Explicit Deny:
iam.modify
      ↓
DENY
```

Even if another policy accidentally grants broader access, the applicable deny can preserve the restriction.

This suggests an important idea for our project:

> Some agent actions should be modeled as **hard boundaries**, not merely missing permissions.

---

# Simplified Policy Evaluation

AWS policy evaluation is more complicated than simply checking one policy.

A useful simplified mental model is:

```text
Request
   ↓
Authenticate Principal
   ↓
Collect Applicable Policies
   ↓
Evaluate Request Context
   ↓
Explicit Deny?
   │
   ├── YES → DENY
   │
   └── NO
        ↓
Applicable Allow?
   │
   ├── YES → ALLOW
   │
   └── NO → DENY
```

The actual AWS evaluation logic can involve multiple policy types and account relationships, so this should be treated as a learning model rather than the complete algorithm.

The key principle is:

```text
Default
  ↓
DENY

Explicit Allow
  ↓
potentially ALLOW

Applicable Explicit Deny
  ↓
DENY
```

---

# Permissions Boundaries

## Definition

A **permissions boundary** sets the maximum permissions an identity-based policy can grant to an IAM user or role.

Conceptually:

```text
Identity Policy:

Allows
A + B + C + D
```

but:

```text
Permissions Boundary:

Maximum allowed
A + B
```

Effective permissions cannot exceed that boundary.

```text
Requested permissions:
A B C D

Boundary:
A B

Effective maximum:
A B
```

---

## Why This Is Interesting for AI Agents

Suppose an AI agent administrator accidentally grants:

```text
PaymentAgent

payment.*

customer.*

iam.*
```

But the agent has a boundary restricting it to:

```text
payment.read

payment.prepare
```

The broad identity policy cannot exceed the boundary.

Conceptually:

```text
Agent Permission Configuration
          ↓
Permissions Boundary
          ↓
Maximum Authority
```

This is a powerful architectural idea:

> **Separate assigned permissions from maximum possible permissions.**

Our project may benefit from a similar concept.

---

# Service Control Policies (SCPs)

AWS Organizations provides **Service Control Policies**, which can define maximum available permissions for accounts or organizational units.

An SCP does not simply grant permissions to a user or role.

Instead, it can constrain what permissions can ultimately be exercised within its scope.

Conceptually:

```text
Organization

Hard Organizational Boundary

"No workload in this environment
may perform operation X."

        ↓

Accounts

        ↓

Roles

        ↓

Applications
```

This is useful for enforcing organization-wide restrictions.

---

## AI-Agent Analogy

Imagine:

```text
Organization Policy:

AI agents may NEVER
modify their own permissions.
```

Even if:

```text
Agent Policy:
iam.modify = ALLOW
```

the higher-level organizational restriction should prevent it.

Conceptually:

```text
Agent Permission
      ↓
Environment Boundary
      ↓
Organization Boundary
      ↓
Final Decision
```

This creates layered authorization.

---

# Least Privilege

AWS strongly promotes **least privilege**.

The principle is:

> Give identities only the permissions required to perform their tasks.

Bad:

```text
PaymentAgent

AdministratorAccess
```

Better:

```text
PaymentAgent

Read Account Data

Prepare Payment

Submit Approved Payment
```

Not:

```text
Delete Customers

Modify IAM

Read HR Data

Administer Infrastructure
```

Least privilege reduces the blast radius of:

* compromised credentials
* prompt injection
* incorrect tool calls
* software bugs
* malicious behavior

---

# IAM Access Analysis

AWS provides tools such as IAM Access Analyzer to help organizations reason about access.

Depending on the feature, Access Analyzer can help identify areas such as:

* resources accessible from outside intended trust boundaries
* unused access
* policy validation
* policy generation based on observed access

This teaches another useful lesson:

> **Authorization should not only be enforced; permissions should also be continuously analyzed.**

For our project, useful questions might include:

```text
Which agents have unused permissions?

Which agents can access sensitive resources?

Which agents have unusually broad access?

Which permissions have not been used recently?

Which resource is accessible by the largest number of agents?
```

This connects IAM with governance and risk management.

---

# IAM and AI Agents

Consider:

```text
PaymentAgent

FraudAgent

LoanAgent
```

We might conceptually assign:

### Payment Agent

```text
account.read          ✓
transaction.read      ✓
payment.prepare       ✓
payment.execute       CONDITIONAL

loan.approve          ✗
iam.modify            ✗
```

### Fraud Agent

```text
account.read          ✓
transaction.read      ✓
fraud_case.read       ✓
fraud_case.update     ✓

payment.execute       ✗
loan.approve          ✗
```

### Loan Agent

```text
customer.read         ✓
loan.read             ✓
loan.recommend        ✓

payment.execute       ✗
iam.modify            ✗
```

Each agent receives only the authority needed for its function.

---

# Cloud IAM vs Agent-Level Authorization

Like Google Cloud IAM, AWS IAM primarily protects AWS resources.

Our AI governance architecture may require much richer business context.

For example, AWS IAM might answer:

```text
Can PaymentServiceRole

invoke Payment Lambda?

        ↓

YES
```

But our application still needs to determine:

```text
Can PaymentAgent

transfer $25,000

from Customer-928

to a new beneficiary

without human approval?

        ↓

NO
```

These are different authorization layers.

```text
AWS IAM
   ↓
Infrastructure Authorization

Application Policy
   ↓
Agent / Business Authorization
```

A secure system may use both.

---

# Authentication vs Authorization

As with Google Cloud:

### Authentication

> Who are you?

```text
This request uses credentials
for PaymentRole.
```

### Authorization

> What are you allowed to do?

```text
Can PaymentRole invoke this API?
```

Keep these separate:

```text
Identity
   ↓
Authentication
   ↓
Principal established
   ↓
Authorization
   ↓
ALLOW / DENY
```

---

# Real-World Banking Example

Imagine a bank runs an AI fraud-investigation workload on AWS.

```text
Fraud Agent
    ↓
Fraud Application
    ↓
Assumes FraudRole
    ↓
Temporary Credentials
    ↓
AWS Services
```

The FraudRole can:

```text
Read Transaction Data     ✓

Read Fraud Evidence       ✓

Write Investigation Case  ✓

Execute Payment           ✗

Modify IAM                ✗
```

Now suppose malicious content causes the agent to attempt:

```text
Modify IAM permissions
```

The request reaches AWS:

```text
FraudRole
   ↓
IAM Action
   ↓
Policy Evaluation
   ↓
No Allow / Explicit Restriction
   ↓
DENY
```

The AI's reasoning does not override the infrastructure authorization layer.

---

# Example — Sensitive Data Bucket

Suppose the bank stores:

```text
General Customer Documents

Fraud Investigation Documents
```

The Support Agent should access only general documents.

Identity policy:

```text
ALLOW

SupportRole
→ Read General Documents
```

A stronger restriction can ensure:

```text
DENY

SupportRole
→ Fraud Investigation Documents
```

Now:

```text
Support Agent
     ↓
requests Fraud Document
     ↓
Policy Evaluation
     ↓
Explicit Deny
     ↓
DENY
```

This creates a hard boundary around sensitive information.

---

# Example — Temporary Elevated Access

Sometimes an agent or workload may need additional authority temporarily.

Bad approach:

```text
Agent permanently receives
high privilege.
```

Better conceptual approach:

```text
Normal Agent Role
       ↓
Specific Workflow
       ↓
Approval
       ↓
Assume Limited Elevated Role
       ↓
Temporary Credentials
       ↓
Perform Required Operation
       ↓
Credentials Expire
```

This reduces permanent privilege.

For our project, this suggests the concept of:

> **Just-in-time authorization**

High-risk capabilities could be granted only when needed and only for a limited period or workflow.

---

# AWS IAM vs Google Cloud IAM

Both systems share many fundamental ideas.

| Concept                     | Google Cloud IAM                                    | AWS IAM                           |
| --------------------------- | --------------------------------------------------- | --------------------------------- |
| Identity                    | Principal                                           | Principal                         |
| Fine-grained capability     | Permission                                          | Action / Permission               |
| Permission grouping         | Role                                                | Policy / Role permissions         |
| Resource targeting          | Resource                                            | Resource / ARN                    |
| Contextual authorization    | IAM Conditions                                      | Policy Conditions                 |
| Workload identity           | Service accounts / federation                       | IAM Roles / temporary credentials |
| Default behavior            | Deny without applicable grant                       | Implicit/default deny             |
| Explicit deny               | Supported through applicable deny-policy mechanisms | Core policy evaluation concept    |
| Organization-level controls | Organization policies / IAM deny policies           | SCPs and other controls           |
| Attribute-based patterns    | Conditions / attributes                             | Tags + conditions                 |

The syntax and evaluation systems differ, but both teach:

```text
Identity
   +
Permissions
   +
Resources
   +
Policies
   +
Context
   ↓
Authorization Decision
```

---

# AWS IAM vs Governance

IAM answers:

> What can this principal access?

Governance asks:

```text
Why does it have that access?

Who approved it?

Who owns the identity?

What risk level does it have?

When should access expire?

Who changed the policy?

Who can revoke it?
```

Therefore:

```text
Governance
      ↓
Defines accountability
and requirements

IAM
      ↓
Enforces access controls
```

---

# AWS IAM vs Guardrails

IAM is one layer of protection.

Suppose:

```text
AWS IAM:

PaymentRole may invoke
PaymentService.
```

That does not necessarily mean:

```text
PaymentAgent may execute
every payment automatically.
```

Additional guardrails may evaluate:

```text
Amount

Beneficiary

Risk Score

Customer Authentication

Transaction Limit

Human Approval
```

Therefore:

```text
Infrastructure IAM
       +
Application Authorization
       +
Risk Controls
       +
Guardrails
```

may all participate in a secure agent workflow.

---

# AWS IAM vs Risk Management

Risk management can influence permission design.

Example:

```text
Agent:
PaymentAgent

Risk:
HIGH
```

Controls might include:

```text
Narrow Role

Temporary Credentials

Explicit Restrictions

Transaction Limits

Human Approval

Monitoring

Rate Limits
```

Therefore IAM is one mechanism used to reduce security and operational risk.

---

## Advantages

### Fine-Grained Authorization

Policies can target specific actions and resources.

### Identity-Based and Resource-Based Policies

Access can be controlled from both the principal and resource perspectives.

### Explicit Deny

Hard restrictions can override applicable allows.

### Roles

Workloads can operate through role-based identities rather than long-lived user credentials.

### Temporary Credentials

Short-lived credentials reduce exposure from permanent secrets.

### Conditions

Authorization can depend on request context.

### ABAC

Tags and attributes can support scalable authorization patterns.

### Permissions Boundaries

Maximum permissions can be restricted independently from identity policies.

### Organization-Level Controls

SCPs can establish broad organizational permission boundaries.

### Least Privilege

Fine-grained policies allow authority to be limited to required capabilities.

### Access Analysis

AWS provides tooling for analyzing and improving permissions.

---

## Limitations

### Policy Complexity

Large AWS environments may contain many interacting policy types.

### Difficult Effective-Permission Analysis

Understanding why a request was allowed or denied can become complicated.

### Misconfiguration

Incorrect policies can create excessive access or block legitimate workloads.

### Wildcards

Broad statements such as:

```text
Action: "*"
Resource: "*"
```

can create dangerous authority.

### Organization Complexity

Identity policies, resource policies, boundaries, SCPs, session policies, and other controls can interact.

### Cloud Scope

AWS IAM primarily protects AWS resources and AWS API actions.

It does not automatically understand business concepts such as:

```text
Transaction amount

Customer risk

Agent confidence

Approval status

Loan eligibility
```

Application-level authorization remains necessary.

### Shared Roles

If many AI agents share one role, agent-level isolation and accountability can weaken.

---

## Key Takeaways

1. **AWS IAM controls access to AWS resources using identities and policies.**

2. A useful authorization model is:

```text
Principal
    +
Action
    +
Resource
    +
Condition
       ↓
Policy Evaluation
       ↓
ALLOW / DENY
```

3. Identity-based policies answer:

> What can this identity do?

4. Resource-based policies help answer:

> Who can access this resource?

5. IAM roles allow trusted principals and workloads to obtain temporary credentials.

6. Long-lived embedded credentials should generally be avoided when workload identities and temporary credentials are available.

7. AWS follows a default/implicit-deny approach.

8. An applicable **explicit Deny overrides an Allow**.

9. Conditions enable context-aware authorization.

10. RBAC and ABAC approaches can be combined.

11. Permissions boundaries can restrict the maximum permissions an identity can receive.

12. SCPs can impose organization-level permission boundaries.

13. Least privilege is fundamental.

14. Cloud IAM should not be confused with business-level AI-agent authorization.

15. Infrastructure should independently reject unauthorized operations even if an AI agent requests them.

---

## How We'll Use This in Our Project

AWS IAM gives us several important architectural ideas.

### 1. Default Deny

Our authorization system should begin with:

```text
DEFAULT

DENY
```

Access should exist only when policy explicitly permits it.

---

### 2. Explicit Hard Restrictions

We should consider policies capable of expressing:

```text
DENY

AI agents

→ modify their own permissions
```

or:

```text
DENY

SupportAgent

→ payment.execute
```

A hard deny should override more general permissions.

---

### 3. Principal + Action + Resource + Context

Our authorization requests should eventually resemble:

```text
Principal:
PaymentAgent

Action:
payment.execute

Resource:
CustomerAccount-928

Context:
{
    amount: 25000,
    beneficiaryType: "new",
    riskLevel: "high"
}
```

This is much richer than:

```text
agent.hasPermission("payment")
```

---

### 4. Identity and Resource Policies

We should consider whether our architecture needs both perspectives:

```text
AGENT POLICY

"What may PaymentAgent access?"
```

and:

```text
RESOURCE POLICY

"Which agents may access PaymentService?"
```

This could provide stronger control over sensitive resources.

---

### 5. Maximum Permission Boundaries

AWS permissions boundaries suggest a useful concept:

```text
Agent Assigned Permissions
          ↓
Maximum Agent Boundary
          ↓
Effective Authority
```

Even if a permission is accidentally granted, it should not exceed the agent's maximum permitted capability.

---

### 6. Organization-Level Policies

We may need policies that apply to **every agent**.

Examples:

```text
No AI agent may modify
its own authorization policy.

No production agent may
disable audit logging.

No low-risk agent may access
highly sensitive resources.
```

These should sit above individual agent permissions.

---

### 7. Temporary Elevated Access

High-risk permissions should not necessarily be permanent.

Conceptually:

```text
Agent
 ↓
Requests Sensitive Capability
 ↓
Policy + Risk Check
 ↓
Approval
 ↓
Temporary Authorization
 ↓
Execute
 ↓
Authorization Expires
```

This could become useful in our architecture.

---

### 8. Analyze Permissions Continuously

Governance should not stop after permission assignment.

Our project could eventually identify:

```text
Agents with excessive permissions

Agents with unused permissions

Sensitive resources with broad access

Recent permission changes

High-risk permissions

Shared identities

Permission anomalies
```

This connects authorization with governance and risk management.

---

## Architectural Insight

Google Cloud IAM taught us:

```text
Principal
   ↓
Role
   ↓
Permissions
   ↓
Resource
```

AWS IAM adds several important ideas:

```text
                    Authorization Request

Principal + Action + Resource + Context
                    │
                    ▼
             Applicable Policies
                    │
          ┌─────────┴─────────┐
          │                   │
    Identity Policies    Resource Policies
          │                   │
          └─────────┬─────────┘
                    │
            Permission Boundary
                    │
            Organization Rules
                    │
                    ▼
             Policy Evaluation
                    │
           ┌────────┴────────┐
           ▼                 ▼
         ALLOW              DENY
```

For our AI-agent governance project, this suggests an eventual model closer to:

```text
Agent Identity
      +
Action
      +
Resource
      +
Context
      +
Agent Permissions
      +
Resource Policy
      +
Organization Policy
      +
Risk
      +
Approval
      ↓
Final Decision
```

The central lesson is:

> **Authorization is not simply "does this agent have a role?" It is the evaluation of identity, requested action, target resource, applicable policies, contextual conditions, and higher-level boundaries.**

---

## Sources

* AWS — IAM User Guide: Introduction to AWS Identity and Access Management.
* AWS — Policies and Permissions in IAM.
* AWS — Policy Evaluation Logic.
* AWS — Identity-Based Policies and Resource-Based Policies.
* AWS — IAM Roles.
* AWS — Temporary Security Credentials.
* AWS — IAM Policy Elements: Principal, Action, Resource, Effect, and Condition.
* AWS — Permissions Boundaries for IAM Entities.
* AWS Organizations — Service Control Policies.
* AWS — Attribute-Based Access Control.
* AWS — IAM Access Analyzer.
* AWS — Security Best Practices in IAM.
