# 04 — Deployment Diagram

## Purpose

This diagram maps the logical architecture to the actual deployment infrastructure.

It answers:

> Where does each component run, how do services communicate, and which services are exposed or protected?

The deployment architecture should enforce the same principle as the logical architecture:

```text
AI Agent
   ↓
Governance API
   ↓
Authorization
   ↓
Tool Executor
   ↓
Protected Banking API
```

There must be no direct:

```text
AI Agent ─────────▶ Banking API
```

---

# 1. Hackathon Deployment Strategy

For the hackathon MVP, use a containerized architecture.

```text
Developer Machine / Cloud VM
│
└── Docker Compose
    │
    ├── Frontend
    ├── Governance Backend
    ├── OPA
    ├── PostgreSQL
    └── Demo Banking Service
```

This keeps deployment simple while preserving proper architectural boundaries.

Later, the same services can be deployed to Kubernetes without significantly changing the logical architecture.

---

# 2. High-Level Deployment

Build the draw.io diagram approximately like this:

```text
                        INTERNET / EXTERNAL

             ┌────────────────────────────┐
             │       Browser / User       │
             └─────────────┬──────────────┘
                           │ HTTPS
                           ▼

══════════════════════════════════════════════════════════════════
                       APPLICATION HOST
══════════════════════════════════════════════════════════════════

                    ┌───────────────────┐
                    │     Frontend      │
                    │                   │
                    │ Governance UI     │
                    │ Admin Dashboard   │
                    │ Approval UI       │
                    └─────────┬─────────┘
                              │
                              │ HTTPS / REST
                              ▼

                    ┌──────────────────────┐
                    │ Governance Backend   │
                    │                      │
                    │ Governance Gateway   │
                    │ Authentication       │
                    │ Agent Registry       │
                    │ Permission Service   │
                    │ Risk Engine          │
                    │ Authorization        │
                    │ Approval Service     │
                    │ Tool Registry        │
                    │ Tool Executor        │
                    │ Audit Service        │
                    └───────┬───────┬──────┘
                            │       │
                 Policy     │       │ SQL
                 Evaluation │       │
                            ▼       ▼
                    ┌───────────┐ ┌────────────┐
                    │    OPA    │ │ PostgreSQL │
                    │           │ │            │
                    │ Rego      │ │ Governance │
                    │ Policies  │ │ State      │
                    └───────────┘ └────────────┘

                            │
                            │ Authorized Internal Call
                            ▼

══════════════════════════════════════════════════════════════════
                     PROTECTED NETWORK
══════════════════════════════════════════════════════════════════

                    ┌──────────────────────┐
                    │ Demo Banking Service │
                    │                      │
                    │ Account API          │
                    │ Transaction API      │
                    │ Payment API          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Banking Database     │
                    └──────────────────────┘
```

---

# 3. External Actors

Show three external actors.

## User / Security Admin

```text
┌──────────────────────┐
│ Security Admin       │
│ Governance Operator  │
└──────────┬───────────┘
           │
           ▼
       Browser
```

They use the dashboard to:

```text
Register agents
Manage permissions
Disable agents
Manage policies
Review approvals
Inspect audit logs
```

---

# 4. Human Approver

Show:

```text
┌──────────────────┐
│ Human Approver   │
└────────┬─────────┘
         │ HTTPS
         ▼
      Frontend
         │
         ▼
Governance Backend
```

The approver does not connect directly to the Tool Executor.

---

# 5. AI Agent

Show the AI Agent separately:

```text
┌─────────────────────────┐
│       AI Agent          │
│                         │
│ LLM + Reasoning         │
│ Tool Calling            │
└───────────┬─────────────┘
            │
            │ HTTPS
            ▼
   Governance Backend
```

Label the connection:

```text
Governed Action Request
```

Important:

The agent interacts with the **Governance Gateway**, not directly with protected enterprise services.

---

# 6. Frontend Container

Inside the application deployment:

```text
┌──────────────────────────────┐
│       Frontend Container     │
│                              │
│ Governance Dashboard         │
│ Agent Management             │
│ Permission Management        │
│ Policy Management            │
│ Approval Queue               │
│ Audit Viewer                 │
└──────────────┬───────────────┘
```

Example technology:

```text
Next.js / React
```

The exact framework is less important than the boundary.

The frontend should communicate only with:

```text
Governance Backend API
```

It should not directly connect to:

```text
PostgreSQL
OPA
Banking Database
```

---

# 7. Governance Backend Container

This should be the largest deployment component.

```text
┌─────────────────────────────────┐
│   Governance Backend Container  │
│                                 │
│ Governance Gateway              │
│ Authentication                  │
│ Agent Registry                  │
│ Permission Service              │
│ Risk Engine                     │
│ Authorization Service           │
│ Approval Service                │
│ Tool Registry                   │
│ Tool Executor                   │
│ Audit Service                   │
│ Admin APIs                      │
└─────────────────────────────────┘
```

For the hackathon, these can be modules inside **one backend application**.

Do not create a microservice for every logical component.

Logical:

```text
Permission Service
Risk Engine
Approval Service
Audit Service
```

does not necessarily mean:

```text
4 independent containers
```

For an MVP, a **modular monolith** is much simpler.

---

# 8. Recommended MVP Backend

Use:

```text
Governance Backend
│
├── auth/
├── agents/
├── permissions/
├── policies/
├── authorization/
├── risk/
├── approvals/
├── tools/
├── execution/
└── audit/
```

One deployment:

```text
governance-backend
```

This gives modularity without unnecessary distributed-system complexity.

---

# 9. OPA Container

Deploy OPA separately.

```text
┌────────────────────────────┐
│       OPA Container        │
│                            │
│ Open Policy Agent          │
│                            │
│ Rego Policies              │
│ Policy Evaluation          │
└──────────────┬─────────────┘
```

Only trusted backend services should communicate with OPA.

Correct:

```text
Governance Backend
       │
       │ Internal HTTP
       ▼
      OPA
```

Incorrect:

```text
AI Agent ─────────▶ OPA
```

and:

```text
Browser ──────────▶ OPA
```

OPA should not be publicly exposed.

---

# 10. OPA Communication

Label:

```text
Governance Backend
        │
        │ Policy Input
        ▼
       OPA
        │
        │ Decision
        ▼
Governance Backend
```

Possible decision:

```text
ALLOW
DENY
REQUIRE_APPROVAL
```

Again:

```text
OPA
≠
Execution Engine
```

---

# 11. PostgreSQL Container

Deploy governance state in PostgreSQL.

```text
┌─────────────────────────────┐
│     PostgreSQL Container    │
│                             │
│ Governance Database         │
│                             │
│ Agents                      │
│ Permissions                 │
│ Permission Boundaries       │
│ Policies                    │
│ Approval Requests           │
│ Tool Definitions            │
│ Action Requests             │
│ Audit Events                │
└─────────────────────────────┘
```

Only the Governance Backend should directly access this database.

Correct:

```text
Governance Backend
        │
        │ SQL
        ▼
PostgreSQL
```

Do not draw:

```text
Frontend ───────▶ PostgreSQL
```

or:

```text
AI Agent ───────▶ PostgreSQL
```

---

# 12. Protected Banking Service

Deploy the demo banking system separately.

```text
┌────────────────────────────────┐
│ Demo Banking Service Container │
│                                │
│ Account API                    │
│ Transaction API                │
│ Payment API                    │
└────────────────────────────────┘
```

This represents the protected enterprise system your governance platform controls access to.

Example capabilities:

```text
GET account

GET transactions

POST payment
```

The banking service should trust only authorized internal calls from the Tool Executor/Governance Backend.

---

# 13. Banking Database

Prefer showing a logically separate database:

```text
┌─────────────────────────┐
│   Banking Database      │
│                         │
│ Customers               │
│ Accounts                │
│ Transactions            │
│ Payments                │
└─────────────────────────┘
```

Then:

```text
Demo Banking Service
        │
        ▼
Banking Database
```

Do not allow:

```text
Governance Backend ─────▶ Banking Database
```

The governance platform should interact through the Banking API.

This preserves service boundaries.

---

# 14. Database Separation

Architecturally show:

```text
Governance Database
        ≠
Banking Database
```

Even if the hackathon implementation uses one PostgreSQL server, use:

```text
PostgreSQL Server
│
├── governance_db
│
└── banking_db
```

or separate schemas.

This communicates proper ownership.

---

# 15. Network Zones

The deployment diagram should show three network zones.

## Zone A — Public / External

```text
Browser
AI Agent
```

These are outside the trusted infrastructure.

---

## Zone B — Application Network

```text
Frontend

Governance Backend
```

Only required endpoints are exposed.

---

## Zone C — Internal / Protected Network

```text
OPA

PostgreSQL

Banking Service

Banking Database
```

These should not be directly accessible from the public internet.

---

# 16. Recommended Network Layout

```text
                 PUBLIC NETWORK

Browser ───────────────┐
                       ▼
                   Frontend

AI Agent ─────────────────────┐
                              │
══════════════════════════════╪════════════════════
       APPLICATION BOUNDARY   │
                              ▼
                    Governance Backend
                       │      │
          ┌────────────┘      └────────────┐
          │                               │
          ▼                               ▼
         OPA                       Governance DB

═══════════════════════════════════════════════════
        PROTECTED SERVICE BOUNDARY

                    Governance Backend
                           │
                           │ Authorized Call
                           ▼
                    Banking Service
                           │
                           ▼
                    Banking Database
```

---

# 17. Docker Compose View

For the hackathon, the physical deployment could look like:

```text
docker-compose.yml

services:

frontend

governance-backend

opa

postgres

banking-service
```

Optionally:

```text
banking-postgres
```

if you want complete database isolation.

---

# 18. Suggested Container Names

Use clean names in the diagram:

```text
governance-ui

governance-api

opa

governance-db

banking-api

banking-db
```

This makes the deployment diagram easy to map to Docker Compose later.

---

# 19. Internal Networking

Conceptually:

```text
┌─────────────────────────────────────────────┐
│             governance-network              │
│                                             │
│ governance-api                             │
│ opa                                        │
│ governance-db                              │
│                                             │
└─────────────────────────────────────────────┘
```

And:

```text
┌─────────────────────────────────────────────┐
│              banking-network                │
│                                             │
│ banking-api                                │
│ banking-db                                 │
│                                             │
└─────────────────────────────────────────────┘
```

The Governance Backend can be attached to both networks:

```text
governance-api
      │
      ├── governance-network
      │
      └── banking-network
```

This is useful because it becomes the controlled bridge between governance and protected services.

---

# 20. Important Network Principle

The AI Agent should not be attached to:

```text
banking-network
```

The frontend should not be attached to:

```text
banking-network
```

Only controlled backend infrastructure should reach it.

---

# 21. Port Exposure

For documentation, distinguish:

```text
EXPOSED
```

from:

```text
INTERNAL ONLY
```

Example conceptual setup:

```text
Frontend
Public

Governance API
Public/Authenticated

OPA
Internal Only

Governance PostgreSQL
Internal Only

Banking API
Internal Only

Banking Database
Internal Only
```

Avoid making the diagram depend heavily on specific port numbers unless they are already finalized.

Ports belong primarily in deployment configuration.

---

# 22. External LLM Provider

If the AI Agent uses an external LLM, show:

```text
┌─────────────────────────┐
│ External LLM Provider   │
└────────────┬────────────┘
             │
             ▼
       AI Agent Runtime
```

But keep this separate from governance authorization.

The LLM provider should never have direct access to:

```text
OPA

Governance DB

Banking API

Banking DB
```

---

# 23. MCP Deployment

If your project demonstrates MCP, show it carefully.

Possible architecture:

```text
AI Agent
   │
   │ MCP Tool Request
   ▼
Governance MCP Server
   │
   ▼
Governance Backend
   │
   ▼
Authorization
   │
   ▼
Tool Executor
```

The important rule is:

```text
MCP
≠
Authorization
```

MCP exposes/discovers tools.

Your governance platform determines whether those tools can actually be used.

---

# 24. MCP Option for MVP

If MCP is part of the demo:

```text
┌────────────────────┐
│     AI Agent       │
└─────────┬──────────┘
          │ MCP
          ▼
┌────────────────────┐
│ Governance MCP     │
│ Server             │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Governance API     │
└────────────────────┘
```

If MCP is not implemented during the hackathon, mark it:

```text
Optional / Future Integration
```

Do not make it look implemented if it isn't.

---

# 25. Secrets

Show a conceptual secrets component if desired:

```text
┌──────────────────────┐
│ Secrets / Env Config │
│                      │
│ DB Credentials       │
│ Signing Secrets      │
│ API Keys             │
└──────────────────────┘
```

Services consume secrets.

Never place actual credentials in the diagram.

---

# 26. Logging

Show:

```text
Governance Backend
        │
        ▼
Audit Service
        │
        ▼
Governance PostgreSQL
```

For the MVP this is sufficient.

Production architecture could later use:

```text
Log aggregation

SIEM

Security monitoring

Alerting
```

but those don't need to complicate the hackathon deployment.

---

# 27. Health Checks

The deployment should include health checks conceptually:

```text
Governance API
   │
   ├── DB reachable?
   ├── OPA reachable?
   └── Banking API reachable?
```

Important:

OPA being unavailable should not silently disable authorization.

For protected actions:

```text
OPA DOWN
   ↓
FAIL CLOSED
```

---

# 28. Failure Isolation

Add small notes near critical dependencies.

### OPA unavailable

```text
Authorization unavailable
→ deny protected action
```

### PostgreSQL unavailable

```text
Governance state unavailable
→ reject action
```

### Banking API unavailable

```text
Authorization may succeed
but execution fails
```

This distinction matters.

---

# 29. Deployment Trust Boundaries

Show dashed boundaries around:

```text
PUBLIC ZONE

APPLICATION ZONE

GOVERNANCE INTERNAL ZONE

PROTECTED BANKING ZONE
```

This gives the deployment diagram security meaning rather than making it just a Docker diagram.

---

# 30. Recommended Final Draw.io Layout

Build approximately:

```text
                              EXTERNAL

     ┌─────────────┐                         ┌─────────────┐
     │   Browser   │                         │  AI Agent   │
     └──────┬──────┘                         └──────┬──────┘
            │ HTTPS                                  │ HTTPS/MCP
            ▼                                        │
     ┌───────────────┐                               │
     │ Governance UI │                               │
     │   Frontend    │                               │
     └───────┬───────┘                               │
             │                                       │
             │ HTTPS / REST                          │
             └─────────────────┬─────────────────────┘
                               ▼

════════════════════════ APPLICATION ZONE ═══════════════════════

                    ┌───────────────────────────┐
                    │      GOVERNANCE API       │
                    │                           │
                    │ Gateway                   │
                    │ Authentication            │
                    │ Agent Registry            │
                    │ Permissions               │
                    │ Risk                      │
                    │ Authorization             │
                    │ Approval                  │
                    │ Tool Registry             │
                    │ Tool Executor             │
                    │ Audit                     │
                    └───────┬─────────┬─────────┘
                            │         │
             Policy Input   │         │ SQL
                            ▼         ▼

════════════════════ GOVERNANCE INTERNAL ZONE ═══════════════════

                    ┌─────────────┐  ┌─────────────────┐
                    │     OPA     │  │ Governance DB   │
                    │             │  │ PostgreSQL      │
                    │ Rego        │  │                 │
                    │ Policies    │  │ Agents          │
                    │             │  │ Permissions     │
                    │ PDP         │  │ Approvals       │
                    └─────────────┘  │ Audit           │
                                     └─────────────────┘

                             │
                             │ Authorized Internal API Call
                             ▼

══════════════════════ PROTECTED BANKING ZONE ═══════════════════

                    ┌──────────────────────────┐
                    │      Banking API         │
                    │                          │
                    │ Account Service          │
                    │ Transaction Service      │
                    │ Payment Service          │
                    └────────────┬─────────────┘
                                 │ SQL
                                 ▼
                    ┌──────────────────────────┐
                    │      Banking DB          │
                    │      PostgreSQL          │
                    │                          │
                    │ Customers                │
                    │ Accounts                 │
                    │ Transactions             │
                    │ Payments                 │
                    └──────────────────────────┘
```

---

# 31. Optional Human Approval Path

Add to the side:

```text
┌──────────────────────┐
│   Human Approver     │
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────┐
│   Governance UI      │
└──────────┬───────────┘
           │
           ▼
     Governance API
           │
           ▼
    Approval Service
```

---

# 32. Optional Admin Path

Similarly:

```text
┌──────────────────────┐
│   Security Admin     │
└──────────┬───────────┘
           │
           ▼
     Governance UI
           │
           ▼
     Governance API
```

This keeps both administrative actors going through the same controlled application layer.

---

# 33. Communication Matrix

Use these relationships when drawing arrows:

| Source         | Destination    | Communication |
| -------------- | -------------- | ------------- |
| Browser        | Frontend       | HTTPS         |
| Frontend       | Governance API | HTTPS/REST    |
| AI Agent       | Governance API | HTTPS/REST    |
| Governance API | OPA            | Internal HTTP |
| Governance API | Governance DB  | SQL           |
| Governance API | Banking API    | Internal HTTP |
| Banking API    | Banking DB     | SQL           |
| Human Approver | Frontend       | HTTPS         |
| Security Admin | Frontend       | HTTPS         |

If MCP is implemented:

```text
AI Agent
   │ MCP
   ▼
Governance MCP Server
   │
   ▼
Governance API
```

---

# 34. Forbidden Deployment Paths

Do not show:

```text
AI Agent ─────────▶ Banking API
```

Do not show:

```text
AI Agent ─────────▶ Banking DB
```

Do not show:

```text
Frontend ─────────▶ Banking API
```

Do not show:

```text
Frontend ─────────▶ PostgreSQL
```

Do not show:

```text
Browser ──────────▶ OPA
```

Do not show:

```text
OPA ──────────────▶ Banking API
```

Do not show:

```text
External LLM ─────▶ Banking API
```

The deployment diagram should make these paths structurally impossible.

---

# 35. MVP vs Production

Add a small note:

```text
HACKATHON MVP

Docker Compose
Single Governance Backend
OPA Container
PostgreSQL
Demo Banking API
Frontend
```

And optionally:

```text
PRODUCTION EVOLUTION

Kubernetes
API Gateway
Managed PostgreSQL
OPA Sidecar / Central PDP
Secrets Manager
Observability
SIEM
Service Identity
mTLS
High Availability
Autoscaling
```

Do not build the production version during the hackathon unless required.

---

# 36. Why Modular Monolith for MVP

The logical architecture contains many components:

```text
Agent Registry
Permission Service
Risk Engine
Authorization Service
Approval Service
Tool Registry
Audit Service
```

But deploying each as an independent microservice would introduce:

```text
Service discovery

Network failures

Distributed tracing

More containers

More configuration

More deployment complexity
```

without adding much hackathon value.

Therefore:

```text
Logical Components
        ↓
Modular Backend
        ↓
Single Governance API Container
```

is the recommended MVP architecture.

---

# 37. Important Security Message

Your deployment diagram should visually communicate:

```text
Public
  │
  ▼
Governance Entry Point
  │
  ▼
Internal Authorization Infrastructure
  │
  ▼
Controlled Execution
  │
  ▼
Protected Banking Infrastructure
```

Each step moves into a more trusted zone.

---

# 38. Diagram Title

Use:

**AI Agent Governance Platform — Deployment Architecture**

Subtitle:

**Containerized governance, policy evaluation, and isolated protected-service execution**

---

# 39. Key Message

Someone looking at the diagram should understand:

> **Protected banking infrastructure is never directly exposed to an AI agent.**

The deployment enforces:

```text
AI Agent
   │
   ▼
Governance API
   │
   ├── PostgreSQL
   │
   └── OPA
   │
   ▼
Authorized Tool Execution
   │
   ▼
Banking API
   │
   ▼
Banking Database
```

The architectural principle is:

> **Authorization is not just application logic—the deployment topology itself should enforce the trust boundary.**
