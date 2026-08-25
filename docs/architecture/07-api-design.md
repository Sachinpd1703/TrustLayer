# API Design — TrustLayer Gateway & Razorpay Forwarder

## 1. Overview

This document specifies the REST API endpoints provided by the **TrustLayer Gateway** for AI Buyer Agents, Human Approvers, and Administrative Dashboards.

---

## 2. Endpoints Summary

| Method | Endpoint | Description | Caller |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/agent/propose-payment` | Propose an autonomous payment/order to be gated and executed on Razorpay | AI Buyer Agent |
| `GET` | `/v1/approvals/pending` | List transactions requiring human step-up approval | Admin / Approver |
| `POST` | `/v1/approvals/{id}/decide` | Approve or reject a pending high-value transaction | Admin / Approver |
| `POST` | `/v1/agents/kill-switch` | Instantly revoke/suspend an AI Agent | Admin |
| `GET` | `/v1/audit/logs` | Query tamper-evident audit trail and explainability traces | Compliance Officer |
| `POST` | `/v1/webhooks/razorpay` | Ingest real-time payment capture webhooks from Razorpay | Razorpay Webhook Switch |

---

## 3. Endpoint Specifications

### 3.1 Propose Payment (AI Agent $\rightarrow$ TrustLayer)
* **Endpoint:** `POST /v1/agent/propose-payment`
* **Headers:**
  * `X-Agent-ID: agent_procure_v2`
  * `X-Agent-Signature: ed25519_sig_9f83...`
  * `Content-Type: application/json`

#### Request Body:
```json
{
  "intent": "Purchase annual cloud backup license for engineering team",
  "reasoning_hash": "sha256:7b52009b64fd0a2a49e6d8a939753077792b0554",
  "target_service": "RAZORPAY_ORDERS",
  "order_payload": {
    "amount": 420000,
    "currency": "INR",
    "receipt": "rcpt_backup_2026",
    "notes": {
      "merchant_id": "mid_cloud_storage_01",
      "category": "Cloud_Services"
    }
  }
}
```

#### Response 1: Auto-Allowed (`HTTP 200 OK`)
```json
{
  "status": "EXECUTED",
  "decision": "ALLOW",
  "trustlayer_audit_id": "aud_88fa7b21e0",
  "razorpay_order": {
    "id": "order_RZP10294857",
    "entity": "order",
    "amount": 420000,
    "currency": "INR",
    "receipt": "rcpt_backup_2026",
    "status": "created",
    "created_at": 1771934400
  },
  "policy_evaluation": {
    "matched_policy": "StandardAutonomousPurchasePolicy",
    "spend_limit_check": "PASSED",
    "merchant_whitelist_check": "PASSED",
    "velocity_check": "PASSED"
  }
}
```

#### Response 2: Requires Human Approval (`HTTP 202 Accepted`)
```json
{
  "status": "PENDING_APPROVAL",
  "decision": "REQUIRE_APPROVAL",
  "approval_id": "appr_44bc99a1",
  "trustlayer_audit_id": "aud_88fa7b21e1",
  "reason": "Amount (₹25,000) exceeds autonomous threshold limit (₹5,000)",
  "approval_url": "https://trustlayer.internal/approvals/appr_44bc99a1",
  "expires_at": "2026-08-25T16:00:00Z"
}
```

#### Response 3: Denied (`HTTP 403 Forbidden`)
```json
{
  "status": "BLOCKED",
  "decision": "DENY",
  "trustlayer_audit_id": "aud_88fa7b21e2",
  "error_code": "UNAUTHORIZED_MERCHANT",
  "message": "Merchant ID 'mid_untrusted_crypto' is not on the approved vendor whitelist",
  "policy_evaluation": {
    "merchant_whitelist_check": "FAILED"
  }
}
```

---

### 3.2 Human Approval Decision
* **Endpoint:** `POST /v1/approvals/{id}/decide`
* **Request Body:**
```json
{
  "decision": "APPROVE",
  "approver_id": "admin_user_sachin",
  "approver_signature": "rsa_sig_284792..."
}
```
* **Response (`HTTP 200 OK`):**
```json
{
  "status": "EXECUTED",
  "razorpay_order_id": "order_RZP99887766",
  "executed_at": "2026-08-25T15:45:10Z"
}
```
