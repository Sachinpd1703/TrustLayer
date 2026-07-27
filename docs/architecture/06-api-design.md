# API Design

## Overview

The Governance Layer exposes RESTful APIs that enable AI agents, administrators, and human approvers to interact with the platform securely.

The APIs are designed around the following principles:

* RESTful resource-oriented design
* Versioned endpoints
* Stateless communication
* JWT-based authentication
* Standardized request and response formats
* Consistent error handling
* Audit-friendly operations

The primary responsibility of the API layer is to expose governance capabilities while hiding internal implementation details.

---

# API Versioning

All endpoints are versioned.

```text id="v7q4l2"
/api/v1/
```

Future breaking changes should be introduced through new versions (for example, `/api/v2/`) without affecting existing clients.

---

# Authentication

All protected endpoints require a valid JWT access token.

Example:

```http id="2zv2ki"
Authorization: Bearer <access_token>
```

Public endpoints:

* Token generation
* Health check

All other endpoints require authentication.

---

# Standard Response Format

Successful responses follow a consistent structure.

```json id="m9yd0m"
{
  "success": true,
  "data": {},
  "timestamp": "2026-07-27T10:30:15Z",
  "requestId": "4d2a8b6d-91c8-4c5f-94f4-a90d2e0a6d7b"
}
```

---

# Standard Error Format

Errors also follow a consistent structure.

```json id="snjbjo"
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Policy explicitly denied the requested action."
  },
  "timestamp": "2026-07-27T10:30:15Z",
  "requestId": "4d2a8b6d-91c8-4c5f-94f4-a90d2e0a6d7b"
}
```

---

# API Categories

The Governance Layer exposes APIs in the following domains:

* Authentication
* Agent Management
* Authorization
* Policy Management
* Spend Limits
* Approval Workflow
* Audit
* Monitoring

---

# 1. Authentication APIs

## Generate Access Token

```http id="hbm5t2"
POST /api/v1/auth/token
```

### Request

```json id="fmkzti"
{
  "clientId": "expense-agent-01",
  "clientSecret": "********"
}
```

### Response

```json id="wqq6b4"
{
  "accessToken": "...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

---

## Revoke Token

```http id="a52rci"
POST /api/v1/auth/revoke
```

Revokes the current access token and prevents further use.

---

# 2. Agent Management APIs

## Register Agent

```http id="17qv0d"
POST /api/v1/agents
```

Registers a new AI agent.

### Request

```json id="tfx6tf"
{
  "name": "Expense Agent",
  "department": "Finance",
  "roleId": "role-finance-expense"
}
```

---

## Get Agent

```http id="gr2duj"
GET /api/v1/agents/{agentId}
```

Returns metadata for the specified agent.

---

## List Agents

```http id="eb0vkn"
GET /api/v1/agents
```

Supports pagination and filtering.

Example:

```text id="g2qph8"
/api/v1/agents?page=0&size=20&status=ACTIVE
```

---

## Update Agent

```http id="k1pkpb"
PUT /api/v1/agents/{agentId}
```

Updates agent metadata.

---

## Disable Agent

```http id="v7yb08"
PATCH /api/v1/agents/{agentId}/status
```

Example Body

```json id="5djlwm"
{
  "status": "DISABLED"
}
```

---

# 3. Authorization APIs (Core API)

The Authorization API is the central endpoint of the Governance Layer.

Every sensitive AI operation must pass through this endpoint before interacting with banking systems.

---

## Evaluate Authorization

```http id="r6v9qo"
POST /api/v1/authorize
```

### Request

```json id="8d85rv"
{
  "agentId": "expense-agent-01",
  "action": "APPROVE_PAYMENT",
  "resource": "Expense:12345",
  "amount": 4200,
  "context": {
    "department": "Finance",
    "vendor": "Vendor-A",
    "businessHours": true
  }
}
```

### Successful Response

```json id="o4kj1m"
{
  "decision": "ALLOW",
  "reason": "Policy matched successfully.",
  "policyVersion": 3,
  "authorizationRequestId": "auth-123456"
}
```

### Approval Required

```json id="5d1vgw"
{
  "decision": "REQUIRE_APPROVAL",
  "reason": "Transaction exceeds approval threshold.",
  "authorizationRequestId": "auth-123456",
  "approvalRequestId": "approval-5678"
}
```

### Denied

```json id="w2dblo"
{
  "decision": "DENY",
  "reason": "Explicit deny policy matched.",
  "authorizationRequestId": "auth-123456"
}
```

---

## Get Authorization Status

```http id="9zk0t5"
GET /api/v1/authorizations/{authorizationRequestId}
```

Returns the current state of an authorization request.

---

# 4. Policy APIs

## Create Policy

```http id="sov63i"
POST /api/v1/policies
```

---

## List Policies

```http id="e1d7dv"
GET /api/v1/policies
```

Supports filtering by:

* Role
* Status
* Version

---

## Update Policy

```http id="6e0r6o"
PUT /api/v1/policies/{policyId}
```

Creates a new version rather than modifying an existing one.

---

## Enable / Disable Policy

```http id="i5mj6z"
PATCH /api/v1/policies/{policyId}/status
```

---

# 5. Spend Limit APIs

## Get Spend Limit

```http id="0ff0rz"
GET /api/v1/spend-limits/{agentId}
```

---

## Update Spend Limit

```http id="bpd0f4"
PUT /api/v1/spend-limits/{agentId}
```

Example

```json id="04mw6w"
{
  "maxTransaction": 5000,
  "dailyLimit": 25000,
  "monthlyLimit": 250000
}
```

---

# 6. Approval Workflow APIs

## List Pending Approvals

```http id="w22yur"
GET /api/v1/approvals
```

Supports:

* Pagination
* Status filter

---

## Get Approval

```http id="v6n1gj"
GET /api/v1/approvals/{approvalId}
```

---

## Approve Request

```http id="3p2xkl"
POST /api/v1/approvals/{approvalId}/approve
```

---

## Reject Request

```http id="k6z7ga"
POST /api/v1/approvals/{approvalId}/reject
```

Example

```json id="d68s3i"
{
  "reason": "Transaction justification insufficient."
}
```

---

# 7. Audit APIs

## Search Audit Logs

```http id="f5h86d"
GET /api/v1/audit
```

Supports filters:

* Agent
* Date
* Decision
* Policy
* Action

---

## Get Audit Entry

```http id="fwm9fw"
GET /api/v1/audit/{auditId}
```

---

# 8. Monitoring APIs

## Dashboard Summary

```http id="3l6v4s"
GET /api/v1/dashboard
```

Returns high-level operational metrics.

---

## Metrics

```http id="ryijql"
GET /api/v1/metrics
```

Example metrics:

* Total Requests
* Authorization Latency
* Failed Requests
* Pending Approvals
* Active Agents

---

# HTTP Status Codes

| Status                    | Meaning                                   |
| ------------------------- | ----------------------------------------- |
| 200 OK                    | Request processed successfully            |
| 201 Created               | Resource created                          |
| 202 Accepted              | Awaiting human approval                   |
| 204 No Content            | Operation completed with no response body |
| 400 Bad Request           | Invalid request                           |
| 401 Unauthorized          | Authentication failed                     |
| 403 Forbidden             | Authorization denied                      |
| 404 Not Found             | Resource not found                        |
| 409 Conflict              | Resource conflict                         |
| 422 Unprocessable Entity  | Business rule validation failed           |
| 500 Internal Server Error | Unexpected server error                   |

---

# Idempotency

Operations that create financial or governance records should support idempotency.

Clients should include an `Idempotency-Key` header for retry-safe operations such as:

* Authorization requests
* Approval actions
* Policy creation

This prevents duplicate processing caused by network retries.

---

# Pagination

Collection endpoints use standard pagination parameters.

Example:

```text id="rmhny6"
/api/v1/audit?page=0&size=25
```

Response includes:

* Current page
* Page size
* Total records
* Total pages

---

# API Security

The API layer follows these security practices:

* JWT authentication
* HTTPS only
* Role-based authorization
* Input validation
* Rate limiting
* Request logging
* Request correlation using `requestId`

---

# OpenAPI Documentation

All APIs should be documented using OpenAPI 3.0.

Documentation should include:

* Request schemas
* Response schemas
* Authentication requirements
* Example payloads
* Error responses

Swagger UI should be available in development environments for testing and exploration.

---

# Architecture Recommendations

## 1. Make `/authorize` the Single Decision Endpoint

Every sensitive operation should be evaluated through a single authorization endpoint rather than exposing multiple specialized decision APIs.

This centralizes governance logic and simplifies future enhancements.

---

## 2. Return Rich Decision Objects

Avoid boolean responses such as:

```json
{
  "allowed": true
}
```

Instead, return structured decisions that include the decision, reason, policy version, and authorization request identifier.

---

## 3. Treat Approval as Asynchronous

If human approval is required:

* Create an AuthorizationRequest
* Return `202 Accepted`
* Provide the `approvalRequestId`
* Allow the client to poll the authorization status or subscribe to updates

This prevents long-running HTTP requests and better models real-world approval workflows.

---

## 4. Keep APIs Resource-Oriented

Design endpoints around business resources (`agents`, `policies`, `approvals`) rather than implementation details.

This improves readability and long-term maintainability.

---

## 5. Use Correlation IDs

Generate a unique `requestId` for every incoming request and include it in:

* API responses
* Audit logs
* Authorization events
* Application logs

This makes tracing a request across the system much easier.

---

## 6. Make APIs Backward Compatible

Avoid breaking existing clients.

Introduce breaking changes through a new API version instead of modifying existing contracts.

---

# Key Takeaways

* The API layer exposes a secure, versioned, and RESTful interface for AI agents, administrators, and approvers.
* The `POST /api/v1/authorize` endpoint is the central entry point for all governed financial actions and returns rich authorization decisions rather than simple allow/deny flags.
* Standardized response formats, idempotent operations, consistent error handling, and asynchronous approval workflows make the APIs suitable for production-inspired financial systems.
* Resource-oriented endpoint design, OpenAPI documentation, and request correlation IDs provide a solid foundation for implementation, testing, and future evolution.
