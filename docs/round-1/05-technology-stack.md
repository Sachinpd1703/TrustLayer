# Technology Stack

## 1. Overview

The AI Agent Governance Platform requires technologies across several distinct layers:

- AI / Agent Layer
- Governance API Layer
- Policy & Authorization Layer
- Risk Evaluation Layer
- Data Layer
- Human Approval & Dashboard Layer
- Tool Integration Layer
- Security Layer
- Observability Layer
- Deployment Layer

The technology stack is selected around four principles:

1. Security
2. Modularity
3. Explainability
4. Enterprise scalability

The architecture should also remain largely independent of any single AI model, cloud provider, or policy engine.

---

# 2. Proposed Technology Stack

| Layer | Proposed Technology | Purpose |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Governance dashboard |
| Backend | Spring Boot + Java | Core governance services |
| Database | PostgreSQL | Governance and audit data |
| Policy Engine | Open Policy Agent (OPA) | Policy-based authorization |
| Policy Language | Rego | Authorization policies |
| AI / Agent | LLM with tool calling | Demonstration AI agent |
| Tool Protocol | REST + optional MCP | Agent/tool integration |
| Authentication | OAuth 2.0 / OIDC concepts | Identity and authentication |
| API Communication | REST/JSON | Service communication |
| Containerization | Docker | Portable deployment |
| Orchestration | Kubernetes | Future enterprise scaling |
| Observability | OpenTelemetry-compatible approach | Logs, metrics and traces |
| Version Control | Git + GitHub | Source and policy versioning |

The proof of concept requires only a subset of these technologies.

Kubernetes, distributed tracing, enterprise IAM integrations, and other infrastructure can be introduced during later deployment stages.

---

# 3. High-Level Technology Architecture

Conceptually:

                        User
                          |
                          v
                 +----------------+
                 | Next.js / React|
                 |   Dashboard    |
                 +-------+--------+
                         |
                         | REST
                         v
              +-----------------------+
              | Spring Boot           |
              | Governance Platform   |
              +-----------+-----------+
                          |
        +-----------------+-----------------+
        |                 |                 |
        v                 v                 v
   PostgreSQL          Risk Engine          OPA
                                          + Rego
        |                                    |
        +-----------------+------------------+
                          |
                          v
                  Governance Decision
                          |
              +-----------+-----------+
              |           |           |
              v           v           v
            ALLOW      APPROVAL      DENY
              |
              v
                  +---------------+
                  | Tool Executor |
                  +-------+-------+
                          |
                    REST / MCP
                          |
                          v
                  Banking Services

AI agents interact with the governance layer rather than directly receiving unrestricted access to protected banking services.

---

# 4. Frontend — Next.js

## Technology

Next.js

with:

- React
- TypeScript

## Purpose

The frontend provides the Governance Dashboard.

The dashboard can display:

- Registered AI agents
- Agent status
- Tools
- Permissions
- Policies
- Action requests
- Risk classifications
- Authorization decisions
- Human approval requests
- Audit events

Administrative operations can include:

- Disable Agent
- Enable Agent
- Grant Permission
- Revoke Permission
- Approve Action
- Reject Action

---

# 5. Why Next.js?

Next.js provides:

- React-based UI development
- TypeScript support
- Component-based architecture
- Server/client capabilities
- Strong ecosystem
- Fast dashboard development

For the hackathon, it also allows rapid development of a polished governance interface.

---

# 6. Backend — Java + Spring Boot

## Technology

Java

with:

Spring Boot

## Purpose

Spring Boot can implement the core governance backend.

Major modules include:

Governance Gateway

Agent Registry

Tool Registry

Permission Service

Authorization Service

Risk Engine

Approval Service

Audit Service

Tool Executor

---

# 7. Why Spring Boot?

Spring Boot is suitable because the proposed platform resembles enterprise security infrastructure rather than a simple AI demo.

Advantages include:

- Mature enterprise ecosystem
- Strong security libraries
- Dependency injection
- REST API support
- Validation
- Database integration
- Transaction management
- Observability support
- Mature testing ecosystem

It also maps naturally to financial-services backend architectures.

---

# 8. Proposed Backend Structure

Conceptually:

governance-platform/

    agent/
        AgentService
        AgentController

    tool/
        ToolService
        ToolController

    permission/
        PermissionService

    authorization/
        AuthorizationService
        OpaClient

    risk/
        RiskService

    approval/
        ApprovalService

    execution/
        ToolExecutor

    audit/
        AuditService

    security/
        Authentication
        AuthorizationContext

The initial implementation can remain a modular monolith.

---

# 9. Why a Modular Monolith First?

The architecture contains many logical components, but they do not need to become independent microservices immediately.

For the prototype:

+----------------------------------+
|        Spring Boot Backend       |
|                                  |
| Agent Registry                   |
| Tool Registry                    |
| Permissions                      |
| Risk                             |
| Authorization                    |
| Approval                         |
| Audit                            |
| Tool Execution                   |
+----------------------------------+

This provides:

- Faster development
- Easier debugging
- Simpler deployment
- Fewer distributed-system problems

Later:

Governance Gateway
      |
      +--> Permission Service
      +--> Risk Service
      +--> Authorization Service
      +--> Approval Service
      +--> Audit Service

can be separated if scale or organizational requirements justify it.

---

# 10. Database — PostgreSQL

## Technology

PostgreSQL

## Purpose

PostgreSQL stores governance state.

Example entities:

agents

tools

permissions

agent_permissions

action_requests

authorization_decisions

approval_requests

audit_events

policy_metadata

risk_assessments

---

# 11. Why PostgreSQL?

The governance domain contains strongly related data.

For example:

Agent
  |
  +---- Permissions
  |
  +---- Action Requests
  |
  +---- Decisions
  |
  +---- Approvals
  |
  +---- Audit Events

Relational integrity is valuable for these relationships.

PostgreSQL provides:

- ACID transactions
- Referential integrity
- Mature indexing
- JSON support where needed
- Strong querying capabilities
- Production maturity

---

# 12. Policy Engine — Open Policy Agent

## Technology

Open Policy Agent (OPA)

## Purpose

OPA acts as the Policy Decision Point.

The Governance Platform asks:

Can this agent perform this action under the current conditions?

Input:

Principal

Action

Resource

Permissions

Risk

Context

Approval State

        |
        v

       OPA

        |
        v

Policy Decision

---

# 13. Why OPA?

OPA provides:

- Policy-as-code
- Centralized policy evaluation
- Separation between policy and application logic
- Structured policy inputs
- Explainable policy decisions
- Policy testing
- Version-controlled policy files

This is preferable to spreading authorization logic throughout backend code.

Instead of:

if (agent == "PaymentAgent"
    && amount <= 500
    && risk == LOW) {

    executePayment();
}

we can conceptually define:

Governance Context
       |
       v
Policy Engine
       |
       v
Decision

The application enforces the decision.

---

# 14. Policy Language — Rego

OPA policies are written using Rego.

A simplified conceptual policy might evaluate:

input.action == "payment.execute"

input.amount <= 500

input.risk == "LOW"

and return:

ALLOW

Other conditions can produce:

REQUIRE_APPROVAL

or:

DENY

The actual policy structure should be designed around explicit structured decisions rather than relying only on simple boolean authorization.

---

# 15. Structured Policy Decision

Instead of returning only:

true

or:

false

our authorization layer should support a richer result:

{
  "decision": "REQUIRE_APPROVAL",
  "reason": "AUTONOMOUS_LIMIT_EXCEEDED",
  "policy": "payment-policy",
  "policyVersion": "1"
}

This improves:

- Explainability
- Auditing
- Debugging
- Human approval workflows

---

# 16. Why Not Put Risk Logic Entirely in OPA?

OPA should primarily evaluate authorization policy.

Risk evaluation may involve:

- Historical behavior
- Transaction patterns
- External signals
- Fraud indicators
- Statistical models
- Machine-learning models

Therefore:

Risk Engine
     |
     | Risk = HIGH
     v
Authorization Context
     |
     v
OPA

This maintains separation between:

Risk Assessment

and

Authorization Policy

For the proof of concept, however, the Risk Engine can use deterministic rules.

---

# 17. Risk Engine

## Initial Implementation

Spring Boot service/module

## Prototype Logic

Example:

amount <= 500
known destination

→ LOW

amount <= 5,000

→ MEDIUM

amount > 5,000

→ HIGH

Additional simulated signals could include:

- Unknown destination
- Abnormal transaction frequency
- Unusual account access
- Repeated denied attempts

The exact rules are illustrative.

---

# 18. AI / Agent Layer

The governance architecture should remain model-independent.

Conceptually:

OpenAI-based Agent ─────┐
                        |
Other LLM Agent ────────┼──→ Governance Platform
                        |
Enterprise Agent ───────┘

The governance layer does not need to trust which model generated the action.

It evaluates the requested action itself.

---

# 19. Agent Tool Calling

An AI agent may decide:

User:
"Pay the approved vendor invoice."

        ↓

Agent Reasoning

        ↓

Tool Selection

execute_payment(...)

But instead of calling the payment system directly:

execute_payment
      |
      v
Governance Gateway
      |
      v
Authorization
      |
      v
Controlled Tool Executor

This allows existing LLM tool-calling capabilities to participate in governed workflows.

---

# 20. Model Context Protocol (MCP)

MCP can optionally be used to expose governed tools to AI agents through a standardized interface.

Conceptually:

AI Agent
    |
    | MCP
    v
Governed Tool Layer
    |
    v
Governance
    |
    v
Enterprise Service

MCP helps standardize tool interaction.

However:

MCP
≠
Authorization

The governance platform remains responsible for deciding whether an agent may use a tool.

---

# 21. REST APIs

REST/JSON is suitable for communication between major prototype components.

Example:

AI Agent

POST /governance/actions

        ↓

Governance Platform

        ↓

Authorization Decision

Example conceptual request:

{
  "agentId": "AGT-002",
  "tool": "execute_payment",
  "arguments": {
    "amount": 250,
    "currency": "USD"
  }
}

Response:

{
  "decision": "ALLOW"
}

---

# 22. Authentication — OAuth 2.0 / OpenID Connect

Authentication should use established identity standards rather than custom authentication mechanisms.

For production environments, possible technologies include:

- OAuth 2.0
- OpenID Connect
- Workload Identity
- Service identities
- Short-lived credentials

The exact identity provider depends on the enterprise environment.

---

# 23. Agent Identity vs User Identity

The system should distinguish:

Human User

from:

AI Agent

Example:

User:

USR-102

Agent:

AGT-002

A governed action may contain both:

Initiating User:
USR-102

Acting Agent:
AGT-002

This improves accountability.

The system can answer:

Who requested the workflow?

and:

Which autonomous system executed the action?

---

# 24. Human Approval Authentication

Human approvers must also be authenticated.

Example:

Approver:

USR-MANAGER-07

Action:

approval.approve

Resource:

APR-3001

The platform verifies:

Is this person allowed to approve this type of action?

before accepting the approval.

---

# 25. Docker

## Technology

Docker

## Purpose

Each major runtime component can be containerized.

Example:

governance-backend

opa

postgresql

frontend

mock-banking-api

This makes the prototype easier to run consistently across development environments.

---

# 26. Prototype Deployment

A simple proof-of-concept deployment can be:

Docker Compose

        |
        +--> Frontend
        |
        +--> Spring Boot
        |
        +--> PostgreSQL
        |
        +--> OPA
        |
        +--> Mock Banking API

This is sufficient to demonstrate the architecture.

There is no need to introduce Kubernetes during the initial prototype.

---

# 27. Kubernetes

Kubernetes becomes relevant for later enterprise deployment.

Potential architecture:

                    Load Balancer
                         |
                         v
               Governance Gateway
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
     Permission        Risk          AuthZ
      Service         Service        Service
                                      |
                                      v
                                     OPA

Potential benefits include:

- Horizontal scaling
- Service discovery
- Health management
- Rolling deployments
- Configuration management
- Resilience

Kubernetes is therefore part of the scalability path rather than a requirement for proving the concept.

---

# 28. Observability

Governance infrastructure must be observable.

The system should eventually expose:

### Logs

Structured application and security logs.

### Metrics

Examples:

Authorization latency

ALLOW count

DENY count

Approval count

Risk distribution

Error rate

### Traces

A single action should be traceable across:

Agent Request
      ↓
Governance
      ↓
Risk
      ↓
OPA
      ↓
Execution

---

# 29. OpenTelemetry

An OpenTelemetry-compatible approach can provide standardized:

- Tracing
- Metrics
- Context propagation

This becomes especially useful if the platform evolves from a modular monolith into distributed services.

For Round 1, this is an architectural direction rather than a requirement for the initial prototype.

---

# 30. Audit Storage

Audit events can initially be stored in PostgreSQL.

Example:

audit_events

- id
- request_id
- agent_id
- event_type
- actor_id
- timestamp
- metadata

For larger production deployments, audit data could later integrate with:

- Centralized logging platforms
- SIEM systems
- Dedicated immutable audit stores

The architecture should keep audit generation separate from ordinary application logging.

---

# 31. Git-Based Policy Versioning

OPA policies can be stored alongside the platform's source configuration using Git.

Example:

policies/

    payment.rego

    account.rego

    agent-admin.rego

This enables:

Policy Change
     ↓
Git Commit
     ↓
Review
     ↓
Testing
     ↓
Approved Deployment

Benefits include:

- Version history
- Peer review
- Rollback
- Policy testing
- Accountability

---

# 32. Policy Testing

Policies should have automated test cases.

Example:

Payment $250
Risk LOW

Expected:
ALLOW

Payment $2,500
Risk MEDIUM

Expected:
REQUIRE_APPROVAL

Payment $25,000
Risk HIGH

Expected:
DENY

This helps prevent policy changes from unintentionally expanding agent authority.

---

# 33. Secrets Management

Sensitive credentials should never be embedded in:

- Agent prompts
- Source code
- Policy files
- Frontend applications

For the proof of concept:

Environment variables / protected local configuration

may be sufficient.

For enterprise deployment:

A dedicated secrets-management system should be used.

---

# 34. Technology-to-Component Mapping

| Architecture Component | Technology |
|---|---|
| Governance Dashboard | Next.js + React |
| Governance Gateway | Spring Boot |
| Agent Registry | Spring Boot + PostgreSQL |
| Tool Registry | Spring Boot + PostgreSQL |
| Permission Service | Spring Boot + PostgreSQL |
| Risk Engine | Spring Boot |
| Authorization Service | Spring Boot |
| Policy Decision Point | OPA |
| Policies | Rego |
| Approval Service | Spring Boot + PostgreSQL |
| Audit Service | Spring Boot + PostgreSQL |
| Tool Executor | Spring Boot |
| Mock Banking APIs | Spring Boot / lightweight REST service |
| Agent Integration | LLM tool calling |
| Tool Standardization | REST / optional MCP |
| Local Deployment | Docker Compose |
| Enterprise Deployment | Kubernetes |
| Observability | Structured logs + OpenTelemetry-compatible telemetry |

---

# 35. Why Not Use Only LLM Guardrails?

LLM guardrails are useful for:

- Input validation
- Content filtering
- Prompt protection
- Output controls

But they should not be the final authorization boundary for financial actions.

For example:

LLM says:

"This payment looks safe."

does not equal:

AUTHORIZED

Instead:

LLM / Agent
      ↓
Action Request
      ↓
Deterministic Governance Controls
      ↓
Policy Decision
      ↓
Execution

Security-critical authorization should remain outside the model.

---

# 36. Why Not Hard-Code Authorization?

Hard-coded authorization creates:

Agent Code
   |
   +--> Payment Rules
   +--> Account Rules
   +--> Approval Rules
   +--> Risk Rules

As the number of agents grows:

Agent A → Rules

Agent B → Different Rules

Agent C → More Rules

This creates inconsistent authorization.

Policy-based architecture instead provides:

Multiple Agents
      ↓
Governance
      ↓
Central Policies

This improves consistency and manageability.

---

# 37. Why OPA Instead of Building a Policy Engine?

Building a custom policy language and evaluation engine would add unnecessary complexity and security risk.

OPA already provides a mature policy evaluation framework.

Our platform can focus on:

- Agent governance
- Authorization context
- Risk integration
- Human approval
- Tool execution
- Lifecycle control
- Auditing

while OPA handles policy evaluation.

---

# 38. OPA vs Cedar

Both technologies were researched.

### OPA / Rego

Well suited for general-purpose policy evaluation across infrastructure and application contexts.

### Cedar

A policy language designed around authorization concepts such as:

Principal

Action

Resource

Context

Cedar provides a particularly clear authorization model.

For the proposed proof of concept:

**OPA + Rego**

is selected as the initial policy engine.

However, the architecture introduces an:

Authorization Service

between application logic and the underlying policy engine.

Conceptually:

Governance
     ↓
Authorization Service
     ↓
Policy Engine Interface
     ↓
OPA

This avoids tightly coupling the entire platform to one policy technology.

---

# 39. Technology Selection Principles

Each technology is selected according to:

### Security

Does it support strong identity, policy and data controls?

### Maturity

Is it established enough for enterprise-oriented architecture?

### Modularity

Can components evolve independently?

### Scalability

Can the architecture grow beyond the proof of concept?

### Developer Productivity

Can the team realistically build and demonstrate it?

### Explainability

Can judges and enterprise stakeholders understand how decisions are made?

---

# 40. Prototype Stack

For an actual hackathon prototype, keep the stack much smaller:

+--------------------------------+
|          Next.js               |
|     Governance Dashboard       |
+---------------+----------------+
                |
                v
+--------------------------------+
|       Spring Boot Backend      |
|                                |
| Agent Registry                 |
| Tool Registry                  |
| Permissions                    |
| Risk Engine                    |
| Authorization                  |
| Approval                       |
| Audit                          |
| Tool Executor                  |
+---------+---------------+------+
          |               |
          v               v
    PostgreSQL           OPA
                          |
                          v
                 Rego Policies

                +
                |
                v

        Mock Banking API

Run using:

Docker Compose

This is enough to demonstrate the complete governance concept without unnecessary infrastructure.

---

# 41. Enterprise Evolution

The same architecture can later evolve:

Prototype

Spring Boot Modular Monolith
        +
PostgreSQL
        +
OPA

        ↓

Pilot

Enterprise IAM
        +
Real Internal APIs
        +
Central Observability

        ↓

Enterprise

Distributed Governance Services
        +
Highly Available OPA
        +
Kubernetes
        +
Centralized Policy Lifecycle
        +
SIEM Integration
        +
Secrets Management
        +
Distributed Tracing

This creates a realistic path from hackathon concept to enterprise architecture.

---

# 42. Technology Independence

The core product should not be defined as:

"An OPA application"

or:

"A Spring Boot application"

The product is:

**AI Agent Governance Platform**

Technologies are implementation choices.

The conceptual interfaces remain:

Agent
   ↓
Governance
   ↓
Authorization
   ↓
Risk
   ↓
Policy
   ↓
Approval
   ↓
Execution
   ↓
Audit

This allows technologies to evolve without changing the fundamental governance model.

---

# 43. Round 1 Technology Stack Slide

For the presentation, avoid displaying 15 technologies.

Use a simple architecture-oriented stack:

## AI & Agent Layer

LLM Tool Calling + MCP-compatible integrations

        ↓

## Governance Layer

Java + Spring Boot

        ↓

## Policy & Authorization

Open Policy Agent + Rego

        ↓

## Data Layer

PostgreSQL

        ↓

## Governance Dashboard

Next.js + React + TypeScript

        ↓

## Infrastructure

Docker → Kubernetes at enterprise scale

---

# 44. Why This Stack?

**Spring Boot**

Enterprise-grade governance backend.

**OPA + Rego**

Externalized policy-as-code authorization.

**PostgreSQL**

Reliable relational governance and audit data.

**Next.js**

Rapid development of the governance and approval dashboard.

**REST / MCP**

Flexible integration with AI agents and enterprise tools.

**Docker / Kubernetes**

Clear path from prototype to scalable deployment.

---

# 45. Final Technology Principle

The architecture intentionally separates:

AI Reasoning

from:

Authorization

from:

Execution

Therefore:

LLM
  ↓
"What action should I take?"

Governance + OPA
  ↓
"Is this action permitted?"

Tool Executor
  ↓
"Execute the authorized action."

This separation is the foundation of the proposed technology architecture.

> **AI intelligence determines intent; deterministic governance determines authority.**