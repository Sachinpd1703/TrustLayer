# 02 — Component Diagram

## Purpose

This diagram explains the internal structure of the **AI Agent Governance Platform**.

The system architecture showed:

```text
AI Agent
   ↓
Governance Platform
   ↓
Tool Executor
   ↓
Banking Services
```

The component diagram now expands:

```text
Governance Platform
```

into its internal modules and their relationships.

The diagram should answer:

> What components make up the governance platform, and how do they work together to authorize and execute an agent action?

---

# 1. Recommended Layout

Use a **left-to-right flow**, with supporting components above/below the main authorization path.

```text
AI Agent
   │
   ▼
Governance Gateway
   │
   ▼
Authentication
   │
   ▼
Agent Registry
   │
   ▼
Permission Service
   │
   ▼
Risk Engine
   │
   ▼
Authorization Service
   │
   ▼
OPA
   │
   ▼
ALLOW / DENY / REQUIRE_APPROVAL
   │
   ├───────────────┐
   │               │
   ▼               ▼
Tool Executor   Approval Service
   │               │
   ▼               ▼
Banking API     Human Approver
```

This is conceptual. In implementation, some checks may be orchestrated rather than literally chained as separate network calls.

---

# 2. Main Container

Create one large container:

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              AI AGENT GOVERNANCE PLATFORM                   │
│                                                             │
│                                                             │
│                 Internal Components                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Inside it place the major components.

---

# 3. Governance Gateway

Place this at the far left inside the platform.

```text
┌──────────────────────────┐
│   GOVERNANCE GATEWAY     │
│                          │
│ Policy Enforcement Point │
│          (PEP)           │
└──────────────────────────┘
```

Responsibilities:

```text
Receive agent action requests

Authenticate requests

Validate request format

Coordinate governance checks

Enforce authorization decisions

Trigger controlled execution

Return sanitized results
```

This is the main entry point for runtime agent actions.

External connection:

```text
AI Agent
    │
    │ Action Request
    ▼
Governance Gateway
```

---

# 4. Authentication Component

Connect the Gateway to:

```text
┌─────────────────────────┐
│     AUTHENTICATION      │
│                         │
│ Verify Credentials      │
│ Resolve Principal       │
└─────────────────────────┘
```

Flow:

```text
Agent Credential
      ↓
Authentication
      ↓
Verified Principal
```

Example output:

```text
Principal Type: AGENT
Principal ID: AGT-002
Authenticated: true
```

Important:

The request body does not establish the trusted agent identity.

```text
agentId = "AGT-002"
```

is only data unless verified through authentication.

---

# 5. Agent Registry

Add:

```text
┌─────────────────────────┐
│      AGENT REGISTRY     │
│                         │
│ Agent Metadata          │
│ Agent Status            │
│ Kill Switch             │
└─────────────────────────┘
```

Responsibilities:

```text
Register agents

Retrieve agent metadata

Check ACTIVE / DISABLED status

Disable compromised agents

Store agent ownership/purpose
```

Flow:

```text
Verified Agent
      ↓
Agent Registry
      ↓
ACTIVE?
```

If:

```text
DISABLED
```

then:

```text
DENY
```

before expensive authorization work continues.

---

# 6. Permission Service

Add:

```text
┌──────────────────────────┐
│    PERMISSION SERVICE    │
│                          │
│ Assigned Permissions     │
│ Permission Boundaries    │
│ Effective Permissions    │
└──────────────────────────┘
```

Responsibilities:

```text
Load agent permissions

Load permission boundary

Calculate effective permissions

Check requested capability
```

Concept:

```text
Assigned Permissions
        ∩
Permission Boundary
        =
Effective Permissions
```

Example:

```text
Agent:
SupportAgent

Assigned:
account.read
transaction.read
payment.execute

Boundary:
account.read
transaction.read

Effective:
account.read
transaction.read
```

Therefore:

```text
payment.execute
→ DENY
```

---

# 7. Risk Engine

Add:

```text
┌─────────────────────────┐
│       RISK ENGINE       │
│                         │
│ Context Analysis        │
│ Risk Classification     │
└─────────────────────────┘
```

Inputs may include:

```text
Agent

Action

Resource

Amount

Request frequency

Transaction characteristics

Historical context
```

MVP output:

```text
LOW

MEDIUM

HIGH
```

Example:

```text
payment.execute
amount = $10,000

        ↓

Risk Engine

        ↓

HIGH
```

The risk value is generated server-side.

The AI agent cannot authoritatively declare:

```text
risk = LOW
```

---

# 8. Authorization Service

Place this in the **center** of the diagram.

Make it visually prominent.

```text
┌────────────────────────────┐
│   AUTHORIZATION SERVICE    │
│                            │
│ Build Authorization Input  │
│ Call Policy Engine         │
│ Interpret Decision         │
└────────────────────────────┘
```

This component combines trusted context.

Input conceptually contains:

```text
Principal

Action

Resource

Permissions

Risk

Approval Context

Request Context
```

Example:

```json
{
  "principal": {
    "type": "AGENT",
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

It sends this information to the configured Policy Decision Point.

---

# 9. OPA Policy Engine

Connect Authorization Service to:

```text
┌────────────────────────────┐
│            OPA             │
│                            │
│ Policy Decision Point      │
│          (PDP)             │
│                            │
│ Rego Policies              │
└────────────────────────────┘
```

Flow:

```text
Authorization Service
        │
        │ Policy Input
        ▼
       OPA
        │
        │ Decision
        ▼
Authorization Service
```

OPA may return:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

Important label:

```text
OPA DECIDES
OPA DOES NOT EXECUTE
```

There should be **no arrow**:

```text
OPA ─────────▶ Banking Service
```

---

# 10. Approval Service

Add:

```text
┌────────────────────────────┐
│      APPROVAL SERVICE      │
│                            │
│ Create Approval Request    │
│ Track Approval State       │
│ Validate Approval          │
│ Expiration                 │
│ Request Binding            │
└────────────────────────────┘
```

Triggered when:

```text
OPA
 ↓
REQUIRE_APPROVAL
```

Flow:

```text
Authorization Service
        │
        │ REQUIRE_APPROVAL
        ▼
Approval Service
        │
        ▼
Human Approver
```

Human response:

```text
APPROVE
```

or:

```text
REJECT
```

---

# 11. Re-Authorization Path

This is important enough to show directly.

After human approval:

```text
Human Approver
      ↓
Approval Service
      ↓
Authorization Service
      ↓
OPA
```

Label this arrow:

```text
Re-Authorization
```

Do not draw:

```text
Human Approver
      ↓
Tool Executor
```

because approval does not directly execute an action.

Correct:

```text
Approval
   ↓
Re-Authorization
   ↓
ALLOW
   ↓
Execution
```

---

# 12. Request Integrity Component

Add a smaller supporting component:

```text
┌──────────────────────────┐
│    REQUEST INTEGRITY     │
│                          │
│ Canonicalization         │
│ Request Fingerprint      │
│ Integrity Verification   │
└──────────────────────────┘
```

Responsibilities:

```text
Canonicalize security-relevant request data

Generate fingerprint

Bind approvals to request

Detect request modification
```

Concept:

```text
Agent
+
Action
+
Resource
+
Parameters
      ↓
Canonicalization
      ↓
SHA-256
      ↓
Request Fingerprint
```

The fingerprint is used during authorization and approval validation.

---

# 13. Tool Registry

Add:

```text
┌────────────────────────────┐
│       TOOL REGISTRY        │
│                            │
│ Tool → Action Mapping      │
│ Tool Status                │
│ Input Schema               │
│ Target Service             │
└────────────────────────────┘
```

Example mapping:

```text
Tool:
execute_payment

        ↓

Canonical Action:
payment.execute

        ↓

Target:
Payment Service
```

This prevents agents from inventing authoritative action mappings.

Example:

```text
Agent requests:

super_admin_payment_override
```

Tool Registry:

```text
UNKNOWN TOOL
     ↓
DENY
```

---

# 14. Tool Executor

Place Tool Executor near the right edge.

```text
┌────────────────────────────┐
│       TOOL EXECUTOR        │
│                            │
│ Validate Tool              │
│ Validate Parameters        │
│ Verify Authorization       │
│ Execute API Call           │
│ Filter Result              │
└────────────────────────────┘
```

The Tool Executor only receives actions after governance authorization.

Correct path:

```text
Authorization
     ↓
ALLOW
     ↓
Tool Executor
```

Never:

```text
AI Agent
     ↓
Tool Executor
```

for protected actions.

---

# 15. Output Guardrail

You can either make this part of Tool Executor or show it separately.

For architectural clarity, show a small component:

```text
┌──────────────────────────┐
│     OUTPUT GUARDRAIL     │
│                          │
│ PII Filtering            │
│ Field Filtering          │
│ Sensitive Data Masking   │
└──────────────────────────┘
```

Flow:

```text
Banking Service
      ↓
Tool Executor
      ↓
Output Guardrail
      ↓
Governance Gateway
      ↓
AI Agent
```

Example:

Raw banking response:

```text
Customer Name
Balance
Account Number
Government ID
Internal Risk Score
Internal Fraud Notes
```

Agent may receive only:

```text
Customer Name
Balance
Masked Account Number
```

---

# 16. Audit Service

Place this along the bottom because almost every component interacts with it.

```text
┌───────────────────────────────────────────┐
│               AUDIT SERVICE               │
│                                           │
│ Security Events                           │
│ Authorization Decisions                   │
│ Approval Events                           │
│ Execution Results                         │
└───────────────────────────────────────────┘
```

Components producing audit events:

```text
Governance Gateway
Authentication
Agent Registry
Permission Service
Risk Engine
Authorization Service
Approval Service
Tool Executor
Admin Services
```

Avoid drawing eight crossing arrows if it makes the diagram unreadable.

Instead use a logical event line:

```text
Governance Components
        │
        │ Security Events
        ▼
Audit Service
```

---

# 17. Governance Database

Place below the internal services.

Use a database cylinder:

```text
        ┌─────────────────────┐
       /                       \
      │      PostgreSQL         │
      │                         │
      │ Governance State        │
      │                         │
      │ Agents                  │
      │ Permissions             │
      │ Boundaries              │
      │ Policies                │
      │ Requests                │
      │ Approvals               │
      │ Tools                   │
      │ Audit Events            │
       \                       /
        └─────────────────────┘
```

Connect relevant services to PostgreSQL.

Conceptually:

```text
Agent Registry ──────────┐
Permission Service ──────┤
Approval Service ────────┤
Tool Registry ───────────┼──▶ PostgreSQL
Audit Service ───────────┤
Authorization Service ───┘
```

---

# 18. Policy Management Component

Because policies are a first-class part of the platform, add:

```text
┌──────────────────────────┐
│    POLICY MANAGEMENT     │
│                          │
│ Create Policy            │
│ Validate Policy          │
│ Version Policy           │
│ Activate / Rollback      │
└──────────────────────────┘
```

This is an **administrative component**, not part of every runtime authorization request.

Flow:

```text
Security Admin
      ↓
Policy Management
      ├────────▶ PostgreSQL
      │          Policy Metadata
      │
      └────────▶ OPA
                 Rego Policy
```

---

# 19. Admin Service

Add:

```text
┌──────────────────────────┐
│      ADMIN SERVICE       │
│                          │
│ Manage Agents            │
│ Manage Permissions       │
│ Disable Agents           │
│ Manage Tools             │
│ Review Governance State  │
└──────────────────────────┘
```

External actor:

```text
Security Admin
      ↓
Admin Dashboard
      ↓
Admin Service
```

The Admin Dashboard must not directly manipulate PostgreSQL.

---

# 20. External Components

Outside the Governance Platform container, show four major external actors/systems.

### AI Agent

```text
┌────────────────┐
│    AI Agent    │
└───────┬────────┘
        │
        ▼
Governance Gateway
```

### Human Approver

```text
Approval Service
      │
      ▼
┌──────────────────┐
│ Human Approver   │
└──────────────────┘
```

### Security Admin

```text
┌──────────────────┐
│ Security Admin   │
└────────┬─────────┘
         ▼
Admin Service
```

### Banking Services

```text
Tool Executor
      │
      ▼
┌──────────────────────────┐
│ Protected Banking APIs   │
│                          │
│ Account Service          │
│ Transaction Service      │
│ Payment Service          │
└──────────────────────────┘
```

---

# 21. Recommended Complete Diagram

Build approximately this structure:

```text
                                AI AGENT
                                   │
                                   │ Action Request
                                   ▼

╔══════════════════════════════════════════════════════════════════════════════╗
║                      AI AGENT GOVERNANCE PLATFORM                           ║
║                                                                              ║
║ ┌────────────────────┐                                                       ║
║ │ Governance Gateway │                                                       ║
║ │       (PEP)        │                                                       ║
║ └─────────┬──────────┘                                                       ║
║           │                                                                  ║
║           ▼                                                                  ║
║ ┌────────────────────┐        ┌─────────────────────┐                         ║
║ │ Authentication     │───────▶│ Agent Registry      │                         ║
║ └─────────┬──────────┘        │ + Kill Switch       │                         ║
║           │                   └─────────────────────┘                         ║
║           ▼                                                                  ║
║ ┌────────────────────┐                                                       ║
║ │ Permission Service │                                                       ║
║ │ + Boundaries       │                                                       ║
║ └─────────┬──────────┘                                                       ║
║           │                                                                  ║
║           ▼                                                                  ║
║ ┌────────────────────┐                                                       ║
║ │    Risk Engine     │                                                       ║
║ └─────────┬──────────┘                                                       ║
║           │                                                                  ║
║           ▼                                                                  ║
║ ┌─────────────────────────┐        Policy Input        ┌───────────────────┐ ║
║ │ Authorization Service   │───────────────────────────▶│        OPA        │ ║
║ │                         │◀───────────────────────────│       (PDP)       │ ║
║ └────────────┬────────────┘        Decision            └───────────────────┘ ║
║              │                                                               ║
║              │                                                               ║
║      ┌───────┴─────────────────┐                                             ║
║      │                         │                                             ║
║      │ ALLOW                   │ REQUIRE_APPROVAL                            ║
║      ▼                         ▼                                             ║
║ ┌──────────────┐       ┌─────────────────────┐                               ║
║ │Tool Registry │       │  Approval Service   │◀────────▶ HUMAN APPROVER      ║
║ └──────┬───────┘       └──────────┬──────────┘                               ║
║        │                          │                                          ║
║        │                          │ Re-Authorization                         ║
║        │                          └──────────────▶ Authorization Service      ║
║        ▼                                                                     ║
║ ┌──────────────────┐                                                         ║
║ │  Tool Executor   │                                                         ║
║ └────────┬─────────┘                                                         ║
║          │                                                                   ║
║          │                                  ┌─────────────────────────┐      ║
║          │                                  │   Request Integrity     │      ║
║          │                                  │ Fingerprint / Binding   │      ║
║          │                                  └─────────────────────────┘      ║
║          │                                                                   ║
║          │                                  ┌─────────────────────────┐      ║
║          │                                  │      Audit Service      │      ║
║          │                                  └────────────┬────────────┘      ║
║          │                                               │                   ║
║          │                                  ┌────────────▼────────────┐      ║
║          │                                  │      PostgreSQL         │      ║
║          │                                  │   Governance State      │      ║
║          │                                  └─────────────────────────┘      ║
║                                                                              ║
║ ┌──────────────────────┐             ┌────────────────────────┐              ║
║ │    Admin Service     │             │   Policy Management    │──────▶ OPA   ║
║ └──────────┬───────────┘             └────────────────────────┘              ║
║            ▲                                                                 ║
╚════════════╪══════════════════════════════════════════════════════════════════╝
             │
       SECURITY ADMIN


                 Authorized Action
                       │
                       ▼
              ┌──────────────────┐
              │ Protected        │
              │ Banking APIs     │
              │                  │
              │ Account          │
              │ Transaction      │
              │ Payment          │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Tool Executor    │
              │ Result Handling  │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Output Guardrail │
              └────────┬─────────┘
                       │
                       ▼
                   AI Agent
```

---

# 22. Simplify the Runtime Path Visually

Although there are many components, visually emphasize this main path:

```text
Agent
  ↓
Gateway
  ↓
Identity
  ↓
Permission
  ↓
Risk
  ↓
Authorization
  ↕
 OPA
  ↓
Decision
  ↓
Tool Executor
  ↓
Banking API
```

Everything else should look like supporting infrastructure.

---

# 23. Decision Branch

Near Authorization Service, clearly show:

```text
                        OPA Decision
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
            ALLOW          DENY      REQUIRE_APPROVAL
              │              │              │
              ▼              ▼              ▼
         Tool Executor     STOP      Approval Service
                                            │
                                            ▼
                                         Human
                                            │
                                            ▼
                                      Re-Authorize
```

This is one of the most important pieces of the diagram.

---

# 24. DENY Path

Do not forget `DENY`.

Many architecture diagrams only show successful flows.

Show:

```text
OPA
 │
 ▼
DENY
 │
 ├──▶ Audit Service
 │
 └──▶ Gateway
          │
          ▼
       AI Agent

       No Execution
```

There must be no connection from `DENY` to Tool Executor.

---

# 25. Audit Relationship

Show that all important outcomes reach Audit Service:

```text
ALLOW ───────────────┐
DENY ────────────────┤
REQUIRE_APPROVAL ────┤
APPROVED ────────────┤──▶ Audit Service
REJECTED ────────────┤
EXECUTION_SUCCESS ───┤
EXECUTION_FAILURE ───┘
```

You don't need seven separate arrows in draw.io.

A label such as:

```text
Governance & Execution Events
```

is enough.

---

# 26. Data Ownership

If you want slightly more architectural depth, label database relationships.

```text
Agent Registry
      ↓
Agents


Permission Service
      ↓
Permissions
Boundaries


Approval Service
      ↓
Approval Requests


Tool Registry
      ↓
Tool Definitions


Audit Service
      ↓
Audit Events


Policy Management
      ↓
Policy Metadata
Policy Versions
```

Do not show actual table columns here.

That belongs in:

```text
05-er-diagram.drawio
```

---

# 27. Runtime vs Administrative Components

Visually separate these inside the Governance Platform.

### Runtime Governance

```text
Governance Gateway

Authentication

Agent Registry

Permission Service

Risk Engine

Authorization Service

OPA

Approval Service

Request Integrity

Tool Registry

Tool Executor

Output Guardrail

Audit Service
```

### Governance Administration

```text
Admin Service

Policy Management
```

A dashed divider can separate:

```text
RUNTIME PLANE
```

from:

```text
ADMIN / CONTROL PLANE
```

This will make the diagram look much more mature.

---

# 28. Control Plane

The control plane changes governance configuration.

```text
Security Admin
      │
      ▼
Admin Dashboard
      │
      ▼
Admin Service
      │
      ├── Agent Registry
      ├── Permissions
      ├── Tool Registry
      └── Policy Management
```

---

# 29. Runtime Plane

The runtime plane evaluates actions.

```text
AI Agent
    │
    ▼
Gateway
    │
    ▼
Authentication
    │
    ▼
Permission
    │
    ▼
Risk
    │
    ▼
Authorization
    │
    ▼
OPA
    │
    ▼
Decision
    │
    ▼
Execution
```

This separation is useful because:

> Administrators configure authority; agents exercise authority.

---

# 30. Draw.io Visual Convention

Use different visual categories consistently.

### Actors

Person icons:

```text
AI Agent
Human Approver
Security Admin
```

### Application Components

Rounded rectangles:

```text
Gateway
Authentication
Permission Service
Risk Engine
Authorization Service
Approval Service
Tool Executor
```

### External Infrastructure

Distinct containers:

```text
OPA

Protected Banking APIs
```

### Data

Cylinder:

```text
PostgreSQL
```

### Boundaries

Dashed containers:

```text
Governance Platform

Runtime Plane

Control Plane

Protected Banking Boundary
```

---

# 31. Arrow Types

Use **solid arrows** for runtime calls.

Example:

```text
Authorization Service ─────▶ OPA
```

Use **dashed arrows** for administrative/configuration flows.

Example:

```text
Policy Management - - - - ▶ OPA
```

Use arrow labels for important semantics.

Examples:

```text
Policy Input

Policy Decision

Action Request

Authorized Execution

Approval Decision

Security Event

Filtered Result
```

---

# 32. Important Relationships

At minimum, the final `.drawio` should contain these connections:

```text
AI Agent
→ Governance Gateway

Governance Gateway
→ Authentication

Authentication
→ Agent Registry

Governance Gateway
→ Permission Service

Governance Gateway
→ Risk Engine

Governance Gateway
→ Authorization Service

Authorization Service
↔ OPA

Authorization Service
→ Approval Service

Approval Service
↔ Human Approver

Approval Service
→ Authorization Service

Authorization Service
→ Tool Registry

Tool Registry
→ Tool Executor

Tool Executor
→ Banking APIs

Banking APIs
→ Tool Executor

Tool Executor
→ Output Guardrail

Output Guardrail
→ Governance Gateway

Governance Gateway
→ AI Agent

Governance Components
→ Audit Service

Governance Services
→ PostgreSQL

Security Admin
→ Admin Service

Admin Service
→ Agent Registry

Admin Service
→ Permission Service

Admin Service
→ Tool Registry

Policy Management
→ OPA
```

---

# 33. Relationships That Must NOT Exist

Do not draw:

```text
AI Agent
────────▶ Banking API
```

Do not draw:

```text
AI Agent
────────▶ OPA
```

Do not draw:

```text
AI Agent
────────▶ PostgreSQL
```

Do not draw:

```text
Human Approver
────────▶ Tool Executor
```

Do not draw:

```text
OPA
────────▶ Banking API
```

Do not draw:

```text
Admin Dashboard
────────▶ PostgreSQL
```

Those paths would violate the architecture.

---

# 34. Diagram Title

Use:

**AI Agent Governance Platform — Component Architecture**

Subtitle:

**Runtime authorization, policy evaluation, approval, controlled execution, and audit**

---

# 35. What This Diagram Should Communicate

A viewer should immediately understand:

```text
AI Agent
   │
   ▼
Governance Gateway
   │
   ├── Verify identity
   ├── Verify agent status
   ├── Check permissions
   ├── Calculate risk
   └── Evaluate policy
             │
             ▼
            OPA
             │
      ┌──────┼───────────┐
      ▼      ▼           ▼
    ALLOW   DENY   REQUIRE_APPROVAL
      │                   │
      │                   ▼
      │                 Human
      │                   │
      │              Re-authorize
      │                   │
      └──────────┬────────┘
                 ▼
           Tool Executor
                 │
                 ▼
          Banking Service
                 │
                 ▼
          Output Guardrail
                 │
                 ▼
              Agent

Everything
    ↓
Audit
```

---

# 36. Key Message

The component diagram should reinforce four responsibilities:

```text
AI Agent
→ proposes

OPA
→ decides policy

Governance Gateway
→ enforces

Tool Executor
→ executes
```

And:

```text
Audit Service
→ records
```

Therefore:

> **Agents propose actions, policies determine authority, the governance layer enforces decisions, and only the controlled executor can reach protected enterprise systems.**
