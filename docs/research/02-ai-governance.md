# AI Governance

## Overview

**AI governance** is the framework of policies, roles, responsibilities, processes, and controls used to manage how AI systems are created, approved, deployed, accessed, changed, monitored, and retired.

For AI agents, governance answers questions such as:

```text
Who created this agent?

Who owns it?

Why does it exist?

Who approved it?

What systems can it access?

What actions is it allowed to perform?

Who changed its permissions?

What has it done?

Who can disable it?

Who is accountable if something goes wrong?
```

A useful mental model is:

> **Governance = Accountability**

Governance does not mean simply preventing an AI agent from doing something.

It establishes **who has authority, who made decisions, what rules apply, and who is responsible throughout the agent's lifecycle**.

---

## Why It Exists

Consider a bank deploying hundreds of AI agents.

```text
Bank

├── Customer Support Agent
├── Account Agent
├── Payment Agent
├── Loan Agent
├── Fraud Agent
├── KYC Agent
├── Compliance Agent
└── Internal Employee Agent
```

Each agent may interact with different systems.

For example:

```text
Payment Agent
    │
    ├── Customer Service
    ├── Account Service
    ├── Transaction Service
    └── Payment Service
```

Simply knowing that these agents exist is not enough.

The organization must know:

```text
Agent: PaymentAgent

Owner: Digital Payments Team

Purpose:
Assist customers with payments

Risk Level:
High

Allowed Resources:
Account Service
Payment Service

Allowed Actions:
account.read
payment.prepare

Restricted Actions:
payment.execute
customer.delete

Status:
Production

Approved By:
Authorized reviewers
```

Without governance, an organization may lose visibility into which agents exist, why they exist, and what authority they have.

This becomes especially dangerous when agents can take actions rather than merely generate text.

---

## Core Concepts

### 1. Agent Identity

Every production agent should have a unique identity.

For example:

```text
Agent ID:
AGT-00291

Name:
PaymentAssistant

Version:
3.2

Environment:
Production
```

The identity should allow systems to distinguish:

```text
PaymentAgent
      ≠
LoanAgent
      ≠
SupportAgent
```

Without identity, authorization and accountability become difficult.

If a payment is initiated, the organization should be able to determine exactly which actor requested it.

---

### 2. Ownership

Every agent should have responsible owners.

Ownership might include:

```text
Business Owner

Technical Owner

Security Owner

Risk Owner
```

For example:

```text
Agent:
LoanAssistant

Business Owner:
Retail Lending

Technical Owner:
AI Platform Team
```

The developer who originally created the agent may eventually leave the organization.

Therefore:

> Agent ownership should belong to an organizational responsibility, not depend entirely on the original developer.

---

### 3. Purpose

Every agent should have a clearly defined purpose.

Example:

```text
Agent:
CustomerSupportAgent

Purpose:

Help authenticated customers understand
account and transaction issues.
```

A purpose helps determine what access is reasonable.

For example:

```text
CustomerSupportAgent

Needs:

customer.read        ✓
transactions.read    ✓
support_case.create  ✓

Probably does not need:

loan.approve         ✗
payment.execute      ✗
iam.admin            ✗
```

Purpose therefore helps establish the agent's authorization boundaries.

---

### 4. Access

Governance must define which resources an agent can access.

Imagine the bank has:

```text
Customer Service

Account Service

Payment Service

Loan Service

KYC Service

Fraud Service

Employee Service
```

A Payment Agent might receive:

```text
Customer Service     READ
Account Service      READ
Payment Service      LIMITED WRITE

Loan Service         NONE
Employee Service     NONE
```

This follows the security principle of:

> **Least privilege**

An agent should receive only the access required to perform its intended function.

---

### 5. Permissions

Access to a system does not necessarily mean permission to perform every operation.

For example:

```text
Payment Service

payment.read       ✓
payment.prepare    ✓
payment.execute    ?
payment.cancel     ✗
payment.admin      ✗
```

Governance should therefore define permissions at an appropriate level of granularity.

A useful authorization model is:

```text
WHO
 ↓
Principal

CAN DO WHAT
 ↓
Action

TO WHAT
 ↓
Resource

UNDER WHAT CONDITIONS
 ↓
Context / Policy
```

This model will become important later when studying IAM, OPA, and Cedar.

---

### 6. Approval

Creating an agent should not automatically mean that it can enter production.

A governance workflow might look like:

```text
Agent Created
      ↓
Development Testing
      ↓
Security Review
      ↓
Risk Review
      ↓
Compliance Review
      ↓
Business Approval
      ↓
Production Deployment
```

The exact workflow should depend on risk.

For example:

```text
Internal FAQ Agent
        ↓
LOW RISK
        ↓
Simpler approval
```

while:

```text
Payment Agent
        ↓
HIGH RISK
        ↓
Stronger review and approval
```

Governance should preserve evidence of these approvals.

---

### 7. Policies

Governance defines rules that agents must follow.

Example:

```text
POLICY

Customer Support Agents
may read customer transaction history
only when assisting the authenticated customer.
```

Another:

```text
POLICY

AI agents cannot independently execute
high-risk payments.
```

Policies define what **should be allowed**.

Later, systems such as policy engines and authorization services can enforce those policies.

This distinction is important:

```text
Governance
    ↓
Defines rules

Guardrails / Authorization
    ↓
Enforce rules
```

---

### 8. Change Management

Agents change over time.

Changes may include:

```text
Model changed

System prompt changed

Tools added

Tools removed

Permissions changed

Policies changed

Data access changed

Agent version changed
```

These changes can alter the risk profile of an agent.

For example:

```text
BEFORE

SupportAgent

transactions.read ✓
payment.execute   ✗
```

Someone changes:

```text
AFTER

transactions.read ✓
payment.execute   ✓
```

That is a significant governance event.

The organization should know:

```text
What changed?

Who requested it?

Who approved it?

Who implemented it?

When did it change?

Why was it changed?

What was the previous configuration?
```

---

### 9. Auditability

Governance requires the ability to reconstruct important decisions and actions.

Suppose:

```text
Payment Agent
      ↓
initiates payment
      ↓
customer complains
```

An investigation may need to determine:

```text
Which agent performed the action?

Which version was running?

What user initiated the workflow?

Which tool was called?

What resource was accessed?

What policy applied?

Was authorization granted?

Was human approval required?

Who approved it?

What was the final result?
```

This requires reliable audit information.

---

### 10. Monitoring

Governance is not finished after deployment.

Agents need continuous monitoring.

Organizations may monitor:

```text
Tool usage

Authorization failures

Policy violations

Unexpected actions

Error rates

Sensitive data access

High-risk transactions

Human escalations

Unusual behavior
```

For example:

```text
Normal:

PaymentAgent
→ 20 payment requests/day

Suddenly:

PaymentAgent
→ 3,000 requests/hour
```

This could indicate:

* software failure
* compromised credentials
* malicious activity
* runaway agent behavior

Monitoring allows organizations to respond.

---

### 11. Lifecycle Management

Agents should have managed lifecycles.

A simple lifecycle is:

```text
Proposed
   ↓
Development
   ↓
Testing
   ↓
Approved
   ↓
Active
   ↓
Suspended
   ↓
Retired
```

An organization needs to know the current status of every agent.

For example:

```text
Agent:
AGT-219

Status:
SUSPENDED

Previous Status:
ACTIVE

Suspended By:
Security Operations

Reason:
Unexpected tool activity

Timestamp:
2026-07-27 13:42
```

Agents should also have a reliable **kill switch** or disable mechanism for incidents.

---

## Governance Questions

A useful governance framework can be built around several fundamental questions.

### Who Created the Agent?

The system should maintain creation provenance.

```text
Agent:
AGT-1002

Created By:
Developer-271

Created At:
2026-07-20

Initial Version:
1.0
```

This provides historical traceability.

---

### Who Owns the Agent?

Creation and ownership are different.

```text
Created By:
Developer A

Owned By:
Payments Platform Team
```

The owner remains responsible for maintaining the agent.

---

### What Can It Access?

Example:

```text
PaymentAgent

Account API        ✓
Transaction API    ✓
Payment API        ✓

Loan API           ✗
Employee API       ✗
IAM Admin API      ✗
```

---

### What Is It Allowed to Do?

Even within an accessible service, individual actions may differ.

```text
PaymentAgent

account.read          ✓
payment.prepare       ✓
payment.execute       CONDITIONAL
payment.cancel        ✗
permission.modify     ✗
```

---

### Who Approved It?

Governance should capture deployment and permission approvals.

```text
Production Deployment

Requested By:
AI Platform Team

Security:
APPROVED

Risk:
APPROVED

Business:
APPROVED

Status:
AUTHORIZED FOR PRODUCTION
```

---

### Who Changed Permissions?

Consider:

```text
Permission:

payment.execute

OLD:
DENY

NEW:
ALLOW
```

The system should preserve:

```text
Changed By

Approved By

Timestamp

Reason

Previous Value

New Value
```

Without this information, an organization may know that an agent has a dangerous permission without knowing why it received it.

---

### Who Disabled the Agent?

Disabling an agent is also a governance event.

```text
Agent:
PaymentAgent

Action:
DISABLE

Performed By:
SecurityAdmin

Reason:
Suspected compromise

Time:
14:35
```

This should become part of the permanent lifecycle history.

---

## Agent Registry

An important concept for governing many agents is an **Agent Registry**.

Think of it as the organization's inventory of AI agents.

```text
                    Agent Registry

                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼

   Identity           Ownership          Lifecycle

       │                  │                  │
       ▼                  ▼                  ▼

   Permissions         Risk Level          Status
```

A registry could store:

```text
Agent ID

Name

Description

Purpose

Version

Environment

Model

Business Owner

Technical Owner

Risk Classification

Tools

Permissions

Data Access

Policies

Created By

Approved By

Status

Created At

Updated At
```

Example:

```text
Agent ID:
AGT-00192

Name:
PaymentAssistant

Purpose:
Assist customers with payment workflows

Owner:
Digital Payments

Risk:
HIGH

Tools:
AccountService
PaymentService

Permissions:
account.read
payment.prepare

Status:
ACTIVE
```

This enables questions such as:

> Show every production agent capable of accessing the Payment Service.

or:

> Which agents can access customer transaction data?

An agent registry therefore provides visibility before authorization controls are even evaluated.

---

## Governance vs Security

Governance and security overlap but are not identical.

### Security

Security asks:

> How do we protect the system?

Examples:

```text
Authentication

Encryption

Network Security

Secrets Management

API Security

Threat Detection
```

### Governance

Governance asks:

> Who should have authority, who approved it, and who is accountable?

Examples:

```text
Agent Ownership

Permission Approval

Risk Classification

Policy Ownership

Lifecycle Management

Audit History
```

A system can have strong technical security but weak governance.

For example:

```text
Payment API

✓ encrypted
✓ authenticated
✓ secure network

BUT

Nobody knows why Agent A
has payment.execute permission.
```

That's still a governance problem.

---

## Governance vs Guardrails

These concepts are also closely related.

Governance might establish:

> Payments above $10,000 initiated through an AI workflow require human approval.

The guardrail implements that rule:

```text
Agent
  ↓
Proposes $15,000 payment
  ↓
Policy / Guardrail
  ↓
Human Approval Required
  ↓
No execution until approved
```

Therefore:

```text
GOVERNANCE

"What rules should exist,
who owns them,
and who is accountable?"

          ↓

GUARDRAILS

"Enforce those rules
during operation."
```

The next research topic focuses specifically on these guardrails.

---

## Governance vs Authorization

Authorization is one part of governance.

Authorization answers:

> Is this principal allowed to perform this action on this resource?

For example:

```text
Principal:
PaymentAgent

Action:
read

Resource:
Account-928

        ↓

ALLOW / DENY
```

Governance is broader.

It asks:

```text
Why does PaymentAgent have this permission?

Who approved it?

Which policy grants it?

When was it granted?

When should it expire?

Who owns the agent?

What risk classification does it have?

Can the permission be revoked?
```

Therefore:

> **Authorization makes an access decision. Governance establishes accountability around why that authority exists.**

---

## Real-World Example

Consider a bank deploying an AI **Payment Assistant**.

### Step 1 — Registration

Before production:

```text
Agent ID:
AGT-5001

Name:
PaymentAssistant

Owner:
Digital Payments

Purpose:
Assist authenticated customers with payments

Risk:
HIGH
```

---

### Step 2 — Tool Registration

The agent receives:

```text
getAccount()        ✓

getBeneficiary()    ✓

preparePayment()    ✓

executePayment()    CONDITIONAL
```

---

### Step 3 — Approval

Because payment execution is sensitive:

```text
Business Approval
        ↓
Security Approval
        ↓
Risk Approval
        ↓
Production Approval
```

---

### Step 4 — Runtime

Customer says:

> Send $2,000 to John.

The system records:

```text
User:
Customer-928

Agent:
AGT-5001

Requested Action:
payment.execute

Amount:
$2,000

Resource:
Account-392
```

The request goes through authorization and guardrails before execution.

---

### Step 5 — Audit

The system records:

```text
14:31:02
Payment request received

14:31:03
Agent AGT-5001 proposed payment.execute

14:31:03
Authorization evaluated

14:31:04
Additional authentication required

14:31:20
Authentication successful

14:31:21
Payment executed

14:31:22
Transaction ID recorded
```

---

### Step 6 — Incident

Later, abnormal behavior appears.

```text
AGT-5001

Normal:
~30 payment operations/hour

Current:
900 operations/hour
```

Security suspends the agent.

```text
Status:

ACTIVE
  ↓
SUSPENDED
```

Governance records:

```text
Who suspended it

When

Why

Which incident triggered it

Which permissions were active
```

The organization can now reconstruct the complete lifecycle.

That is AI governance in practice.

---

## Advantages

### Accountability

There is clear responsibility for AI systems and their actions.

### Visibility

Organizations know which agents exist and what they can access.

### Controlled Access

Permissions can be tied to purpose, ownership, and risk.

### Auditability

Important changes and actions can be reconstructed.

### Safer Scaling

Governance becomes increasingly valuable as the number of agents grows.

### Regulatory Support

Governance creates documentation, ownership, controls, and evidence useful for compliance processes.

### Incident Response

Agents and permissions can be identified, suspended, investigated, and revoked.

---

## Limitations

### Additional Complexity

Governance introduces:

```text
Registries
Policies
Approvals
Reviews
Audit systems
Monitoring
Lifecycle management
```

### Operational Overhead

Teams must maintain agent metadata, ownership, permissions, and reviews.

### Approval Bottlenecks

Poorly designed governance can slow development and deployment.

### Policy Complexity

Large organizations may accumulate many overlapping policies.

### Ownership Problems

Agents that cross multiple business areas can have unclear ownership.

### Governance Does Not Automatically Enforce Rules

Writing:

> PaymentAgent cannot execute high-risk payments.

does not automatically prevent execution.

Technical controls must enforce that policy.

This is why governance must work together with:

```text
Authorization
Guardrails
Policy Engines
Monitoring
Risk Management
```

---

## Key Takeaways

1. **AI governance is the framework used to establish accountability and control over AI systems.**

2. A useful mental model is:

> **Governance = Accountability**

3. Every agent should have a clear **identity, purpose, owner, permissions, risk classification, and lifecycle state**.

4. Creating an agent should not automatically authorize production deployment.

5. Agent permissions and important configuration changes should be approved and auditable.

6. Organizations need to know not only **what an agent can do**, but **why it can do it and who authorized that authority**.

7. An **Agent Registry** can provide a central inventory of agents, ownership, tools, permissions, risk, and lifecycle information.

8. Governance is broader than security and authorization.

9. **Governance defines responsibility and rules; technical systems must enforce those rules.**

10. As agents gain more autonomy and access to enterprise systems, governance becomes increasingly important.

---

## How We'll Use This in Our Project

Our project should treat every AI agent as a governed identity.

Instead of:

```text
Agent
 ↓
Tool
 ↓
System
```

we should think in terms of:

```text
                     Governance Layer

                           │
                    Agent Registry
                           │
                  Ownership / Risk
                           │
                     Permissions
                           │
                       Policies
                           │
                           ▼

User → Agent → Authorization → Tool → Resource
                           │
                           ▼
                     Audit / Logs
```

At minimum, our architecture should be capable of representing:

```text
Agent Identity

Agent Owner

Agent Purpose

Agent Status

Agent Risk Level

Available Tools

Permissions

Policies

Approval History

Permission Changes

Audit History
```

This gives us the foundation for answering:

```text
WHO is the agent?

WHO owns it?

WHAT can it access?

WHAT can it do?

WHO approved that?

WHY was it allowed?

WHO changed it?

WHAT has it done?

WHO can stop it?
```

However, governance alone does not stop unsafe behavior.

If governance says:

> PaymentAgent cannot execute payments above $10,000 without approval.

we still need a runtime mechanism that actually **detects and blocks** the operation.

That leads directly to:

**`03-ai-guardrails.md`**

---

## Sources

* [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework?utm_source=chatgpt.com) — Framework for governing and managing risks associated with AI systems.

* [NIST AI RMF Playbook](https://airc.nist.gov/airmf-resources/playbook/?utm_source=chatgpt.com) — Practical guidance organized around Govern, Map, Measure, and Manage.

* [OECD AI Principles](https://oecd.ai/en/ai-principles?utm_source=chatgpt.com) — International principles covering accountability, transparency, robustness, and responsible AI.

* [ISO/IEC 42001 overview](https://www.iso.org/standard/81230.html?utm_source=chatgpt.com) — International AI management-system standard covering organizational processes for responsible AI management.
