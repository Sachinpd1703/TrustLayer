# Google Cloud IAM

## Overview

**Google Cloud Identity and Access Management (IAM)** is Google Cloud's authorization system for controlling **who can perform which actions on which resources**.

At its core, IAM answers:

> **Who can do what on which resource?**

A simplified model is:

```text
WHO
 ↓
Principal

CAN DO WHAT
 ↓
Role / Permissions

ON WHICH RESOURCE
 ↓
Google Cloud Resource
```

Example:

```text
Principal:
payment-agent@project.iam.gserviceaccount.com

Role:
Storage Object Viewer

Resource:
Customer Documents Bucket
```

Conceptually:

```text
Payment Agent
      ↓
requests access
      ↓
Customer Documents
      ↓
Google Cloud IAM
      ↓
Evaluate Policies
      ↓
ALLOW / DENY
```

Google Cloud IAM is important for our research because it demonstrates how a large-scale production system separates:

```text
Identity
    +
Permissions
    +
Roles
    +
Resources
    +
Policies
```

rather than scattering authorization logic throughout application code.

---

## Why It Exists

Imagine an organization using Google Cloud with:

```text
500 employees

100 applications

50 service accounts

20 AI agents

Thousands of cloud resources
```

Resources may include:

```text
Cloud Storage

BigQuery

Compute Engine

Cloud SQL

Pub/Sub

Secret Manager

Vertex AI
```

Without centralized authorization, every application could implement its own access rules:

```text
if user == "alice":
    allow()

if service == "payment-service":
    allow()

if agent == "fraud-agent":
    allow()
```

This quickly becomes difficult to:

* manage
* audit
* review
* update
* revoke
* scale

IAM provides a centralized authorization model.

```text
Principal
     ↓
IAM Policy
     ↓
Role
     ↓
Permissions
     ↓
Resource
```

---

## Core Concepts

The most important Google Cloud IAM concepts for our project are:

1. Principal
2. Resource
3. Permission
4. Role
5. IAM Policy
6. Policy Binding
7. Resource Hierarchy
8. Policy Inheritance
9. IAM Conditions
10. Service Accounts
11. Workload Identity
12. Least Privilege

---

# Principal

## Definition

A **principal** is an identity that can potentially access a Google Cloud resource.

Examples include:

```text
Human User

Service Account

Google Group

Workload Identity

Federated Identity
```

Conceptually:

> **Principal = WHO is requesting access?**

Example:

```text
User:
alice@example.com
```

or:

```text
Service Account:
payment-service@project.iam.gserviceaccount.com
```

For our AI-agent research, the important idea is that an agent or the workload running it needs a distinguishable identity if we want meaningful authorization and auditing.

```text
PaymentAgent
      ≠
FraudAgent
      ≠
LoanAgent
```

If every agent shares the same powerful identity, determining which agent actually had authority becomes much harder.

---

# Resource

## Definition

A **resource** is an object or service being accessed.

Examples:

```text
Project

Cloud Storage Bucket

BigQuery Dataset

Secret

Compute Instance

Pub/Sub Topic
```

Conceptually:

> **Resource = WHAT is being accessed?**

Example:

```text
Principal:
AnalyticsService

Action:
Read

Resource:
CustomerAnalyticsDataset
```

---

# Permission

## Definition

A **permission** represents the ability to perform a particular operation on a resource.

Examples conceptually resemble:

```text
storage.objects.get

storage.objects.create

storage.objects.delete

bigquery.tables.get

secretmanager.versions.access
```

Permissions are fine-grained capabilities.

For example:

```text
storage.objects.get
```

means the principal can perform the corresponding operation when authorization permits it.

---

# Roles

## Definition

A **role** is a collection of permissions.

Instead of assigning hundreds of individual permissions to every principal, permissions are grouped into roles.

Conceptually:

```text
Role:
Storage Object Viewer

Contains:

storage.objects.get
storage.objects.list
...
```

Then:

```text
Principal
      ↓
assigned Role
      ↓
Role contains Permissions
      ↓
Principal receives capabilities
```

This is a form of **Role-Based Access Control (RBAC)**.

---

## Example

Suppose:

```text
Principal:
ReportingService

Role:
BigQuery Data Viewer
```

The role contains permissions needed to view relevant BigQuery data.

Instead of managing each permission independently:

```text
Permission A ✓
Permission B ✓
Permission C ✓
Permission D ✓
```

the administrator assigns:

```text
Role:
BigQuery Data Viewer
```

---

# Types of Roles

Google Cloud has three broad role categories.

## Basic Roles

Historically broad roles such as:

```text
Owner

Editor

Viewer
```

These can provide very wide access and are generally less suitable when fine-grained least privilege is required.

---

## Predefined Roles

Google creates service-specific roles.

Examples include roles for:

```text
Cloud Storage

BigQuery

Compute Engine

Secret Manager

Pub/Sub
```

These provide more specific permissions than broad basic roles.

---

## Custom Roles

Organizations can create their own roles containing selected supported permissions.

For example, imagine our application needs only:

```text
customer.read

transaction.read
```

but an existing role effectively provides:

```text
customer.read

customer.update

customer.delete

transaction.read

transaction.update
```

A narrower custom role can help avoid unnecessary authority where supported.

This directly supports:

> **Least privilege**

---

# IAM Policy

## Definition

An **allow policy** connects principals to roles on a resource.

Conceptually:

```text
RESOURCE

CustomerDataProject

      │
      ▼

IAM Policy

      │
      ├── Principal A → Role X
      │
      ├── Principal B → Role Y
      │
      └── Principal C → Role Z
```

A simplified conceptual policy might look like:

```yaml
bindings:
  - role: roles/storage.objectViewer
    members:
      - serviceAccount:reporting-agent@example-project.iam.gserviceaccount.com
```

Meaning:

```text
Reporting Agent
      ↓
receives
      ↓
Storage Object Viewer Role
      ↓
on this resource
```

The exact effective access also depends on resource hierarchy, inherited policies, conditions, and other applicable IAM controls.

---

# Policy Binding

A **binding** connects:

```text
Principal(s)
      +
Role
```

and can optionally include a condition.

Conceptually:

```text
Role:
Storage Object Viewer

Members:
ReportingService
AnalyticsService
```

The policy is attached to a resource.

Therefore:

```text
Resource
   ↓
Policy
   ↓
Binding
   ↓
Principal → Role
```

This is an important distinction.

A role defines:

> **Which permissions exist in this capability bundle?**

A policy binding defines:

> **Who receives that role on this resource?**

---

# Authorization Workflow

Suppose:

```text
ReportingService
```

requests access to:

```text
CustomerAnalyticsBucket
```

The workflow can be simplified as:

```text
Request
   ↓
Identify Principal
   ↓
Identify Resource
   ↓
Identify Required Permission
   ↓
Evaluate Applicable IAM Policies
   ↓
Evaluate Conditions
   ↓
Does Principal Have Required Permission?
   ↓
ALLOW / DENY
```

Example:

```text
Principal:
ReportingService

Requested Operation:
Read object

Required Permission:
storage.objects.get

Resource:
CustomerAnalyticsBucket
```

IAM determines whether applicable policies grant the principal a role containing that permission.

---

# Resource Hierarchy

One particularly important Google Cloud concept is its **resource hierarchy**.

A simplified hierarchy is:

```text
Organization
     ↓
Folder
     ↓
Project
     ↓
Resource
```

Example:

```text
Bank Organization
│
├── Retail Banking Folder
│   │
│   └── Payments Project
│       │
│       ├── Storage Bucket
│       └── Pub/Sub Topic
│
└── Risk Folder
    │
    └── Fraud Project
        │
        └── BigQuery Dataset
```

Policies can be applied at different levels.

This makes authorization manageable at large scale.

---

# Policy Inheritance

Resources can inherit applicable IAM allow policies from ancestors in the resource hierarchy.

For example:

```text
Organization
     │
     │ Policy:
     │ SecurityTeam → Security Role
     │
     ▼
Project
     │
     ▼
Resource
```

A permission granted at a higher level can therefore affect many resources below it.

This is powerful but also dangerous if overly broad permissions are assigned high in the hierarchy.

For example:

```text
Organization
     ↓
Very Powerful Role
     ↓
Agent
```

may unintentionally provide access across many projects.

This reinforces the need for careful scope selection and least privilege.

---

# IAM Conditions

## Definition

**IAM Conditions** allow access bindings to apply only when specified conditions are satisfied.

Without conditions:

```text
Principal
   ↓
Role
   ↓
Resource
```

With conditions:

```text
Principal
   ↓
Role
   ↓
Resource
   ↓
ONLY IF CONDITION IS TRUE
```

Conditions can use attributes available to IAM, depending on the resource and service.

For example, access might be constrained based on:

```text
Time

Resource attributes

Request attributes
```

Conceptually:

```text
Allow SupportEngineer

to access Resource X

only before:

2026-08-01
```

This introduces **context-aware authorization**.

---

# RBAC vs Attribute-Based Conditions

Basic RBAC asks:

```text
What role does this principal have?
```

More contextual authorization can additionally ask:

```text
Which resource?

At what time?

Under what request conditions?

Which attributes apply?
```

Conceptually:

```text
Principal
    +
Role
    +
Resource
    +
Context
       ↓
Authorization Decision
```

This idea will become very important when we later study **Cedar**.

---

# Service Accounts

## Definition

A **service account** is an identity intended for workloads rather than human users.

Examples:

```text
Backend Service

Scheduled Job

Microservice

Application

Automation
```

Instead of:

```text
Human User
   ↓
Application
   ↓
Cloud Resource
```

a workload can operate as:

```text
Service Account
      ↓
IAM
      ↓
Cloud Resource
```

This lets the system identify the workload independently from a human user.

---

## Why Important for AI Agents

Imagine:

```text
PaymentAgent

FraudAgent

LoanAgent
```

If all three operate using:

```text
shared-ai-admin@...
```

they effectively share the same cloud authority.

That creates problems:

```text
Who actually accessed the resource?

Which agent had the permission?

Can we disable only PaymentAgent?

Can FraudAgent access payment resources?
```

A better conceptual model is:

```text
Payment Agent
      ↓
Payment Workload Identity
      ↓
Payment Permissions
```

```text
Fraud Agent
      ↓
Fraud Workload Identity
      ↓
Fraud Permissions
```

This creates stronger isolation.

However, an AI agent's logical identity and a cloud service account are not necessarily the same concept.

The service account identifies the **workload executing in Google Cloud**.

Our governance system may additionally maintain an application-level identity for the specific AI agent.

---

# Workload Identity

Modern cloud environments try to avoid long-lived credentials whenever possible.

Instead of giving an application:

```text
Static Credential
      ↓
stored somewhere
      ↓
used indefinitely
```

workload identity approaches allow workloads to obtain short-lived credentials based on their trusted runtime identity.

Conceptually:

```text
Trusted Workload
      ↓
Identity Federation / Runtime Identity
      ↓
Short-Lived Credential
      ↓
Google Cloud Resource
```

This reduces risks associated with long-lived service-account keys.

For AI-agent architecture, this suggests:

> **Agent workloads should use strongly managed identities rather than embedded long-lived credentials.**

---

# Least Privilege

**Least privilege** means giving a principal only the permissions required to perform its task.

Bad:

```text
CustomerSupportAgent

Admin
```

Better:

```text
CustomerSupportAgent

customer.read

transaction.read

support_case.create
```

Not:

```text
payment.execute

loan.approve

customer.delete

iam.admin
```

Least privilege reduces the potential impact of:

```text
Agent failure

Prompt injection

Credential compromise

Software bugs

Malicious activity
```

This principle is extremely important for AI agents.

---

# Role Explosion

RBAC can create another problem as systems become more complex.

Suppose we need:

```text
Support Agent

Payment Agent

Fraud Agent

Loan Agent
```

and then:

```text
India Support Agent

US Support Agent

Senior Support Agent

Temporary Support Agent

Read-Only Support Agent
```

Soon we may have many specialized roles.

```text
Role A

Role B

Role C

...

Role 500
```

This is sometimes called **role explosion**.

Contextual or attribute-based policy approaches can sometimes reduce the need to create a new role for every possible combination.

This is one reason systems increasingly combine:

```text
RBAC
   +
Attributes / Conditions
   +
Policy
```

---

# IAM and AI Agents

Now connect IAM concepts to our project.

Suppose we have:

```text
PaymentAgent

FraudAgent

SupportAgent
```

Each should have different capabilities.

### Payment Agent

```text
Account:
READ

Transactions:
READ

Payments:
CREATE

Customer Admin:
NONE
```

### Fraud Agent

```text
Account:
READ

Transactions:
READ

Fraud Signals:
READ / WRITE

Payments:
NONE
```

### Support Agent

```text
Customer:
LIMITED READ

Transactions:
LIMITED READ

Support Cases:
CREATE / UPDATE

Payments:
NONE
```

This creates:

```text
Agent Identity
      ↓
Roles / Permissions
      ↓
Resources
```

which closely resembles IAM.

---

# Cloud IAM vs Agent-Level Authorization

This distinction is extremely important for our architecture.

Google Cloud IAM can answer questions such as:

> Can this workload access this Google Cloud resource?

But our AI governance system may need to answer:

> Can PaymentAgent initiate a $20,000 payment for Customer-928 under the current circumstances?

These are different authorization layers.

Cloud IAM might say:

```text
Payment Service Workload
      ↓
Can call Payment Infrastructure?
      ↓
YES
```

Our application policy may still say:

```text
PaymentAgent

payment.execute

amount = $20,000

new beneficiary = true

      ↓

HUMAN APPROVAL REQUIRED
```

Therefore:

```text
Cloud IAM
   ↓
Infrastructure / Cloud Access

Application Policy
   ↓
Business-Level Authorization
```

Both may be required.

---

# Authentication vs Authorization

Another important distinction:

## Authentication

> **Who are you?**

Example:

```text
This request came from:

PaymentServiceAccount
```

## Authorization

> **What are you allowed to do?**

Example:

```text
Can PaymentServiceAccount

read this Storage Bucket?

YES / NO
```

Conceptually:

```text
Request
   ↓
Authentication
   ↓
WHO?
   ↓
Authorization
   ↓
WHAT CAN THEY DO?
```

These concepts should remain separate in our project.

---

# Real-World Banking Example

Suppose a bank runs an AI fraud-analysis system on Google Cloud.

Architecture:

```text
Fraud Agent
     ↓
Application Workload
     ↓
Google Cloud Identity
     ↓
IAM
     ↓
BigQuery Fraud Dataset
```

The agent needs transaction data but should not modify it.

Therefore the workload receives a role providing the necessary read permissions.

```text
Fraud Agent

Fraud Dataset:
READ ✓

WRITE ✗

DELETE ✗
```

Now imagine malicious input influences the agent and it attempts:

```text
deleteFraudDataset()
```

At the cloud authorization layer:

```text
Principal
   ↓
requests DELETE
   ↓
IAM
   ↓
Required permission available?
   ↓
NO
   ↓
DENY
```

Even if the AI attempted the action, the underlying infrastructure still enforces its own authorization.

This demonstrates **defense in depth**.

---

# Another Example — Secret Access

Suppose:

```text
Payment Agent
```

requires access to:

```text
Payment API Credential
```

stored in Secret Manager.

The workload might receive narrowly scoped permission to access only the required secret.

Bad:

```text
PaymentAgent

All Secrets
    ↓
READ
```

Better:

```text
PaymentAgent

PaymentAPISecret
    ↓
READ
```

and:

```text
FraudAPISecret
    ↓
DENY
```

This reduces blast radius if the workload is compromised.

---

# IAM Auditability

Authorization systems also need observability.

Organizations need to investigate questions such as:

```text
Who changed this policy?

Which principal accessed this resource?

When did the access happen?

Which operation was attempted?

Was the request allowed?

Which identity performed it?
```

Google Cloud provides audit logging capabilities that can record administrative activity and, depending on configuration/service, data access events.

This reinforces an important lesson for our project:

> **Authorization decisions should be observable and auditable.**

For our agent system, we should eventually be able to record:

```text
Agent

Principal

Action

Resource

Policy

Decision

Timestamp
```

---

# IAM vs Governance

IAM and governance are related but different.

IAM answers:

> **What can this principal access?**

Governance asks:

```text
Why does it have access?

Who approved the access?

Who owns the principal?

When should access expire?

Who changed the permissions?

What risk level applies?
```

Therefore:

```text
Governance
    ↓
Determines accountability
and access requirements

IAM
    ↓
Enforces infrastructure
access permissions
```

---

# IAM vs Guardrails

IAM primarily protects access to resources.

Guardrails are broader.

For example:

```text
Google Cloud IAM

Can PaymentAgent
access Payment Service infrastructure?

YES
```

But an action guardrail might determine:

```text
Can PaymentAgent execute
this $100,000 payment automatically?

NO

Human approval required.
```

Therefore:

```text
IAM
   =
one important authorization layer

Guardrails
   =
broader operational safety controls
```

---

# IAM vs Risk Management

Risk management may determine:

```text
Fraud Agent

Risk:
HIGH

Data Sensitivity:
HIGH
```

This can influence IAM design:

```text
High Risk
    ↓
Smaller Permission Set
    ↓
More Restricted Resources
    ↓
Stronger Monitoring
```

Therefore risk classification can influence how much authority an identity receives.

---

## Advantages

### Centralized Access Control

Authorization can be managed consistently across Google Cloud resources.

### Fine-Grained Permissions

Google Cloud exposes large numbers of resource-specific permissions.

### Role-Based Management

Permissions can be grouped into reusable roles.

### Resource Hierarchy

Policies can be managed across organizations, folders, projects, and resources.

### Conditional Access

IAM Conditions enable more context-sensitive access controls.

### Workload Identities

Applications and services can have identities separate from human users.

### Least Privilege

Roles and resource scope can be restricted to required capabilities.

### Auditability

Cloud audit capabilities help organizations investigate access and administrative changes.

### Large-Scale Management

The model is designed for environments containing many identities and resources.

---

## Limitations

### Complexity

Large IAM environments can become difficult to understand.

### Excessive Permissions

Broad roles or incorrectly scoped bindings can provide unnecessary authority.

### Policy Inheritance

Permissions inherited from higher levels may be overlooked.

### Role Explosion

Large numbers of specialized roles can become difficult to manage.

### Misconfiguration Risk

Incorrect IAM configuration can create either excessive access or unexpected denial.

### Cloud Scope

Google Cloud IAM primarily governs Google Cloud resources.

It does not automatically understand application-specific concepts such as:

```text
Payment amount

Loan risk score

Agent confidence

Customer relationship

Human approval state
```

Application-level authorization may still be required.

### Shared Identity Problems

If multiple AI agents share the same workload identity, agent-level accountability becomes weaker.

---

## Key Takeaways

1. **Google Cloud IAM controls who can perform which actions on Google Cloud resources.**

2. The fundamental model is:

```text
Principal
    +
Role
    +
Permissions
    +
Resource
```

3. **Principal = WHO**

4. **Permission = specific capability**

5. **Role = collection of permissions**

6. **Policy binding = principal receives role on a resource**

7. Google Cloud organizes resources hierarchically:

```text
Organization
 ↓
Folder
 ↓
Project
 ↓
Resource
```

8. Policies can affect resources through hierarchy and inheritance.

9. IAM Conditions can make access dependent on contextual attributes.

10. Service accounts and workload identity allow non-human workloads to have their own identities.

11. **Least privilege** is critical: give workloads only the authority they actually require.

12. Authentication and authorization are different:

```text
Authentication
=
Who are you?

Authorization
=
What can you do?
```

13. Cloud IAM and AI-agent authorization are not necessarily the same layer.

14. Cloud IAM can protect infrastructure while application policies govern business-level actions.

15. An AI model requesting an operation should never override the authorization enforced by the underlying infrastructure.

---

## How We'll Use This in Our Project

Google Cloud IAM gives us several architectural ideas worth adopting independently of whether we use Google Cloud.

### 1. Every Agent Needs Identity

Instead of:

```text
AI System
```

we should distinguish:

```text
Agent-001

Agent-002

Agent-003
```

with identifiable owners and capabilities.

---

### 2. Separate Permissions From Agents

Avoid hardcoding:

```text
if agent == "PaymentAgent":
    allowPayment()
```

Prefer:

```text
Agent
  ↓
Assigned Permission / Policy
  ↓
Authorization Decision
```

This separates identity from authorization rules.

---

### 3. Model Actions as Permissions

Examples:

```text
customer.read

transaction.read

payment.prepare

payment.execute

loan.recommend

fraud_case.create
```

This gives us a common authorization vocabulary.

---

### 4. Scope Permissions to Resources

Instead of:

```text
payment.execute
```

alone, authorization should consider:

```text
Principal
    +
Action
    +
Resource
```

and sometimes:

```text
Context
```

---

### 5. Apply Least Privilege

An agent should receive only the tools and permissions required for its purpose.

```text
SupportAgent

customer.read       ✓
support.create      ✓

payment.execute     ✗
loan.approve        ✗
permissions.admin   ✗
```

---

### 6. Keep Infrastructure and Business Authorization Separate

Our eventual architecture may resemble:

```text
AI Agent
   ↓
Agent-Level Authorization
   ↓
Tool
   ↓
Cloud / Infrastructure IAM
   ↓
Backend Resource
```

Example:

```text
PaymentAgent
   ↓
Can this agent execute
this payment?
   ↓
Application Policy
   ↓
Payment Service
   ↓
Can this workload access
the required cloud resource?
   ↓
Cloud IAM
```

This creates multiple independent security boundaries.

---

### 7. Record Authorization Decisions

Our project should eventually capture:

```text
Principal

Agent

Action

Resource

Context

Policy

Decision

Reason

Timestamp
```

This supports governance and auditing.

---

## Architectural Insight

The biggest lesson from Google Cloud IAM is not:

> "We should use Google Cloud IAM."

The important lesson is its **authorization model**:

```text
IDENTITY
   ↓
PRINCIPAL
   ↓
ROLE / PERMISSIONS
   ↓
RESOURCE
   ↓
POLICY
   ↓
AUTHORIZATION DECISION
```

Our AI-agent governance architecture will likely need similar concepts, while adding agent-specific information:

```text
Agent Identity
      +
Owner
      +
Purpose
      +
Permissions
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
Decision
```

Google Cloud IAM teaches us how mature infrastructure systems answer:

> **Who can access what?**

Our project may need to extend that idea to answer:

> **Which AI agent can perform which action on which resource, under what conditions, with what risk, and under whose authority?**

---

## Sources

* Google Cloud — IAM Overview
  Official documentation explaining IAM principals, roles, resources, permissions, and policies.

* Google Cloud — IAM Roles and Permissions
  Official documentation covering basic, predefined, and custom roles.

* Google Cloud — IAM Resource Hierarchy
  Documentation explaining organizations, folders, projects, resources, and inherited policies.

* Google Cloud — IAM Conditions
  Official documentation for conditional role bindings.

* Google Cloud — Service Accounts
  Documentation covering workload identities represented through service accounts.

* Google Cloud — Workload Identity Federation
  Documentation covering access to Google Cloud using federated workload identities without relying on long-lived service-account keys.

* Google Cloud — Cloud Audit Logs
  Documentation covering administrative and data-access audit logging.

* Google Cloud — IAM Best Practices
  Guidance covering least privilege, service accounts, policy management, and secure IAM configuration.
