# 01 — System Architecture Diagram

## Purpose

This diagram provides the **high-level architecture** of the AI Agent Governance and Authorization Platform.

It should answer:

> How does an AI agent securely interact with protected enterprise/banking systems?

The main architectural idea is:

```text
AI Agent
   │
   │ proposes an action
   ▼
Governance Layer
   │
   │ authorizes the action
   ▼
Controlled Execution
   │
   ▼
Protected Enterprise Systems
```

---

# Diagram Layout

Use a **left-to-right architecture**.

```text
┌──────────────┐
│     USER     │
└──────┬───────┘
       │
       │ Request / Goal
       ▼
┌──────────────────────┐
│       AI AGENT       │
│                      │
│ Reasoning            │
│ Planning             │
│ Tool Selection       │
└──────────┬───────────┘
           │
           │ Action Request
           ▼
══════════════════════════════════════════════════════════════
                  GOVERNANCE BOUNDARY
══════════════════════════════════════════════════════════════

                 ┌─────────────────────┐
                 │ GOVERNANCE GATEWAY  │
                 │                     │
                 │ Policy Enforcement  │
                 │ Point (PEP)         │
                 └──────────┬──────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │      GOVERNANCE SERVICES        │
          │                                 │
          │  ┌───────────────────────────┐  │
          │  │ Authentication / Identity │  │
          │  └───────────────────────────┘  │
          │                                 │
          │  ┌───────────────────────────┐  │
          │  │ Agent Registry           │  │
          │  │ + Kill Switch            │  │
          │  └───────────────────────────┘  │
          │                                 │
          │  ┌───────────────────────────┐  │
          │  │ Permission Service       │  │
          │  │ + Permission Boundaries │  │
          │  └───────────────────────────┘  │
          │                                 │
          │  ┌───────────────────────────┐  │
          │  │ Risk Engine              │  │
          │  └───────────────────────────┘  │
          │                                 │
          │  ┌───────────────────────────┐  │
          │  │ Authorization Service    │  │
          │  └───────────────────────────┘  │
          │                                 │
          │  ┌───────────────────────────┐  │
          │  │ Approval Service         │  │
          │  │ Human-in-the-Loop       │  │
          │  └───────────────────────────┘  │
          │                                 │
          │  ┌───────────────────────────┐  │
          │  │ Tool Registry            │  │
          │  └───────────────────────────┘  │
          │                                 │
          │  ┌───────────────────────────┐  │
          │  │ Audit Service            │  │
          │  └───────────────────────────┘  │
          └───────────────┬─────────────────┘
                          │
                          │ Policy Evaluation
                          ▼
                  ┌───────────────────┐
                  │       OPA         │
                  │                   │
                  │ Policy Decision   │
                  │ Point (PDP)       │
                  │                   │
                  │ Rego Policies     │
                  └─────────┬─────────┘
                            │
                            │
              ALLOW / DENY / REQUIRE_APPROVAL
                            │
                            ▼
                  ┌───────────────────┐
                  │   TOOL EXECUTOR   │
                  │                   │
                  │ Controlled        │
                  │ Execution         │
                  └─────────┬─────────┘

══════════════════════════════════════════════════════════════
                   PROTECTED BOUNDARY
══════════════════════════════════════════════════════════════

                            │
                            ▼
             ┌────────────────────────────┐
             │ DEMO BANKING SERVICES     │
             │                            │
             │ Account Service            │
             │ Transaction Service        │
             │ Payment Service            │
             └─────────────┬──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ PostgreSQL   │
                    │              │
                    │ Governance   │
                    │ State        │
                    │ Audit Data   │
                    └──────────────┘
```

---

# Recommended Draw.io Structure

Organize the visual into **four major zones**.

## Zone 1 — Interaction Layer

Place on the far left:

```text
┌─────────────┐
│    User     │
└──────┬──────┘
       ▼
┌─────────────────┐
│    AI Agent     │
│                 │
│ Reason          │
│ Plan            │
│ Select Tool     │
└─────────────────┘
```

The AI Agent should visually sit **outside the trusted governance boundary**.

This communicates:

> The agent can request actions but cannot authorize itself.

---

# Zone 2 — Governance Layer

Make this the **largest section** of the diagram.

Use one large container:

```text
┌──────────────────────────────────────────────┐
│            GOVERNANCE PLATFORM               │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │         Governance Gateway             │  │
│  │      Policy Enforcement Point          │  │
│  └────────────────────┬───────────────────┘  │
│                       │                      │
│       ┌───────────────┼───────────────┐      │
│       │               │               │      │
│       ▼               ▼               ▼      │
│ ┌───────────┐  ┌────────────┐  ┌──────────┐ │
│ │ Identity  │  │ Permission │  │   Risk   │ │
│ │ / Agent   │  │ Service    │  │  Engine  │ │
│ │ Registry  │  │            │  │          │ │
│ └───────────┘  └────────────┘  └──────────┘ │
│                                              │
│       ┌───────────────┼───────────────┐      │
│       │               │               │      │
│       ▼               ▼               ▼      │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│ │Authorization│ │ Approval  │ │Tool Registry│ │
│ │ Service     │ │ Service   │ │             │ │
│ └──────┬──────┘ └───────────┘ └─────────────┘│
│        │                                     │
│        ▼                                     │
│ ┌─────────────────┐           ┌────────────┐ │
│ │       OPA       │           │   Audit    │ │
│ │                 │           │  Service   │ │
│ │ Policy Decision │           │            │ │
│ │ Point           │           └────────────┘ │
│ └─────────────────┘                          │
│                                              │
└──────────────────────────────────────────────┘
```

---

# Zone 3 — Execution Layer

Place immediately after governance.

```text
┌────────────────────────┐
│     TOOL EXECUTOR      │
│                        │
│ Controlled Execution   │
│                        │
│ Request Validation     │
│ Tool Mapping           │
│ Output Filtering       │
└───────────┬────────────┘
```

This component is important.

OPA does **not** execute banking operations.

OPA only returns a decision.

Therefore:

```text
OPA
 │
 │ Decision
 ▼
Governance Gateway
 │
 │ Enforces Decision
 ▼
Tool Executor
 │
 │ Executes
 ▼
Banking Service
```

Make this separation obvious in the diagram.

---

# Zone 4 — Protected Enterprise Layer

Put this on the far right.

Use a large container:

```text
┌─────────────────────────────────────┐
│       PROTECTED BANKING SYSTEM      │
│                                     │
│   ┌─────────────────────────────┐   │
│   │      Account Service        │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │    Transaction Service      │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │      Payment Service        │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

Agents should **not have a direct arrow** to this area.

The only execution path should be:

```text
AI Agent
   ↓
Governance
   ↓
Tool Executor
   ↓
Banking Services
```

---

# PostgreSQL Placement

Do not place PostgreSQL only under the banking system.

Our PostgreSQL database primarily represents **governance state**.

Place it below the Governance Platform:

```text
                    Governance Platform
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
       Services           OPA          PostgreSQL
                                         │
                              ┌──────────┼──────────┐
                              │          │          │
                            Agents  Permissions  Policies
                              │          │          │
                           Requests  Approvals    Audit
```

For the hackathon, the demo banking service may use the same PostgreSQL instance or a logically separate schema/database.

Architecturally, show them separately if possible:

```text
Governance PostgreSQL

Demo Banking Database
```

This makes the system boundaries clearer.

---

# Human Approver

The system architecture should also show the human-in-the-loop path.

Place:

```text
┌───────────────────┐
│  Human Approver   │
│                   │
│ Security / Ops    │
└─────────┬─────────┘
          │
          │ Approve / Reject
          ▼
┌───────────────────┐
│ Approval Service  │
└───────────────────┘
```

The Human Approver should **not communicate directly with the AI Agent** for authorization.

The trusted flow is:

```text
OPA / Policy
      │
      │ REQUIRE_APPROVAL
      ▼
Approval Service
      │
      ▼
Human Approver
      │
      │ APPROVE / REJECT
      ▼
Approval Service
      │
      ▼
Re-Authorization
```

The detailed loop belongs in the sequence diagram, so only show the high-level relationship here.

---

# Admin / Governance Dashboard

Add another actor:

```text
┌────────────────────┐
│ Security / Admin   │
└──────────┬─────────┘
           │
           ▼
┌─────────────────────────────┐
│ Governance Admin Dashboard  │
└──────────────┬──────────────┘
               │
               ▼
       Governance Platform
```

Admin capabilities include:

```text
Register Agent

Disable Agent

Manage Permissions

Manage Policies

Review Approvals

View Audit Logs
```

Do not connect the Admin Dashboard directly to PostgreSQL or OPA.

Use:

```text
Admin Dashboard
      ↓
Governance API
      ↓
Services
```

---

# Final Recommended Architecture

The complete diagram should approximately look like this:

```text
                                      ┌──────────────────┐
                                      │ Human Approver   │
                                      └────────┬─────────┘
                                               │
                                               ▼
                                         Approval Service
                                               ▲
                                               │

┌────────┐       ┌───────────────┐      ╔════════════════════════════════════════════════════╗
│  User  │──────▶│   AI Agent    │─────▶║              GOVERNANCE PLATFORM                  ║
└────────┘       │               │      ║                                                    ║
                 │ Reason        │      ║  ┌──────────────────────────────────────────────┐  ║
                 │ Plan          │      ║  │            Governance Gateway              │  ║
                 │ Select Tool   │      ║  │      Policy Enforcement Point (PEP)        │  ║
                 └───────────────┘      ║  └──────────────────────┬───────────────────────┘  ║
                                        ║                         │                          ║
                                        ║        ┌────────────────┼────────────────┐         ║
                                        ║        │                │                │         ║
                                        ║        ▼                ▼                ▼         ║
                                        ║   ┌─────────┐     ┌──────────┐     ┌──────────┐   ║
                                        ║   │Identity │     │Permission│     │   Risk   │   ║
                                        ║   │& Agent  │     │ Service  │     │  Engine  │   ║
                                        ║   │Registry │     │          │     │          │   ║
                                        ║   └─────────┘     └──────────┘     └──────────┘   ║
                                        ║                                                    ║
                                        ║               ┌──────────────────┐                 ║
                                        ║               │ Authorization    │                 ║
                                        ║               │ Service          │                 ║
                                        ║               └────────┬─────────┘                 ║
                                        ║                        │                           ║
                                        ║                        ▼                           ║
                                        ║                 ┌─────────────┐                    ║
                                        ║                 │     OPA     │                    ║
                                        ║                 │             │                    ║
                                        ║                 │     PDP     │                    ║
                                        ║                 └─────────────┘                    ║
                                        ║                                                    ║
                                        ║ ┌──────────┐ ┌─────────────┐ ┌────────────────┐   ║
                                        ║ │ Approval │ │Tool Registry│ │ Audit Service  │   ║
                                        ║ │ Service  │ │             │ │                │   ║
                                        ║ └──────────┘ └─────────────┘ └────────────────┘   ║
                                        ╚═══════════════════════╤════════════════════════════╝
                                                                │
                                                       ALLOW / Approved
                                                                │
                                                                ▼
                                                     ┌────────────────────┐
                                                     │   Tool Executor    │
                                                     │                    │
                                                     │ Validate           │
                                                     │ Execute            │
                                                     │ Filter Output      │
                                                     └──────────┬─────────┘
                                                                │
════════════════════════════════════════════════════════════════╪══════════════
                         PROTECTED BOUNDARY                     │
════════════════════════════════════════════════════════════════╪══════════════
                                                                ▼
                                                   ┌────────────────────────┐
                                                   │   BANKING SERVICES     │
                                                   │                        │
                                                   │ Account Service        │
                                                   │ Transaction Service    │
                                                   │ Payment Service        │
                                                   └────────────────────────┘


                    ┌─────────────────────┐
                    │ Governance DB       │
                    │ PostgreSQL          │
                    │                     │
                    │ Agents              │
                    │ Permissions         │
                    │ Policies            │
                    │ Requests            │
                    │ Approvals           │
                    │ Audit               │
                    └─────────────────────┘
                              ▲
                              │
                     Governance Services


┌──────────────────┐
│ Security / Admin │
└────────┬─────────┘
         ▼
┌─────────────────────────┐
│ Governance Dashboard    │
└────────────┬────────────┘
             │
             └──────────────▶ Governance Gateway
```

---

# Important Arrow Labels

Do not leave every arrow unlabeled.

Use meaningful labels where they clarify responsibility:

```text
User → AI Agent
"Goal / Prompt"

AI Agent → Governance Gateway
"Action Request"

Gateway → Authentication
"Verify Principal"

Gateway → Permission Service
"Check Capability"

Gateway → Risk Engine
"Assess Risk"

Authorization Service → OPA
"Evaluate Policy"

OPA → Authorization Service
"ALLOW / DENY / REQUIRE_APPROVAL"

Approval Service ↔ Human
"Approval Request / Decision"

Gateway → Tool Executor
"Authorized Action"

Tool Executor → Banking Service
"Controlled API Call"

Banking Service → Tool Executor
"Result"

Tool Executor → Agent
"Filtered Result"

Governance → Audit
"Security Events"
```

---

# Trust Boundaries

Show two major boundaries.

## Governance Boundary

The transition:

```text
AI Agent
   │
══════════════════
   ▼
Governance Gateway
```

This indicates:

> Agent input is untrusted until governance verifies it.

## Protected Banking Boundary

```text
Tool Executor
     │
══════════════════
     ▼
Banking Services
```

Only controlled infrastructure crosses this boundary.

---

# Critical Security Rule to Visualize

The diagram must make this impossible-looking:

```text
AI Agent ───────────────────────────────▶ Banking API
```

There should be **no such arrow**.

Instead:

```text
AI Agent
   │
   ▼
Governance Gateway
   │
   ▼
Authorization
   │
   ▼
Tool Executor
   │
   ▼
Banking API
```

This is one of the most important architectural decisions in the entire project.

---

# What NOT to Put in This Diagram

Do not add:

```text
Database table names/columns

Every REST endpoint

OPA Rego code

JWT structure

Request fingerprint algorithm

Idempotency implementation

Detailed approval states

Docker ports

Kubernetes objects

Detailed sequence numbers
```

Those belong in later diagrams.

---

# Suggested Draw.io Visual Convention

Use visually distinct containers for:

```text
External / Untrusted
AI Agent + User

Governance
Gateway + Governance Services + OPA

Execution
Tool Executor

Protected
Banking Services

Data
PostgreSQL

Human
Admin + Approver
```

Use:

* Rounded rectangles for services
* Cylinder shapes for databases
* Person icons for User/Admin/Approver
* Dashed lines for trust boundaries
* Solid arrows for runtime calls
* Dashed arrows for administrative/configuration interactions

Keep the diagram spacious rather than filling every available area.

---

# Diagram Title

Use:

**AI Agent Governance Platform — System Architecture**

Subtitle:

**Externalized authorization and controlled execution for autonomous AI agents**

---

# Key Message

Someone looking at this diagram for 10 seconds should understand:

```text
AI Agent
    │
    │ Wants to perform an action
    ▼
Governance Platform
    │
    ├── Who is the agent?
    ├── Is it active?
    ├── Does it have permission?
    ├── What is the risk?
    ├── What does policy say?
    └── Does a human need to approve?
    │
    ▼
ALLOW / DENY / REQUIRE APPROVAL
    │
    ▼
Controlled Tool Execution
    │
    ▼
Protected Banking System
    │
    ▼
Audit Everything
```

The architectural message is:

> **The AI agent proposes. Governance decides. The controlled execution layer acts.**
