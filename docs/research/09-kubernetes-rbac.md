# Kubernetes RBAC

## Overview

**Kubernetes Role-Based Access Control (RBAC)** is an authorization mechanism used to control what users, groups, and service accounts can do with Kubernetes resources.

At a high level, Kubernetes RBAC answers:

> **Can this subject perform this action on this Kubernetes resource?**

A useful mental model is:

```text
WHO?
 ↓
Subject

CAN DO WHAT?
 ↓
Verb

ON WHAT?
 ↓
Resource

WHERE?
 ↓
Namespace / Cluster

        ↓

RBAC Evaluation

        ↓

ALLOW / DENY
```

For example:

```text
Subject:
payment-service

Verb:
get

Resource:
pods

Namespace:
payments

        ↓

Kubernetes Authorization

        ↓

ALLOW / DENY
```

Kubernetes RBAC is useful for our AI-agent research because it demonstrates a relatively clean separation between:

```text
Identity
   +
Permissions
   +
Roles
   +
Scope
   +
Bindings
```

The most important concepts are:

1. Subject
2. Resource
3. Verb
4. Role
5. ClusterRole
6. RoleBinding
7. ClusterRoleBinding
8. Namespace
9. ServiceAccount
10. Least Privilege

---

## Why It Exists

Imagine a Kubernetes cluster running:

```text
Payment Service

Fraud Service

Customer Service

Loan Service

AI Agents

Databases

Monitoring

Internal Tools
```

Different users and workloads require different access.

For example:

```text
Developer

pods.get       ✓
pods.list      ✓
pods.logs      ✓

secrets.get    ✗
pods.delete    ✗
```

while an operations administrator may require broader capabilities.

Without centralized authorization, access control would become difficult to manage.

Kubernetes RBAC provides:

```text
Subject
   ↓
Role
   ↓
Permissions
   ↓
Resources
```

---

# Authentication vs Authorization

Before understanding RBAC, we need to separate two concepts.

## Authentication

Authentication asks:

> **Who are you?**

Kubernetes first determines the identity associated with the request.

Examples might include:

```text
User

ServiceAccount

External Identity
```

---

## Authorization

Authorization asks:

> **What is this identity allowed to do?**

For example:

```text
Subject:
payment-agent

Action:
get

Resource:
secrets

Namespace:
payments

        ↓

Allowed?
```

RBAC participates in answering this second question.

Therefore:

```text
Request
   ↓
Authentication
   ↓
Identity Established
   ↓
Authorization
   ↓
ALLOW / DENY
```

---

# Subject

## Definition

A **subject** is the identity receiving permissions through an RBAC binding.

Common subjects include:

```text
User

Group

ServiceAccount
```

Conceptually:

> **Subject = WHO receives the permissions?**

Example:

```text
Subject:

payment-agent
```

For AI systems, a Kubernetes ServiceAccount may represent the workload running an agent.

For example:

```text
Payment Agent Pod
       ↓
ServiceAccount:
payment-agent
       ↓
Kubernetes RBAC
```

---

# Resource

## Definition

A **resource** is a Kubernetes object against which an operation is performed.

Examples include:

```text
pods

deployments

services

configmaps

secrets

jobs
```

For example:

```text
Resource:

pods
```

RBAC can also control access to API groups and certain subresources.

---

# Verb

## Definition

A **verb** represents an operation that may be performed.

Common verbs include:

```text
get

list

watch

create

update

patch

delete
```

For example:

```text
get pods
```

means:

> Retrieve information about a pod.

while:

```text
delete pods
```

represents significantly more authority.

Therefore permissions are generally combinations of:

```text
Verb
  +
Resource
```

Example:

```text
get pods

list pods

create jobs

read secrets
```

---

# Role

## Definition

A Kubernetes **Role** defines a collection of permissions within a particular namespace.

Example:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: payments
  name: payment-reader
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
```

Conceptually:

```text
Role:

payment-reader

Permissions:

pods.get
pods.list

Scope:

payments namespace
```

A Role defines permissions.

It does **not** by itself assign those permissions to anyone.

That requires a binding.

This distinction is extremely important:

> **Role = What permissions exist**

> **RoleBinding = Who receives them**

---

# RoleBinding

## Definition

A **RoleBinding** assigns permissions from a Role or ClusterRole to subjects within a namespace.

Conceptually:

```text
Subject:

payment-agent

       ↓

RoleBinding

       ↓

Role:

payment-reader
```

Result:

```text
payment-agent

can:

get pods
list pods

inside:

payments namespace
```

Example:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payment-reader-binding
  namespace: payments
subjects:
  - kind: ServiceAccount
    name: payment-agent
    namespace: payments
roleRef:
  kind: Role
  name: payment-reader
  apiGroup: rbac.authorization.k8s.io
```

The RoleBinding connects:

```text
WHO
 ↓
Subject

TO

WHAT PERMISSIONS
 ↓
Role
```

---

# Namespace

## Definition

A Kubernetes **namespace** provides a logical scope for many Kubernetes resources.

Example:

```text
Cluster
│
├── payments
│   ├── payment-api
│   └── payment-agent
│
├── fraud
│   ├── fraud-api
│   └── fraud-agent
│
└── support
    ├── support-api
    └── support-agent
```

Namespaces allow resources and permissions to be separated.

For example:

```text
PaymentAgent

get pods

Namespace:
payments
```

does not automatically mean:

```text
PaymentAgent

get pods

Namespace:
fraud
```

This demonstrates an important authorization principle:

> **Permissions should have scope.**

---

# ClusterRole

## Definition

A **ClusterRole** also defines permissions, but unlike a Role, it is a cluster-scoped object.

ClusterRoles can be used for:

* cluster-scoped resources
* reusable permission sets
* access across namespaces when bound appropriately

Conceptually:

```text
ClusterRole:

pod-reader

Permissions:

get pods
list pods
watch pods
```

The permission definition can then be reused.

---

# ClusterRoleBinding

## Definition

A **ClusterRoleBinding** grants permissions from a ClusterRole across the cluster.

Conceptually:

```text
Subject
   ↓
ClusterRoleBinding
   ↓
ClusterRole
   ↓
Cluster-Wide Permissions
```

For example:

```text
MonitoringService

        ↓

ClusterRole:
pod-reader

        ↓

Can read pods
across namespaces
```

This is more powerful than a namespace-scoped RoleBinding.

Therefore ClusterRoleBindings should be assigned carefully.

---

# Role vs ClusterRole

The distinction can be simplified as:

| Role                                           | ClusterRole                                        |
| ---------------------------------------------- | -------------------------------------------------- |
| Namespaced object                              | Cluster-scoped object                              |
| Typically permissions for namespaced resources | Can represent cluster-wide or reusable permissions |
| Used with RoleBinding                          | Used with RoleBinding or ClusterRoleBinding        |

Example:

```text
Role

payment-reader

Scope:
payments namespace
```

versus:

```text
ClusterRole

cluster-monitor

Scope:
potentially cluster-wide,
depending on binding
```

---

# RoleBinding vs ClusterRoleBinding

Another important distinction:

```text
RoleBinding
     ↓
Grants permissions
within one namespace
```

while:

```text
ClusterRoleBinding
     ↓
Grants ClusterRole permissions
cluster-wide
```

A ClusterRole can also be referenced by a RoleBinding.

In that case, its permissions apply within the RoleBinding's namespace for namespaced resources.

This provides reusable permission definitions without necessarily granting cluster-wide access.

---

# Service Accounts

## Definition

A Kubernetes **ServiceAccount** provides an identity for workloads running inside Kubernetes.

For example:

```text
Payment Agent Pod
       ↓
ServiceAccount:
payment-agent
       ↓
Kubernetes API
```

Instead of all workloads sharing the same identity:

```text
All Applications
      ↓
default
ServiceAccount
```

a stronger design is:

```text
Payment Agent
      ↓
payment-agent ServiceAccount
```

```text
Fraud Agent
      ↓
fraud-agent ServiceAccount
```

```text
Support Agent
      ↓
support-agent ServiceAccount
```

Each can then receive different permissions.

---

# Why Service Accounts Matter for AI Agents

Imagine:

```text
PaymentAgent
FraudAgent
SupportAgent
```

all run inside Kubernetes.

If they all use the same highly privileged ServiceAccount:

```text
AI Agents
    ↓
shared-ai-admin
```

then all agents inherit the same Kubernetes permissions.

This weakens:

```text
Isolation

Least Privilege

Auditability

Revocation

Accountability
```

Instead:

```text
PaymentAgent
      ↓
payment-agent-sa
      ↓
Payment Permissions
```

and:

```text
FraudAgent
      ↓
fraud-agent-sa
      ↓
Fraud Permissions
```

provide stronger separation.

---

# RBAC Authorization Workflow

Suppose:

```text
payment-agent
```

attempts:

```text
get pods
```

inside:

```text
payments namespace
```

A simplified authorization flow is:

```text
Request
   ↓
Authenticate Subject
   ↓
Subject:
payment-agent
   ↓
Requested Verb:
get
   ↓
Resource:
pods
   ↓
Namespace:
payments
   ↓
Find Applicable Bindings
   ↓
Find Referenced Roles
   ↓
Does a Rule Allow
get on pods?
   ↓
YES → ALLOW

NO → DENY
```

Kubernetes authorization is fundamentally allow-oriented.

If no applicable rule grants the requested action:

```text
DENY
```

---

# Default Deny

A useful security property of RBAC is:

> If no authorization rule allows the request, the request is denied.

Conceptually:

```text
Request
   ↓
Matching Permission?
   │
   ├── YES → ALLOW
   │
   └── NO  → DENY
```

This resembles the default-deny principle we saw in AWS IAM.

For our project, this remains an important design principle:

```text
DEFAULT

DENY
```

Agents should receive authority only when explicitly granted.

---

# No Traditional Explicit Deny

This is an important difference from AWS IAM.

Kubernetes RBAC does not provide a normal RBAC rule such as:

```text
Effect:
DENY
```

RBAC rules grant permissions.

If permission is not granted, access is denied.

Therefore:

```text
AWS IAM

Allow + Explicit Deny
```

is different from:

```text
Kubernetes RBAC

Grant required permission
or
no grant → deny
```

This distinction becomes important when comparing authorization models.

---

# Additive Permissions

Kubernetes RBAC permissions are **additive**.

Suppose:

```text
Role A

pods.get
```

and:

```text
Role B

pods.delete
```

If a subject receives both:

```text
Subject
   ↓
Role A + Role B
   ↓
Effective Permissions

pods.get
pods.delete
```

One role does not remove permissions granted by another role.

This makes permission review important.

---

# Least Privilege

As with Google Cloud and AWS IAM, Kubernetes RBAC should follow:

> **Least privilege**

Bad:

```text
PaymentAgent

cluster-admin
```

This could give extremely broad authority.

Better:

```text
PaymentAgent

Required:

get specific ConfigMaps
create specific Jobs
read required resources
```

and nothing more.

Least privilege reduces the potential impact of:

```text
Compromised Agent

Prompt Injection

Application Bug

Credential Theft

Malicious Tool Call
```

---

# Wildcards

RBAC rules can contain wildcards.

For example:

```yaml
resources: ["*"]
verbs: ["*"]
```

Conceptually:

```text
ALL RESOURCES

ALL ACTIONS
```

This is extremely powerful.

For sensitive workloads, broad wildcard permissions should be avoided where narrower permissions are possible.

This is particularly important for AI agents because the agent may be influenced by untrusted input.

The potential blast radius should therefore be minimized.

---

# Privilege Escalation

Authorization systems must also consider whether a principal can indirectly grant itself more authority.

Imagine an agent cannot directly:

```text
delete secrets
```

but it can modify:

```text
RoleBindings
```

and bind itself to:

```text
cluster-admin
```

Then it could indirectly obtain powerful permissions.

Conceptually:

```text
Agent

Cannot:
delete secret

BUT

Can:
modify RBAC

        ↓

Grant itself
cluster-admin

        ↓

Now:

delete secret ✓
```

Kubernetes includes protections around creating or modifying roles and bindings, but permissions involving RBAC administration remain extremely sensitive.

For our project, this gives us an important governance principle:

> **Agents should generally not be able to modify their own authorization.**

---

# Separation of Duties

Another useful security concept is **separation of duties**.

Instead of allowing one agent to perform an entire sensitive workflow:

```text
PaymentAgent

Prepare Payment
      +
Approve Payment
      +
Execute Payment
```

we can separate responsibilities:

```text
Payment Agent
      ↓
Prepare Payment

Risk / Policy System
      ↓
Evaluate

Human / Approval Agent
      ↓
Approve

Payment Service
      ↓
Execute
```

This reduces the possibility that one compromised component controls the entire workflow.

Kubernetes RBAC demonstrates this infrastructure-level idea by assigning different workloads different roles.

---

# Kubernetes RBAC and AI Agents

Suppose our AI-agent platform runs in Kubernetes.

Architecture:

```text
Kubernetes Cluster
│
├── Agent Namespace
│
│   ├── PaymentAgent
│   ├── FraudAgent
│   └── SupportAgent
│
├── Payment Services
│
├── Fraud Services
│
└── Internal Infrastructure
```

Each agent receives a dedicated ServiceAccount.

```text
PaymentAgent
      ↓
payment-agent-sa

FraudAgent
      ↓
fraud-agent-sa

SupportAgent
      ↓
support-agent-sa
```

RBAC can then limit what each workload may do against the Kubernetes API.

---

# Important Limitation

Kubernetes RBAC controls access to the **Kubernetes API**.

It does not automatically control every application API running inside Kubernetes.

This distinction is critical.

Suppose:

```text
PaymentAgent
```

calls:

```text
POST /api/payments
```

on an internal Payment Service.

Kubernetes RBAC does not automatically answer:

> Is PaymentAgent allowed to execute this customer's payment?

RBAC might control:

```text
Can PaymentAgent read Kubernetes Secret X?
```

but application authorization must control:

```text
Can PaymentAgent execute
$25,000 from Account-928?
```

Therefore:

```text
Kubernetes RBAC
       ↓
Infrastructure / Kubernetes
Authorization

Application Policy
       ↓
Business-Level
Authorization
```

These are separate layers.

---

# Real-World Banking Example

Imagine a bank runs three agents:

```text
PaymentAgent

FraudAgent

SupportAgent
```

inside Kubernetes.

Each receives its own ServiceAccount.

---

## Payment Agent

```text
ServiceAccount:

payment-agent
```

Permissions:

```text
Read required ConfigMap        ✓

Read required Secret           ✓

Create payment-processing Job  ✓

Modify deployments             ✗

Modify RBAC                    ✗

Access unrelated secrets       ✗
```

---

## Fraud Agent

```text
ServiceAccount:

fraud-agent
```

Permissions:

```text
Read fraud configuration       ✓

Create investigation Job       ✓

Read payment secrets           ✗

Modify RBAC                    ✗
```

---

## Support Agent

```text
ServiceAccount:

support-agent
```

Permissions:

```text
Read support configuration     ✓

Read support-specific Secret   ✓

Read payment Secret            ✗

Modify deployments             ✗

Modify RBAC                    ✗
```

Now suppose malicious input influences SupportAgent and it attempts to access a payment credential stored as a Kubernetes Secret.

```text
SupportAgent
     ↓
GET payment-secret
     ↓
Kubernetes API
     ↓
Authenticate:
support-agent ServiceAccount
     ↓
RBAC Authorization
     ↓
Matching permission?
     ↓
NO
     ↓
DENY
```

Even if the AI decides it wants the secret, Kubernetes independently rejects the request.

This is another example of:

> **Defense in depth**

---

# RBAC vs ABAC

Kubernetes RBAC primarily organizes authorization around roles.

Conceptually:

```text
Subject
   ↓
Role
   ↓
Permissions
```

An attribute-based system might instead consider:

```text
Subject Attributes
      +
Resource Attributes
      +
Request Context
      ↓
Policy
      ↓
Decision
```

For example:

```text
Agent.department = payments

Resource.department = payments

Environment = production

Risk = low
```

These richer contextual policies are not the primary model of Kubernetes RBAC.

This is one reason external policy engines can become useful.

---

# RBAC vs Policy-Based Authorization

Suppose we want this rule:

> PaymentAgent can execute payments below $1,000 automatically, but payments above $1,000 require human approval.

Kubernetes RBAC is not designed to naturally express business-level authorization such as:

```text
IF

agent = PaymentAgent

AND

action = payment.execute

AND

amount > 1000

THEN

require approval
```

RBAC is much better suited to:

```text
Can ServiceAccount X

perform verb Y

on Kubernetes resource Z?
```

This distinction leads directly toward policy engines such as OPA.

---

# Kubernetes RBAC vs Google Cloud IAM

Google Cloud IAM:

```text
Principal
   ↓
Role
   ↓
Permissions
   ↓
Resource
```

Kubernetes RBAC:

```text
Subject
   ↓
RoleBinding
   ↓
Role
   ↓
Verb + Resource
```

The models are conceptually similar.

Both separate:

```text
WHO

from

WHAT THEY CAN DO
```

and both support scoped authorization.

---

# Kubernetes RBAC vs AWS IAM

AWS IAM can express policies using:

```text
Principal

Action

Resource

Condition

Effect
```

Kubernetes RBAC is generally simpler:

```text
Subject

Verb

Resource

Scope

Role

Binding
```

AWS IAM also has an explicit deny concept.

Kubernetes RBAC is primarily additive:

```text
Permission granted
    ↓
ALLOW

Permission not granted
    ↓
DENY
```

There is no normal RBAC `Deny` rule that overrides another Role.

---

# Comparison of Existing Authorization Systems

We can now compare the three systems studied.

| Concept             | Google Cloud IAM                             | AWS IAM                             | Kubernetes RBAC                 |
| ------------------- | -------------------------------------------- | ----------------------------------- | ------------------------------- |
| Actor               | Principal                                    | Principal                           | Subject                         |
| Capability          | Permission                                   | Action                              | Verb                            |
| Permission grouping | Role                                         | Policies / Role                     | Role / ClusterRole              |
| Target              | Resource                                     | Resource                            | Resource                        |
| Assignment          | Policy Binding                               | Policy attachment / resource policy | RoleBinding                     |
| Context             | IAM Conditions                               | Conditions                          | Limited in core RBAC            |
| Workload Identity   | Service Account / federation                 | IAM Role                            | ServiceAccount                  |
| Default behavior    | No applicable grant → deny                   | Implicit deny                       | No applicable grant → deny      |
| Explicit deny model | Available through IAM deny-policy mechanisms | Core IAM concept                    | Not part of standard RBAC rules |
| Main scope          | Google Cloud                                 | AWS                                 | Kubernetes API                  |

Despite their differences, all three systems revolve around a common question:

```text
WHO

can perform

WHAT ACTION

on

WHICH RESOURCE

under

WHICH RULES?
```

---

# Authorization Is Separate From Execution

This is one of the most important concepts to carry into OPA.

Suppose Kubernetes authorization determines:

```text
Can payment-agent
create Job?

        ↓

YES
```

Kubernetes authorization does not itself create the Job.

Instead:

```text
Request
   ↓
Authorization
   ↓
ALLOW
   ↓
Kubernetes API Server
   ↓
Execute Operation
```

Authorization answers:

```text
YES / NO
```

The application or system performs the operation.

This same separation appears in policy engines:

```text
Policy Engine
     ↓
DECIDES

Application
     ↓
EXECUTES
```

Keep this distinction in mind for OPA.

---

# Advantages

## Simple Mental Model

The core model is relatively easy to understand:

```text
Subject
   ↓
Binding
   ↓
Role
   ↓
Verb + Resource
```

## Separation of Identity and Permissions

Permissions are defined independently from individual subjects.

## Namespace Scoping

Access can be restricted to specific namespaces.

## Reusable Roles

ClusterRoles can provide reusable permission definitions.

## Workload Identity

ServiceAccounts provide identities for applications and agents.

## Least Privilege

Workloads can receive narrowly scoped permissions.

## Default Deny

Actions without applicable grants are rejected.

## Kubernetes Integration

RBAC is integrated directly into Kubernetes API authorization.

---

# Limitations

## Limited Business Context

Kubernetes RBAC cannot naturally express complex rules involving:

```text
Transaction Amount

Risk Score

Customer Type

Agent Confidence

Approval Status

Business Hours
```

## No Standard Explicit Deny Rules

Permissions are additive rather than based on Allow/Deny statements.

## Role Explosion

Many specialized permission combinations can produce many roles.

## Misconfiguration

Broad ClusterRoles or ClusterRoleBindings can create excessive authority.

## Wildcard Risk

Rules containing:

```text
verbs: ["*"]

resources: ["*"]
```

can provide extremely broad access.

## Infrastructure Scope

RBAC primarily governs Kubernetes API operations rather than application-specific business actions.

## Shared ServiceAccounts

Sharing one ServiceAccount among many agents weakens isolation and accountability.

---

# Key Takeaways

1. **Kubernetes RBAC controls what authenticated subjects can do with Kubernetes API resources.**

2. The core model is:

```text
Subject
   +
Verb
   +
Resource
   +
Scope
```

3. A **Role** defines permissions within a namespace.

4. A **ClusterRole** defines a reusable or cluster-scoped permission set.

5. A **RoleBinding** assigns permissions within a namespace.

6. A **ClusterRoleBinding** grants ClusterRole permissions cluster-wide.

7. **ServiceAccounts provide workload identities.**

8. Different AI agents should ideally use distinguishable workload identities when their permissions differ.

9. Kubernetes RBAC follows a default-deny approach when no permission grants the request.

10. Standard RBAC permissions are additive and do not provide AWS-style explicit deny rules.

11. Least privilege remains critical.

12. Agents generally should not be able to modify their own authorization.

13. Kubernetes RBAC protects Kubernetes resources, not arbitrary banking business actions.

14. Infrastructure authorization and application authorization are different layers.

15. Authorization makes a decision; another component executes the operation.

---

# How We'll Use This in Our Project

Kubernetes RBAC gives us several useful architectural ideas.

## 1. Separate Identity From Permissions

Instead of:

```text
PaymentAgent has hardcoded access.
```

use:

```text
PaymentAgent
     ↓
Binding
     ↓
Permission Set
```

This makes permissions independently manageable.

---

## 2. Separate Permission Definition From Assignment

Kubernetes distinguishes:

```text
Role
=
WHAT can be done
```

from:

```text
RoleBinding
=
WHO receives that capability
```

Our system could use a similar model:

```text
Agent
   ↓
Policy / Permission Binding
   ↓
Capability
```

---

## 3. Scope Permissions

Authorization should not simply say:

```text
customer.read
```

We should consider:

```text
customer.read

ON

CustomerResource-X
```

or appropriate resource groups.

This creates more precise authorization.

---

## 4. Give Agents Distinct Identities

Instead of:

```text
All Agents
   ↓
shared-service-account
```

prefer:

```text
PaymentAgent
   ↓
Payment Identity

FraudAgent
   ↓
Fraud Identity
```

when independent governance is required.

---

## 5. Default Deny

Our system should follow:

```text
No applicable authorization
        ↓
DENY
```

rather than assuming access.

---

## 6. Prevent Self-Escalation

Agents should generally not receive capabilities such as:

```text
policy.modify

role.assign

permission.grant
```

for their own identities.

Governance changes should pass through a separate trusted control plane.

---

## 7. Separate Infrastructure and Business Authorization

An eventual architecture might contain:

```text
AI Agent
   ↓
Agent Authorization
   ↓
Tool
   ↓
Application Service
   ↓
Infrastructure Identity
   ↓
Kubernetes RBAC / Cloud IAM
   ↓
Infrastructure
```

The layers answer different questions.

### Agent Authorization

```text
Can PaymentAgent execute
this $5,000 payment?
```

### Kubernetes RBAC

```text
Can this ServiceAccount
perform this operation
against the Kubernetes API?
```

Both can be important.

---

# Architectural Insight

We have now studied three mature authorization systems.

### Google Cloud IAM

```text
Principal
   ↓
Role
   ↓
Permissions
   ↓
Resource
```

### AWS IAM

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

### Kubernetes RBAC

```text
Subject
   ↓
Binding
   ↓
Role
   ↓
Verb + Resource
```

Despite different terminology, a common authorization model is emerging:

```text
                AUTHORIZATION REQUEST

                        │
                        ▼

                     WHO?
                        │
                    Principal
                        │
                        ▼

                  WANTS TO DO?
                        │
                     Action
                        │
                        ▼

                      WHAT?
                        │
                    Resource
                        │
                        ▼

                UNDER WHAT CONTEXT?
                        │
                    Attributes
                        │
                        ▼

                     POLICY
                        │
                        ▼

                 ALLOW / DENY
```

For our AI-agent system, we may need to extend this:

```text
Agent Identity
      +
Action
      +
Resource
      +
Context
      +
Risk
      +
Permissions
      +
Organization Policy
      +
Approval State
      ↓
Policy Decision
```

At this point, an important problem appears.

Traditional RBAC works well for:

```text
Can Agent A read Resource B?
```

But AI-agent governance may need policies such as:

```text
PaymentAgent may execute payment

IF

amount < $1,000

AND

customer authenticated = true

AND

risk != high

AND

beneficiary trusted = true
```

or:

```text
IF amount >= $1,000

THEN

require human approval
```

Hardcoding every rule inside application code would become difficult:

```text
if agent == ...
   and amount ...
   and risk ...
   and resource ...
   and user ...
   and environment ...
```

This is where **policy engines** become highly relevant.

Instead of:

```text
Application
   ↓
Contains authorization logic everywhere
```

we can move toward:

```text
Application
     ↓
Authorization Request
     ↓
Policy Engine
     ↓
Decision
     ↓
ALLOW / DENY
```

And critically:

```text
POLICY ENGINE

decides

        ≠

executes
```

The application still performs the actual operation.

This leads directly to the next and one of the **most important research topics for our hackathon**:

# `08-open-policy-agent.md`

There we need to understand:

* What OPA actually is
* Policy Decision Point vs Policy Enforcement Point
* Rego
* `input` and `data`
* How applications ask OPA for decisions
* Allow/deny policies
* Context-aware policies
* OPA's relationship with agents
* Why OPA **does not execute the banking action**
* How we could put OPA between an AI agent and its tools

That topic will bring **Agents + Governance + Guardrails + Risk + IAM** together into an actual policy-enforcement architecture.

---

## Sources

* Kubernetes Documentation — Using RBAC Authorization
* Kubernetes Documentation — Authorization Overview
* Kubernetes Documentation — Service Accounts
* Kubernetes Documentation — Namespaces
* Kubernetes Documentation — Role, ClusterRole, RoleBinding and ClusterRoleBinding
* Kubernetes Documentation — Good Practices for Kubernetes Secrets
* Kubernetes Documentation — RBAC Good Practices
