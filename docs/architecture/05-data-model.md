# Data Model

## Overview

The data model defines how the Governance Layer stores identities, authorization rules, governance decisions, approvals, and audit information.

Rather than storing only configuration data, the model is designed to capture the complete lifecycle of every authorization request, making the platform highly auditable, extensible, and suitable for financial environments.

The design follows these principles:

* Separation of Identity and Authorization
* Fine-Grained Access Control
* Policy-Based Authorization
* Immutable Audit History
* Future Extensibility
* Normalized Relational Design

The implementation targets PostgreSQL using Spring Data JPA, while remaining database agnostic.

---

# Design Goals

The database should support:

* AI Agent identity management
* Role-Based Access Control (RBAC)
* Policy-driven authorization
* Dynamic spending limits
* Human approval workflows
* Authorization history
* Audit logging
* Future risk analysis
* Policy versioning

---

# Core Domain Model

The Governance Layer consists of the following primary entities.

```text
Identity
--------
Agent
Role
Permission
RolePermission

Authorization
-------------
Policy
AuthorizationRequest
AuthorizationEvent
SpendLimit
ApprovalRequest

Governance
----------
AuditLog
```

The entities are grouped according to their responsibilities rather than technical implementation.

---

# High-Level Entity Relationship

```text
Agent
 │
 ▼
Role
 │
 ▼
RolePermission
 │
 ▼
Permission

Role
 │
 ▼
Policy

Agent
 │
 ▼
AuthorizationRequest
 │
 ├────────► ApprovalRequest
 │
 ├────────► AuthorizationEvent
 │
 └────────► AuditLog

Agent
 │
 ▼
SpendLimit
```

This structure clearly separates configuration data from runtime governance data.

---

# Identity Domain

## Agent

Represents an autonomous AI agent.

Examples:

* Expense Agent
* Fraud Agent
* Compliance Agent
* Loan Agent

### Fields

| Field       | Type      |
| ----------- | --------- |
| id          | UUID      |
| name        | String    |
| description | String    |
| department  | String    |
| status      | Enum      |
| role_id     | UUID      |
| created_at  | Timestamp |
| updated_at  | Timestamp |

### Status

* ACTIVE
* DISABLED
* REVOKED

### Relationships

* Many Agents → One Role
* One Agent → One SpendLimit
* One Agent → Many AuthorizationRequests

---

## Role

Represents a reusable permission group.

Examples:

* Expense Reviewer
* Fraud Investigator
* Compliance Officer

### Fields

| Field       | Type   |
| ----------- | ------ |
| id          | UUID   |
| name        | String |
| description | String |

---

## Permission

Represents one atomic capability.

Examples:

* APPROVE_PAYMENT
* READ_CUSTOMER
* CREATE_LOAN
* FREEZE_ACCOUNT

A permission should always represent one action.

### Fields

| Field       | Type   |
| ----------- | ------ |
| id          | UUID   |
| name        | String |
| description | String |

---

## RolePermission

Maps Roles to Permissions.

### Fields

| Field         | Type |
| ------------- | ---- |
| role_id       | UUID |
| permission_id | UUID |

Composite Key:

(role_id, permission_id)

---

# Authorization Domain

## Policy

Policies define **under what conditions** a permission may be exercised.

Unlike Permissions, Policies contain business rules.

Examples:

* Spending limits
* Business hours
* Department restrictions
* Vendor validation
* Explicit deny rules

### Fields

| Field          | Type      |
| -------------- | --------- |
| id             | UUID      |
| role_id        | UUID      |
| version        | Integer   |
| name           | String    |
| effect         | Enum      |
| action         | String    |
| resource       | String    |
| condition_json | JSONB     |
| enabled        | Boolean   |
| effective_from | Timestamp |
| effective_to   | Timestamp |

### Effects

* ALLOW
* DENY
* REQUIRE_APPROVAL

Policies are versioned instead of overwritten.

---

## AuthorizationRequest

This is the central entity of the Governance Layer.

Every sensitive AI operation creates exactly one AuthorizationRequest.

### Fields

| Field           | Type      |
| --------------- | --------- |
| id              | UUID      |
| agent_id        | UUID      |
| action          | String    |
| resource        | String    |
| amount          | Decimal   |
| context_json    | JSONB     |
| decision        | Enum      |
| decision_reason | String    |
| policy_version  | Integer   |
| created_at      | Timestamp |
| completed_at    | Timestamp |

### Decision

* ALLOW
* DENY
* REQUIRE_APPROVAL

This table provides a complete history of governance decisions.

---

## AuthorizationEvent

Tracks the lifecycle of an AuthorizationRequest.

Instead of recording only the final decision, every important processing step is stored.

### Fields

| Field                    | Type      |
| ------------------------ | --------- |
| id                       | UUID      |
| authorization_request_id | UUID      |
| event_type               | Enum      |
| description              | String    |
| created_at               | Timestamp |

### Event Types

* REQUEST_RECEIVED
* AUTHENTICATED
* POLICY_EVALUATED
* SPEND_VALIDATED
* APPROVAL_REQUESTED
* APPROVED
* DENIED
* EXECUTED

This enables timeline views and simplifies debugging.

---

## SpendLimit

Defines financial constraints for an AI agent.

### Fields

| Field           | Type    |
| --------------- | ------- |
| id              | UUID    |
| agent_id        | UUID    |
| max_transaction | Decimal |
| daily_limit     | Decimal |
| monthly_limit   | Decimal |

---

## ApprovalRequest

Represents requests requiring manual review.

### Fields

| Field                    | Type      |
| ------------------------ | --------- |
| id                       | UUID      |
| authorization_request_id | UUID      |
| approver                 | String    |
| status                   | Enum      |
| reason                   | String    |
| approved_at              | Timestamp |

### Status

* PENDING
* APPROVED
* REJECTED
* EXPIRED

Each approval is linked directly to the AuthorizationRequest rather than the Agent.

---

# Governance Domain

## AuditLog

Stores immutable governance records.

### Fields

| Field                    | Type      |
| ------------------------ | --------- |
| id                       | UUID      |
| authorization_request_id | UUID      |
| agent_id                 | UUID      |
| decision                 | Enum      |
| policy_name              | String    |
| reason                   | String    |
| timestamp                | Timestamp |

Audit logs are append-only and should never be modified.

---

# Relationship Summary

| Relationship                              | Type                  |
| ----------------------------------------- | --------------------- |
| Role → Agent                              | One-to-Many           |
| Role → Policy                             | One-to-Many           |
| Role ↔ Permission                         | Many-to-Many          |
| Agent → SpendLimit                        | One-to-One            |
| Agent → AuthorizationRequest              | One-to-Many           |
| AuthorizationRequest → AuthorizationEvent | One-to-Many           |
| AuthorizationRequest → ApprovalRequest    | One-to-One (optional) |
| AuthorizationRequest → AuditLog           | One-to-One            |

---

# Authorization Data Flow

The database supports the following runtime workflow:

```text
AI Agent
    │
    ▼
AuthorizationRequest
    │
    ▼
Policy Evaluation
    │
    ▼
Spend Validation
    │
    ▼
Approval (Optional)
    │
    ▼
Audit Log
```

Every governance decision can be reconstructed from the stored data.

---

# Database Index Recommendations

Recommended indexes:

| Table                | Index                    |
| -------------------- | ------------------------ |
| Agent                | status                   |
| Agent                | name                     |
| Role                 | name                     |
| Permission           | name                     |
| Policy               | role_id                  |
| Policy               | enabled                  |
| Policy               | version                  |
| AuthorizationRequest | agent_id                 |
| AuthorizationRequest | decision                 |
| AuthorizationRequest | created_at               |
| AuthorizationEvent   | authorization_request_id |
| ApprovalRequest      | status                   |
| AuditLog             | timestamp                |

---

# Future Extensions

The design intentionally leaves room for future enhancements.

Potential entities include:

* Credential
* AgentSession
* RiskAssessment
* Notification
* Organization
* Department
* PolicyHistory
* ApprovalRule

These additions can be introduced without redesigning the existing schema.

---

# Architecture Recommendations

## 1. Make AuthorizationRequest the Core Entity

Every governance decision should revolve around a single AuthorizationRequest.

This simplifies tracing, debugging, analytics, and compliance reporting.

---

## 2. Keep Permissions Atomic

Permissions should represent exactly one capability.

Good examples:

* READ_EXPENSE
* APPROVE_PAYMENT
* CREATE_PAYMENT

Avoid combining multiple responsibilities into a single permission.

---

## 3. Separate Permissions from Policies

Permissions answer:

> **What action is allowed?**

Policies answer:

> **Under what conditions is it allowed?**

Keeping these concerns separate makes authorization easier to understand and maintain.

---

## 4. Version Every Policy

Never overwrite an existing policy.

Create a new version instead.

Benefits include:

* Rollback support
* Historical analysis
* Regulatory compliance
* Easier debugging

---

## 5. Store Dynamic Rules in JSONB

Policy conditions should be stored in `condition_json`.

Example:

```json
{
  "maxAmount": 5000,
  "vendorApproved": true,
  "businessHoursOnly": true,
  "riskScore": "LOW"
}
```

This allows new rule types without changing the database schema.

---

## 6. Treat Audit Logs as Immutable

Audit records should never be updated or deleted.

If additional information is needed, create a new event rather than modifying existing history.

---

## 7. Capture the Entire Authorization Lifecycle

Do not store only the final decision.

Store intermediate events such as:

* Request Received
* Authentication Successful
* Policy Evaluated
* Approval Requested
* Executed

This dramatically improves observability and troubleshooting.

---

## 8. Design for Future Microservices

Use UUID primary keys for every entity.

UUIDs simplify future service decomposition and distributed deployments while avoiding predictable identifiers.

---

# Key Takeaways

* The data model is organized into Identity, Authorization, and Governance domains, making responsibilities clear and reducing coupling.
* AuthorizationRequest is the central entity that captures every governed operation from initiation through final decision.
* Policies are versioned and kept separate from permissions, enabling flexible, context-aware authorization without losing historical state.
* Immutable audit logs, authorization events, and UUID-based entities provide a strong foundation for a secure, production-inspired governance platform that can evolve beyond the hackathon.
