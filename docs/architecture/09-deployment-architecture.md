# Deployment Architecture

## 1. Overview

This document defines the deployment architecture for the **AI Agent Governance and Authorization Gateway**.

The system provides a controlled security layer between:

```text
AI Agents
    ↓
Governance Platform
    ↓
Enterprise / Banking Services
```

The deployment architecture must support:

* Secure agent access
* Centralized authorization
* Policy evaluation
* Human approval
* Risk evaluation
* Protected tool execution
* Auditability
* Scalability
* High availability
* Future enterprise integration

For the hackathon, the architecture should remain simple enough to build quickly while preserving the same security boundaries required by a production system.

---

# 2. Deployment Goals

The deployment should provide:

```text
Simple MVP Deployment

Clear Trust Boundaries

Independent Policy Engine

Secure Database

Protected Banking Services

Centralized Gateway Enforcement

Environment-Based Configuration

Observability

Horizontal Scalability

Future Kubernetes Compatibility
```

The most important deployment requirement is:

> Protected services must not become directly accessible to AI agents simply because they are deployed as separate services.

---

# 3. Logical vs Physical Architecture

Our previous architecture defined logical components such as:

```text
Agent Management

Tool Registry

Permission Management

Policy Management

Governance Gateway

Authorization Service

Risk Service

Approval Service

Audit Service

Tool Executor
```

These do not need to become individual deployable services.

For example:

```text
Logical Architecture

Governance Gateway
Authorization Service
Risk Service
Approval Service
Audit Service
```

can initially become:

```text
One Backend Application
```

with separate internal modules.

This is the recommended approach for the hackathon.

---

# 4. MVP Deployment Strategy

Recommended MVP deployment:

```text
                 INTERNET
                    │
                    ▼
             ┌──────────────┐
             │   FRONTEND   │
             │ Governance UI│
             └──────┬───────┘
                    │
                    │ HTTPS
                    ▼
       ┌──────────────────────────┐
       │    GOVERNANCE BACKEND    │
       │                          │
       │ Agent Management         │
       │ Tool Registry            │
       │ Permission Management    │
       │ Policy Management        │
       │ Governance Gateway       │
       │ Authorization            │
       │ Risk Evaluation          │
       │ Approval                 │
       │ Audit                    │
       │ Tool Execution           │
       └───────┬─────────┬────────┘
               │         │
               │         │
               ▼         ▼
        ┌───────────┐  ┌────────────┐
        │ PostgreSQL│  │    OPA     │
        └───────────┘  │Policy Engine│
                       └────────────┘
               │
               │ Internal Access
               ▼
       ┌──────────────────┐
       │ BANKING DEMO API │
       │                  │
       │ Accounts         │
       │ Transactions     │
       │ Payments         │
       └──────────────────┘
```

This provides a strong architecture without unnecessary deployment complexity.

---

# 5. MVP Deployable Components

The MVP can consist of five major deployable units:

```text
1. Governance Frontend

2. Governance Backend

3. Policy Engine

4. PostgreSQL

5. Banking Demo Service
```

Optionally:

```text
6. AI Agent Runtime / Demo Agent
```

can run separately to demonstrate an external agent interacting with the governance platform.

---

# 6. Governance Frontend

The frontend provides interfaces for:

```text
Agent Management

Tool Management

Permission Management

Policy Management

Approval Dashboard

Audit Explorer

Action Timeline

Risk Visualization
```

Possible implementation:

```text
Next.js
+
TypeScript
+
Tailwind CSS
```

The frontend should communicate only with the Governance Backend.

```text
Browser
   │
   ▼
Frontend
   │
   ▼
Governance Backend
```

It should not directly communicate with:

```text
PostgreSQL

OPA

Banking Service

Internal Risk Components
```

---

# 7. Governance Backend

The backend is the primary application deployment.

Conceptually:

```text
Governance Backend
│
├── Authentication Module
├── Agent Module
├── Tool Registry Module
├── Permission Module
├── Policy Module
├── Governance Gateway
├── Authorization Module
├── Risk Module
├── Approval Module
├── Audit Module
└── Tool Execution Module
```

These are logical modules inside one application.

---

# 8. Modular Monolith

For the hackathon, the backend should preferably use a:

```text
MODULAR MONOLITH
```

rather than:

```text
MICROSERVICES
```

Example:

```text
governance-backend/
│
├── modules/
│   ├── agents/
│   ├── tools/
│   ├── permissions/
│   ├── policies/
│   ├── authorization/
│   ├── risk/
│   ├── approvals/
│   ├── audit/
│   └── execution/
│
├── gateway/
│
├── integrations/
│   ├── opa/
│   └── banking/
│
└── common/
```

Benefits:

```text
Faster development

Simpler debugging

Simpler transactions

Fewer deployment failures

No unnecessary network communication

Easy local development
```

The internal boundaries can later become microservices if scale requires it.

---

# 9. Why Not Microservices Yet?

Deploying:

```text
Agent Service

Permission Service

Policy Service

Risk Service

Authorization Service

Approval Service

Audit Service

Execution Service
```

as independent services introduces:

```text
Service discovery

Network failures

Distributed tracing

Authentication between services

Deployment complexity

Distributed transactions

Additional infrastructure
```

None of these directly improve the hackathon demonstration.

Therefore:

> Design modularly, deploy simply.

---

# 10. Policy Engine Deployment

OPA should run independently from the application.

Deployment:

```text
Governance Backend
       │
       │ Internal HTTP
       ▼
┌─────────────────┐
│       OPA       │
│                 │
│ Rego Policies   │
│ Evaluation      │
└─────────────────┘
```

OPA is a natural separate deployment because it is already designed as an independent policy engine.

---

# 11. OPA Responsibility

OPA receives policy input such as:

```text
Principal

Action

Resource

Context
```

and returns a decision.

Example:

```text
ALLOW

DENY

REQUIRE_APPROVAL
```

OPA does not:

```text
Execute payment

Modify database

Call banking APIs

Approve requests
```

The Governance Backend remains responsible for enforcement.

---

# 12. Policy Engine Adapter

The backend should not tightly couple the entire application to OPA.

Use:

```text
Authorization Service
        │
        ▼
PolicyEngine Adapter
        │
        ▼
       OPA
```

Conceptually:

```text
PolicyEngine

evaluate(request)
```

Implementation:

```text
OpaPolicyEngine
```

Future implementation:

```text
CedarPolicyEngine
```

This allows:

```text
OPA
 ↓
Cedar
```

without redesigning the Gateway.

---

# 13. PostgreSQL Deployment

PostgreSQL stores governance state.

Examples:

```text
Agents

Tools

Tool Actions

Permissions

Permission Boundaries

Policies

Policy Versions

Action Requests

Authorization Decisions

Risk Assessments

Approval Requests

Execution Records

Audit Events
```

The database should not be directly exposed publicly.

---

# 14. Database Network Boundary

Preferred:

```text
Internet
   │
   X
   │
PostgreSQL
```

Allowed:

```text
Governance Backend
       │
       ▼
PostgreSQL
```

Production architecture:

```text
Public Network
      │
      ▼
Application
      │
      ▼
Private Network
      │
      ▼
Database
```

---

# 15. Banking Demo Service

The hackathon should include a small protected banking API.

Example capabilities:

```text
account.read

transaction.read

payment.create

payment.execute

card.block
```

Example endpoints internally:

```text
GET  /accounts/{id}

GET  /transactions/{id}

POST /payments

POST /payments/{id}/execute

POST /cards/{id}/block
```

The purpose is not to build a full bank.

It exists to demonstrate protected enterprise actions.

---

# 16. Banking Service Security Boundary

The Banking Service must not trust the AI agent directly.

Incorrect:

```text
AI Agent
   │
   ▼
Banking Service
```

Correct:

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
Banking Service
```

This deployment boundary demonstrates that authorization cannot simply be ignored by the agent.

---

# 17. Banking Service Authentication

The Banking Service should authenticate the Governance Backend.

Conceptually:

```text
Governance Backend

Service Credential
       │
       ▼
Banking Service
```

The Banking Service accepts trusted internal callers.

The agent's own credential should not grant direct Banking Service access.

---

# 18. AI Agent Runtime

The demo AI agent can run separately.

```text
┌────────────────────┐
│      AI AGENT      │
│                    │
│ LLM                │
│ Planning           │
│ Tool Selection     │
└─────────┬──────────┘
          │
          │ Action Request
          ▼
┌────────────────────┐
│ GOVERNANCE GATEWAY │
└────────────────────┘
```

This is useful because it demonstrates that governance is external to the AI agent.

---

# 19. Agent Tool Design

Instead of giving the agent:

```text
executePayment()
```

that directly calls the Banking Service, expose something conceptually like:

```text
requestGovernedAction()
```

Example:

```json
{
  "action": "payment.execute",
  "resource": {
    "type": "payment",
    "id": "PAY-1001"
  },
  "arguments": {
    "amount": 5000,
    "currency": "USD"
  }
}
```

The agent requests execution.

The governance platform controls whether execution occurs.

---

# 20. Containerization

Each major deployable component can be containerized.

Example:

```text
governance-frontend
        ↓
Docker Container

governance-backend
        ↓
Docker Container

opa
        ↓
Docker Container

postgres
        ↓
Docker Container

banking-service
        ↓
Docker Container

demo-agent
        ↓
Docker Container
```

This provides reproducible local and cloud environments.

---

# 21. Docker Compose

For the hackathon, Docker Compose is an excellent deployment strategy.

Conceptually:

```text
docker-compose.yml

services:

  frontend

  backend

  opa

  postgres

  banking-service

  demo-agent
```

Then the complete platform can be started with one command.

This significantly simplifies demonstrations.

---

# 22. Local Deployment

Recommended development architecture:

```text
Developer Machine

┌──────────────────────────────────────────┐
│                                          │
│ Frontend                                 │
│                                          │
│ Governance Backend                       │
│                                          │
│ OPA                                      │
│                                          │
│ PostgreSQL                               │
│                                          │
│ Banking Demo Service                     │
│                                          │
│ AI Agent                                 │
│                                          │
└──────────────────────────────────────────┘
```

Docker Compose can manage infrastructure dependencies.

During active development, frontend/backend applications can optionally run directly for hot reload.

---

# 23. Local Network Design

Example:

```text
Browser
  │
  │ localhost:3000
  ▼
Frontend
  │
  │ localhost:8080
  ▼
Backend
  │
  ├────→ postgres:5432
  │
  ├────→ opa:8181
  │
  └────→ banking-service:8081
```

Inside Docker networking, services should communicate using service names rather than `localhost`.

---

# 24. Public vs Internal Services

Services should be classified as:

```text
PUBLIC

or

INTERNAL
```

Recommended:

| Component              | Exposure                  |
| ---------------------- | ------------------------- |
| Governance Frontend    | Public                    |
| Governance Backend API | Public / controlled       |
| OPA                    | Internal                  |
| PostgreSQL             | Internal                  |
| Banking Service        | Internal                  |
| Agent Runtime          | Depends on implementation |

OPA should not need public Internet exposure.

Neither should PostgreSQL.

---

# 25. Network Architecture

Production-style logical network:

```text
                     INTERNET
                        │
                        ▼
               ┌─────────────────┐
               │ Load Balancer / │
               │ API Gateway     │
               └────────┬────────┘
                        │
                        ▼
                PUBLIC APPLICATION
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
          Frontend          Governance API
                                  │
                                  │
                     ┌────────────┼─────────────┐
                     │            │             │
                     ▼            ▼             ▼
                    OPA       PostgreSQL    Banking API
                     │            │             │
                     └────────────┴─────────────┘
                               PRIVATE
                               NETWORK
```

The key idea is:

```text
Internet
   X
OPA

Internet
   X
Database

Internet
   X
Banking Internal APIs
```

---

# 26. Deployment Trust Zones

The architecture can be divided into three zones.

## Zone 1 — External / Untrusted

```text
AI Agents

Browsers

External Clients

Internet
```

## Zone 2 — Governance Zone

```text
Governance Backend

Authorization

Risk

Approval

Tool Executor
```

## Zone 3 — Protected Zone

```text
Banking Services

Databases

Policy Engine

Sensitive Internal Systems
```

Traffic between zones must be explicitly controlled.

---

# 27. Trust Zone Diagram

```text
┌─────────────────────────────────────────┐
│          UNTRUSTED / EXTERNAL           │
│                                         │
│ Browser            AI Agent             │
└───────────┬───────────────┬─────────────┘
            │               │
            └───────┬───────┘
                    ▼
        ┌─────────────────────────┐
        │     GOVERNANCE ZONE     │
        │                         │
        │ Governance Backend      │
        │ Authorization           │
        │ Risk                    │
        │ Approval                │
        │ Tool Executor           │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │      PROTECTED ZONE     │
        │                         │
        │ OPA                     │
        │ PostgreSQL              │
        │ Banking Services        │
        │ Internal APIs           │
        └─────────────────────────┘
```

---

# 28. Environment Configuration

Different environments should have independent configuration.

Example:

```text
development

test

staging

production
```

Never hard-code environment-specific endpoints.

Use configuration such as:

```text
DATABASE_URL

OPA_URL

BANKING_SERVICE_URL

AGENT_AUTH_SECRET

SERVICE_AUTH_SECRET

LOG_LEVEL
```

Secrets should not be committed to Git.

---

# 29. Environment Files

Local development may use:

```text
.env
```

but Git should contain only:

```text
.env.example
```

Example:

```text
DATABASE_URL=<database-url>

OPA_URL=http://opa:8181

BANKING_SERVICE_URL=http://banking-service:8081

AGENT_AUTH_SECRET=<secret>

SERVICE_AUTH_SECRET=<secret>
```

`.env` should be listed in:

```text
.gitignore
```

---

# 30. Secret Management

For the hackathon:

```text
Environment Variables
```

are sufficient.

Production systems should use dedicated secret-management systems such as:

```text
AWS Secrets Manager

Google Secret Manager

HashiCorp Vault

Kubernetes Secrets with external secret management
```

Application code should request secrets from trusted configuration rather than storing them directly.

---

# 31. Configuration vs Policy

These should remain distinct.

Configuration:

```text
Database URL

OPA URL

Service port

Timeout

Logging level
```

Policy:

```text
Payment above threshold requires approval.

Disabled agents cannot execute actions.

SupportAgent cannot execute payments.
```

Changing deployment configuration should not require rewriting authorization logic.

---

# 32. Policy Deployment

OPA policies can be loaded through:

```text
Mounted policy files

OPA bundles

Policy API

Central policy distribution
```

For the MVP, the simplest option is:

```text
Governance Backend
       │
       ▼
Policy Version
       │
       ▼
OPA
```

or preloaded policy files for the initial demo.

---

# 33. Policy Lifecycle

Conceptually:

```text
Policy Created
      ↓
DRAFT
      ↓
Validated
      ↓
Activated
      ↓
Deployed to Policy Engine
      ↓
Available for Evaluation
```

The active policy version should be traceable.

Authorization decisions should record which version produced the result.

---

# 34. Policy Deployment Failure

Suppose:

```text
Policy Version 5
```

fails to load into OPA.

The system should not mark it active as though deployment succeeded.

Preferred:

```text
Validate
   ↓
Deploy
   ↓
Verify
   ↓
Activate
```

If deployment fails:

```text
Previous valid policy remains active
```

where possible.

---

# 35. Health Checks

Each service should expose health information.

Examples:

```text
GET /health
```

Backend:

```json
{
  "status": "UP"
}
```

More detailed internal readiness checks may include:

```text
Database reachable

OPA reachable

Required configuration loaded
```

---

# 36. Liveness vs Readiness

Production orchestrators distinguish:

```text
Liveness
=
Is the application alive?
```

from:

```text
Readiness
=
Can the application safely receive traffic?
```

Example:

```text
Backend process running
but
Database unavailable
```

The service may be:

```text
LIVE
but
NOT READY
```

---

# 37. Authorization Dependency Health

If OPA is unavailable:

```text
Backend
→ still running
```

but sensitive authorization-dependent operations should:

```text
FAIL CLOSED
```

The health dashboard should show:

```text
Policy Engine
DEGRADED / DOWN
```

without bypassing authorization.

---

# 38. Database Failure

If PostgreSQL becomes unavailable:

```text
Agent State
Permissions
Approvals
Audit
```

may no longer be safely resolved.

Sensitive actions should not continue using guessed state.

Preferred:

```text
Database unavailable
      ↓
Required governance context unavailable
      ↓
Do not execute sensitive action
```

---

# 39. Service Timeouts

Every network call should have a timeout.

Example:

```text
Backend
  ↓
OPA
```

must not wait forever.

Similarly:

```text
Backend
  ↓
Banking Service
```

requires bounded execution.

This prevents resource exhaustion and cascading failures.

---

# 40. Retry Strategy

Retries should depend on operation type.

Safe candidate:

```text
GET account information
```

Potentially dangerous:

```text
POST payment execution
```

Financial side effects should never be blindly retried.

Use:

```text
Idempotency Key
```

for safe retry behavior.

---

# 41. Execution Reliability

Consider:

```text
Gateway
   │
   │ Execute Payment
   ▼
Banking Service

Payment succeeds.

Response is lost.

Gateway sees timeout.
```

The Gateway must not assume:

```text
timeout = payment failed
```

Retrying blindly could execute twice.

Therefore:

```text
Idempotency
+
Execution Record
+
Downstream Operation ID
```

should be used.

---

# 42. Deployment-Level Idempotency

The system should remain safe even when:

```text
Backend crashes

Container restarts

Network request retries

Load balancer retries

Agent retries
```

Therefore idempotency state must not exist only in application memory.

Store it in durable storage.

Example:

```text
PostgreSQL
```

---

# 43. Stateless Backend

Where possible, Governance Backend instances should remain stateless.

Store durable state in:

```text
PostgreSQL
```

rather than:

```text
Application Memory
```

This allows:

```text
Backend Instance 1

Backend Instance 2

Backend Instance 3
```

to process requests consistently.

---

# 44. Horizontal Scaling

Production:

```text
                Load Balancer
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
      Backend      Backend      Backend
      Instance 1   Instance 2   Instance 3
         │           │           │
         └───────────┼───────────┘
                     ▼
                 PostgreSQL
```

The backend can scale horizontally because important state is stored externally.

---

# 45. OPA Scaling

OPA can also scale.

Example:

```text
Authorization Requests
        │
        ▼
   Load Balancer
     │       │
     ▼       ▼
   OPA-1   OPA-2
```

Alternatively, OPA can run close to application instances.

Production topology depends on latency, policy distribution, and operational requirements.

---

# 46. Sidecar OPA Pattern

A possible production architecture:

```text
┌──────────────────────────────┐
│ Application Instance         │
│                              │
│ Governance Backend           │
│       │                      │
│       ▼                      │
│     OPA Sidecar              │
│                              │
└──────────────────────────────┘
```

Benefits:

```text
Low authorization latency

Local policy evaluation

Reduced network dependency
```

Challenges:

```text
Policy synchronization

More containers

Operational complexity
```

For the hackathon, one shared OPA instance is simpler.

---

# 47. Database Scaling

The MVP needs only:

```text
Single PostgreSQL Instance
```

Production may use:

```text
Managed PostgreSQL

Primary + Replicas

Automated Backups

Point-in-Time Recovery

Multi-Zone Deployment
```

Governance data is critical and should be treated as durable enterprise state.

---

# 48. Audit Storage

For the MVP:

```text
Audit Events
      ↓
PostgreSQL
```

Production architecture may separate:

```text
Application Database
```

from:

```text
Security Audit Storage
```

Example:

```text
Governance Backend
       │
       ├────→ PostgreSQL
       │
       └────→ Audit Pipeline
                    │
                    ▼
              Immutable Storage
                    │
                    ▼
                   SIEM
```

---

# 49. Event-Driven Architecture

Production versions could introduce an event bus.

Examples:

```text
Kafka

AWS EventBridge

Google Pub/Sub

RabbitMQ
```

Events:

```text
AgentDisabled

PermissionRevoked

PolicyActivated

ApprovalRequested

ApprovalGranted

AuthorizationDenied

HighRiskActionDetected
```

The MVP does not require an event bus.

---

# 50. Why Events May Be Useful Later

Suppose:

```text
AGT-001
→ DISABLED
```

An event:

```text
AgentDisabled
```

could notify:

```text
Security Monitoring

Agent Runtime

Cache Invalidation

SIEM

Alerting
```

This becomes useful as the platform grows.

---

# 51. Approval Notification Deployment

MVP:

```text
Approval Dashboard
       │
       ▼
GET /approvals?status=PENDING
```

The dashboard can poll the backend.

Production:

```text
Approval Created
      ↓
Event
      ↓
Notification Service
      ↓
Email / Slack / Teams / Mobile
```

Polling is sufficient for the hackathon.

---

# 52. Caching

Some governance data may eventually be cached:

```text
Agent metadata

Tool definitions

Policy metadata
```

But security-sensitive caching requires careful invalidation.

Example:

```text
Agent Permission Cached

Administrator Revokes Permission

Cache still says ALLOW
```

This is dangerous.

For the MVP:

```text
Prefer correctness over aggressive caching.
```

---

# 53. Authorization Cache

Avoid caching final authorization decisions unless the cache key captures all security-relevant context and revocation behavior.

For example:

```text
Principal

Action

Resource

Risk

Approval

Policy Version

Permission Version

Resource State
```

Caching authorization is more complicated than caching normal application data.

Not recommended for the hackathon.

---

# 54. Observability

The deployment should provide visibility into:

```text
Requests

Errors

Authorization Decisions

Risk Decisions

Approval Requests

Tool Executions

Service Health

Latency
```

Three major observability categories:

```text
Logs

Metrics

Traces
```

---

# 55. Logging

Each component should produce structured logs.

Example:

```json
{
  "level": "INFO",
  "event": "AUTHORIZATION_DENIED",
  "requestId": "REQ-1001",
  "agentId": "AGT-001",
  "action": "payment.execute"
}
```

Do not log:

```text
Tokens

Passwords

API Keys

Private Keys

Full sensitive customer data
```

---

# 56. Correlation IDs

Every action should carry:

```text
requestId
```

across:

```text
Agent
 ↓
Gateway
 ↓
Risk
 ↓
Authorization
 ↓
OPA
 ↓
Approval
 ↓
Execution
 ↓
Audit
```

This allows the complete request path to be reconstructed.

---

# 57. Distributed Tracing

Production versions could use:

```text
OpenTelemetry
```

to trace:

```text
POST /actions
     │
     ├── Risk Evaluation
     │
     ├── OPA Evaluation
     │
     ├── Database
     │
     └── Banking API
```

For the hackathon, correlation IDs and structured logging are sufficient.

---

# 58. Metrics

Useful production metrics include:

```text
Total Action Requests

ALLOW Count

DENY Count

Approval Count

Average Authorization Latency

OPA Evaluation Latency

Tool Execution Latency

High-Risk Request Count

Failed Authentication Count

Rate-Limit Count
```

These can eventually power an operations dashboard.

---

# 59. Security Monitoring

Important deployment-level security events:

```text
Repeated Authentication Failures

High DENY Rate

Repeated Unauthorized Tool Attempts

Policy Changes

Permission Changes

Agent Disable Events

Unexpected Payment Activity

OPA Failures

Risk Service Failures
```

Production systems can forward these to a SIEM.

---

# 60. Backup Strategy

Critical data requiring backups:

```text
Agent Configuration

Permissions

Policies

Policy Versions

Approval Records

Authorization History

Audit Events
```

Production PostgreSQL should have:

```text
Automated Backups

Point-in-Time Recovery

Retention Policy

Restore Testing
```

A backup that has never been tested for restoration is not sufficient operational protection.

---

# 61. Disaster Recovery

Production architecture should define:

```text
RPO
=
Recovery Point Objective
```

and:

```text
RTO
=
Recovery Time Objective
```

The exact values depend on enterprise requirements.

For the hackathon, document the concept rather than implementing disaster-recovery infrastructure.

---

# 62. High Availability

Production:

```text
Load Balancer
      │
      ├── Backend Instance A
      │
      └── Backend Instance B

OPA
      │
      ├── Instance A
      │
      └── Instance B

PostgreSQL
      │
      ├── Primary
      │
      └── Standby
```

This prevents a single application instance from becoming the only point of failure.

---

# 63. Important Security Availability Principle

High availability must not weaken authorization.

Bad:

```text
OPA unavailable
      ↓
Fallback:
ALLOW
```

Correct:

```text
OPA unavailable
      ↓
Sensitive action unavailable
```

Security controls fail closed.

---

# 64. Cloud Deployment

The architecture is cloud-neutral.

It can be deployed to:

```text
AWS

Google Cloud

Azure

Private Cloud

On-Premises
```

because core governance logic remains independent from cloud-specific infrastructure.

---

# 65. Simple Hackathon Cloud Deployment

A practical deployment could look like:

```text
Frontend
→ Managed Web Hosting

Backend
→ Container Hosting

OPA
→ Container

PostgreSQL
→ Managed PostgreSQL

Banking Demo
→ Container Hosting
```

The exact provider can be selected based on available hackathon credits and team familiarity.

---

# 66. AWS Production Mapping

Conceptually:

```text
Frontend
→ CloudFront / Amplify / S3

API
→ ALB / API Gateway

Backend
→ ECS / EKS

OPA
→ ECS / EKS

Database
→ RDS PostgreSQL

Secrets
→ Secrets Manager

Logs
→ CloudWatch

Audit
→ S3 / Security tooling

Identity
→ IAM / Cognito / enterprise IdP
```

These are deployment options rather than hard dependencies.

---

# 67. Google Cloud Production Mapping

Conceptually:

```text
Frontend
→ Firebase Hosting / Cloud Storage

Backend
→ Cloud Run / GKE

OPA
→ Cloud Run / GKE

Database
→ Cloud SQL PostgreSQL

Secrets
→ Secret Manager

Logs
→ Cloud Logging

Identity
→ IAM / Identity Platform / enterprise IdP
```

Again, governance logic remains cloud-neutral.

---

# 68. Kubernetes Deployment

A future Kubernetes architecture could use:

```text
Kubernetes Cluster

├── frontend
│
├── governance-backend
│
├── opa
│
└── banking-service
```

External PostgreSQL can use a managed database.

---

# 69. Kubernetes Architecture

```text
                         INTERNET
                            │
                            ▼
                         INGRESS
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
          Frontend                  Governance API
                                         │
                           ┌──────────────┼──────────────┐
                           ▼              ▼              ▼
                          OPA        Banking API      PostgreSQL
```

Only required workloads should be exposed through Ingress.

---

# 70. Kubernetes RBAC

Kubernetes RBAC controls:

```text
Who can interact with Kubernetes resources?
```

Examples:

```text
Deployments

Pods

Secrets

ConfigMaps
```

Our application authorization controls:

```text
Can PaymentAgent execute payment.execute?
```

These are different layers.

```text
Kubernetes RBAC
=
Infrastructure Authorization
```

```text
Governance Policy
=
AI Agent / Business Authorization
```

Both can coexist.

---

# 71. Kubernetes Network Policies

Network policies can enforce:

```text
AI Agent Pod
      X
Banking Service
```

while allowing:

```text
Governance Backend
      ✓
Banking Service
```

This creates infrastructure-level enforcement of the application trust boundary.

---

# 72. Kubernetes Secrets

Production Kubernetes deployments should avoid embedding secrets directly inside:

```text
Deployment YAML

Docker images

Git repositories
```

Use Kubernetes secret mechanisms and preferably integrate with external secret managers.

---

# 73. Container Security

Containers should follow:

```text
Minimal Base Images

Non-root User

Read-only Filesystem where possible

No unnecessary packages

No embedded secrets

Pinned dependencies

Regular image scanning
```

Production CI/CD should scan container images for known vulnerabilities.

---

# 74. CI/CD Architecture

Future pipeline:

```text
Developer
   │
   ▼
Git Repository
   │
   ▼
CI Pipeline
   │
   ├── Unit Tests
   ├── Integration Tests
   ├── Security Checks
   ├── Policy Tests
   ├── Build
   └── Container Scan
   │
   ▼
Artifact Registry
   │
   ▼
Deployment
```

---

# 75. Policy CI/CD

Authorization policies deserve their own validation.

Example:

```text
Policy Change
     ↓
Syntax Validation
     ↓
Policy Unit Tests
     ↓
Security Test Cases
     ↓
Simulation
     ↓
Review
     ↓
Deployment
```

This prevents accidental policy changes from granting excessive authority.

---

# 76. Policy Test Example

Policy change:

```text
PaymentAgent
→ payment.execute
```

Tests might verify:

```text
LOW risk
→ ALLOW

MEDIUM risk without approval
→ REQUIRE_APPROVAL

MEDIUM risk with approval
→ ALLOW

HIGH risk
→ DENY

Disabled agent
→ DENY
```

Policy tests should run before deployment.

---

# 77. Database Migration Deployment

Database changes should use controlled migrations.

Flow:

```text
Schema Change
     ↓
Migration Script
     ↓
Test Environment
     ↓
Validation
     ↓
Production Deployment
```

Avoid uncontrolled schema changes directly in production.

---

# 78. Rolling Deployment

Production application updates can use rolling deployments:

```text
Version 1
Version 1
Version 1

    ↓

Version 2
Version 1
Version 1

    ↓

Version 2
Version 2
Version 1

    ↓

Version 2
Version 2
Version 2
```

This reduces downtime.

API and database changes should remain compatible during rollout.

---

# 79. Rollback Strategy

If a deployment introduces problems:

```text
Version 2
   ↓
Failure
   ↓
Rollback
   ↓
Version 1
```

Policy versions should similarly support controlled rollback.

Example:

```text
Policy v5
→ problematic

Reactivate:
Policy v4
```

The rollback itself must be audited.

---

# 80. Deployment Environments

Recommended:

```text
LOCAL
   ↓
TEST
   ↓
STAGING
   ↓
PRODUCTION
```

For the hackathon:

```text
LOCAL
   ↓
DEMO
```

is sufficient.

However, designing environment separation now prevents hard-coded assumptions.

---

# 81. Demo Environment

The demo environment should contain controlled mock banking data.

Example:

```text
Customers

Accounts

Transactions

Payments

Cards
```

Never use real:

```text
Customer data

Bank credentials

Production APIs

Real payment credentials
```

for a hackathon demonstration.

---

# 82. Demo Scenarios

The deployment should support several clear demonstrations.

### Scenario 1 — Allowed Action

```text
SupportAgent
      ↓
account.read
      ↓
ALLOW
      ↓
Account returned
```

### Scenario 2 — Missing Permission

```text
SupportAgent
      ↓
payment.execute
      ↓
DENY
```

### Scenario 3 — Approval Required

```text
PaymentAgent
      ↓
Medium-risk payment
      ↓
REQUIRE_APPROVAL
      ↓
Human approves
      ↓
Re-authorize
      ↓
ALLOW
      ↓
Execute
```

### Scenario 4 — High-Risk Denial

```text
PaymentAgent
      ↓
High-risk payment
      ↓
DENY
```

### Scenario 5 — Kill Switch

```text
Admin disables PaymentAgent
      ↓
PaymentAgent requests action
      ↓
DENY
```

---

# 83. Failure Demo

A powerful security demonstration would intentionally stop OPA.

Then:

```text
PaymentAgent
      ↓
payment.execute
      ↓
OPA unavailable
      ↓
NO EXECUTION
```

This demonstrates:

```text
Fail-Closed Security
```

rather than only describing it.

---

# 84. Audit Demo

For each scenario, the dashboard should show:

```text
Request

Agent

Action

Risk

Policy Decision

Approval

Execution

Timestamp
```

Example timeline:

```text
10:30:00  ACTION_REQUESTED

10:30:01  RISK_ASSESSED

10:30:01  APPROVAL_REQUIRED

10:31:20  APPROVAL_GRANTED

10:31:21  AUTHORIZATION_ALLOWED

10:31:22  PAYMENT_EXECUTED
```

This makes governance visually understandable.

---

# 85. Recommended Repository Deployment Structure

```text
project/
│
├── apps/
│   ├── frontend/
│   ├── governance-backend/
│   ├── banking-service/
│   └── demo-agent/
│
├── policies/
│   └── opa/
│       ├── authorization.rego
│       └── tests/
│
├── infrastructure/
│   ├── docker/
│   ├── docker-compose.yml
│   └── kubernetes/
│
├── docs/
│   ├── research/
│   └── architecture/
│
├── .env.example
│
└── README.md
```

This separates:

```text
Applications

Policies

Infrastructure

Documentation
```

cleanly.

---

# 86. Docker Compose Architecture

```text
                    HOST MACHINE
                         │
        ┌────────────────┴─────────────────┐
        │                                  │
        ▼                                  ▼
     FRONTEND                          DEMO AGENT
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
              GOVERNANCE BACKEND
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
            OPA    PostgreSQL   BANKING
                               SERVICE
```

This should be the preferred hackathon deployment.

---

# 87. Production Evolution

The architecture can evolve gradually.

### Stage 1

```text
Modular Monolith
+
OPA
+
PostgreSQL
```

### Stage 2

```text
Multiple Backend Instances
+
Managed Database
+
Load Balancer
```

### Stage 3

Extract high-scale components if necessary:

```text
Authorization Service

Risk Service

Audit Pipeline

Approval Service
```

### Stage 4

```text
Kubernetes

Event Bus

Distributed Policy Evaluation

Enterprise IAM

SIEM

Multi-region infrastructure
```

The architecture evolves based on actual scaling and operational requirements.

---

# 88. What Should Not Become a Microservice Yet

Avoid prematurely extracting:

```text
Agent Service

Tool Service

Permission Service

Policy Metadata Service
```

unless there is a concrete reason.

Service boundaries should be driven by:

```text
Independent scaling

Independent deployment

Team ownership

Security isolation

Availability requirements
```

not simply because a module exists.

---

# 89. Availability Model

Runtime dependency chain:

```text
Agent
  ↓
Governance Gateway
  ↓
Database
  ↓
Risk
  ↓
Policy Engine
  ↓
Protected Service
```

A failure in security-critical dependencies should prevent unsafe execution.

Therefore:

```text
Security Availability
>
Action Availability
```

In other words:

> It is better to temporarily reject a payment than to execute one without authorization.

---

# 90. Scaling Model

Potential future bottlenecks:

```text
Governance API

Policy Evaluation

Database

Risk Evaluation

Audit Writes

Protected Service
```

Possible scaling:

```text
Governance API
→ Horizontal scaling

OPA
→ Replicas / sidecars

PostgreSQL
→ Managed scaling / replicas

Audit
→ Event pipeline

Risk
→ Dedicated service

Protected APIs
→ Independent scaling
```

---

# 91. Deployment Security Model

```text
                    INTERNET
                       │
                       ▼
              LOAD BALANCER / API
                       │
                       ▼
            ┌────────────────────┐
            │ GOVERNANCE BACKEND │
            │                    │
            │ Policy Enforcement │
            │ Risk               │
            │ Approval           │
            │ Tool Execution     │
            └──────────┬─────────┘
                       │
              PRIVATE NETWORK
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
      OPA          PostgreSQL      Banking API
       │               │                │
       └───────────────┼────────────────┘
                       │
                 NOT PUBLICLY
                   ACCESSIBLE
```

---

# 92. Full Production Reference Architecture

```text
                              INTERNET
                                  │
                                  ▼
                        ┌─────────────────┐
                        │ WAF / API       │
                        │ Gateway / LB    │
                        └────────┬────────┘
                                 │
               ┌─────────────────┴─────────────────┐
               │                                   │
               ▼                                   ▼
        Governance UI                        Agent Runtime
               │                                   │
               └─────────────────┬─────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   GOVERNANCE BACKEND    │
                    │                         │
                    │ Authentication          │
                    │ Governance APIs         │
                    │ Gateway                 │
                    │ Authorization           │
                    │ Risk                    │
                    │ Approval                │
                    │ Tool Execution          │
                    │ Guardrails              │
                    └────────────┬────────────┘
                                 │
                     PRIVATE SERVICE NETWORK
                                 │
          ┌──────────────────────┼─────────────────────┐
          │                      │                     │
          ▼                      ▼                     ▼
   ┌─────────────┐       ┌─────────────┐       ┌──────────────┐
   │ Policy      │       │ PostgreSQL  │       │ Protected    │
   │ Engine      │       │             │       │ Banking APIs │
   │ OPA/Cedar   │       │ Governance  │       │              │
   └─────────────┘       │ Data        │       └──────────────┘
                         └─────────────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │ Audit / SIEM │
                         └──────────────┘
```

---

# 93. Hackathon Reference Architecture

The actual hackathon deployment should be much simpler:

```text
                     ┌──────────────┐
                     │   FRONTEND   │
                     └──────┬───────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │ GOVERNANCE BACKEND │
                  │                    │
                  │ Modular Monolith   │
                  └─────────┬──────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
           OPA         PostgreSQL     Banking Demo
                                            ▲
                                            │
                                        Protected
                                         Access


                     ┌──────────────┐
                     │  DEMO AGENT  │
                     └──────┬───────┘
                            │
                            ▼
                    Governance Backend
```

Deploy with:

```text
Docker Compose
```

during local development and demonstration.

---

# 94. Recommended Hackathon Stack

A practical implementation could use:

```text
Frontend
→ Next.js + TypeScript

Backend
→ Spring Boot / Node.js / NestJS

Database
→ PostgreSQL

ORM
→ Prisma / JPA depending on backend

Policy Engine
→ Open Policy Agent

Policy Language
→ Rego

AI Integration
→ LLM API

Agent Tool Interface
→ REST initially

Containerization
→ Docker

Local Orchestration
→ Docker Compose

Cloud
→ Optional container deployment
```

The backend framework should primarily be selected based on what the team can build reliably during the hackathon.

---

# 95. MVP Deployment Priorities

Implement in this order:

```text
1. PostgreSQL

        ↓

2. Governance Backend

        ↓

3. Banking Demo Service

        ↓

4. OPA

        ↓

5. Runtime Authorization Flow

        ↓

6. Human Approval

        ↓

7. Audit

        ↓

8. Governance Frontend

        ↓

9. AI Agent Integration

        ↓

10. Docker Compose

        ↓

11. Cloud Deployment if time permits
```

Do not start with Kubernetes.

---

# 96. Why Kubernetes Is Not an MVP Requirement

We researched Kubernetes RBAC because it teaches important authorization concepts.

That does not mean Kubernetes must be used in the hackathon.

Using:

```text
Kubernetes

Helm

Service Mesh

Kafka

Multiple Microservices
```

simply to appear enterprise-grade would increase complexity without improving the core innovation.

The innovation is:

```text
AI Agent
    ↓
Governance
    ↓
Policy-Based Authorization
    ↓
Risk
    ↓
Human Approval
    ↓
Safe Tool Execution
```

The deployment should make that idea easier to demonstrate.

---

# 97. Deployment Decision Summary

| Area           | Hackathon                | Production Evolution                     |
| -------------- | ------------------------ | ---------------------------------------- |
| Backend        | Modular monolith         | Horizontally scaled / selective services |
| Frontend       | Next.js                  | CDN + scalable hosting                   |
| Database       | PostgreSQL               | Managed HA PostgreSQL                    |
| Policy         | Single OPA               | OPA replicas / sidecars                  |
| Deployment     | Docker Compose           | Kubernetes / managed containers          |
| Secrets        | Environment variables    | Secret manager                           |
| Audit          | PostgreSQL               | Immutable audit pipeline / SIEM          |
| Messaging      | Polling/direct calls     | Event-driven architecture                |
| Monitoring     | Structured logs          | Metrics + tracing + SIEM                 |
| Authentication | Simplified secure tokens | OIDC/workload identity                   |
| Networking     | Docker private network   | VPC/private network policies             |
| Approval       | Dashboard                | Enterprise workflow integration          |

---

# 98. Key Deployment Decisions

### Decision 1

Use a:

```text
Modular Monolith
```

for the Governance Backend.

Reason:

```text
Fast development
+
Strong internal boundaries
+
Low operational complexity
```

---

### Decision 2

Deploy OPA independently.

Reason:

```text
Policy evaluation remains external
to application business logic.
```

---

### Decision 3

Keep PostgreSQL private.

Reason:

```text
Governance state is security-sensitive.
```

---

### Decision 4

Keep Banking APIs protected.

Reason:

```text
Agents must not bypass governance.
```

---

### Decision 5

Use Docker Compose for the MVP.

Reason:

```text
Reproducibility
+
Simple local setup
+
Fast demonstration
```

---

### Decision 6

Do not introduce Kubernetes during MVP development.

Reason:

```text
Deployment complexity does not improve
the core governance demonstration.
```

---

### Decision 7

Keep backend instances conceptually stateless.

Reason:

```text
Future horizontal scalability.
```

---

### Decision 8

Fail closed when authorization infrastructure is unavailable.

Reason:

```text
Security correctness
>
Action availability
```

---

# 99. Final Deployment Flow

```text
AI AGENT
    │
    │ HTTPS
    ▼
GOVERNANCE BACKEND
    │
    ├──────── Authenticate Agent
    │
    ├──────── Validate Request
    │
    ├──────── Load Permissions ────────→ PostgreSQL
    │
    ├──────── Evaluate Risk
    │
    ├──────── Evaluate Policy ─────────→ OPA
    │
    │
    ├──── DENY ────────────────────────→ Stop
    │
    ├──── REQUIRE_APPROVAL ────────────→ Human
    │                                      │
    │                               Re-Authorization
    │                                      │
    └──── ALLOW ◄──────────────────────────┘
             │
             ▼
        TOOL EXECUTOR
             │
             │ Trusted Internal Request
             ▼
       BANKING SERVICE
             │
             ▼
          RESULT
             │
             ▼
      OUTPUT GUARDRAILS
             │
             ▼
          AI AGENT

Every important transition
             │
             ▼
         AUDIT LOG
             │
             ▼
         PostgreSQL
```

---

# 100. Core Deployment Principle

The deployment architecture exists to preserve one fundamental security boundary:

```text
AI Agent
    │
    │ UNTRUSTED REQUEST
    ▼
────────────────────────────────
       GOVERNANCE BOUNDARY
────────────────────────────────
    │
    ▼
Identity
    ↓
Permissions
    ↓
Risk
    ↓
Policy
    ↓
Approval
    ↓
Enforcement
    ↓
────────────────────────────────
        PROTECTED BOUNDARY
────────────────────────────────
    │
    ▼
Banking Services
```

The AI agent may be:

```text
Intelligent

Autonomous

LLM-powered

Multi-agent

Tool-using
```

but none of those properties give it direct authority over protected enterprise systems.

The deployment must physically support the same principle established by the logical architecture:

> **Autonomy does not imply authority.**

The recommended hackathon deployment therefore remains:

```text
Next.js Frontend
        │
        ▼
Governance Backend
(Modular Monolith)
        │
        ├──── PostgreSQL
        │
        ├──── OPA
        │
        └──── Banking Demo Service
                 ▲
                 │
          Protected Boundary

AI Agent
   │
   └────────→ Governance Backend
```

This gives us a deployment that is **simple enough to build during a hackathon, strong enough to demonstrate the security model, and structured enough to evolve toward an enterprise architecture later.**
