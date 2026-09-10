# Webhooks

PwnDoc can notify an external service when an audit is updated. Webhooks are disabled by default and contain only identifiers and change metadata. The receiver can fetch the current audit through the authenticated PwnDoc API.

## Configuration

Set these variables in the root `.env` file before starting PwnDoc:

| Variable | Description | Default |
|---|---|---|
| `PWNDOC_WEBHOOK_URL` | HTTP(S) endpoint that receives events. An empty value disables webhooks. | empty |
| `PWNDOC_WEBHOOK_SECRET` | Shared secret used to sign every request. Required when a URL is configured. | empty |
| `PWNDOC_WEBHOOK_EVENTS` | Comma-separated event allowlist. Use `*` for every supported event. | `audit.updated,audit.state.changed` |
| `PWNDOC_WEBHOOK_TIMEOUT_MS` | Delivery timeout in milliseconds, from 1 to 60000. | `5000` |

Use HTTPS and generate a dedicated high-entropy secret in production. The URL must be reachable from the PwnDoc backend container; `localhost` refers to that container, not to the Docker host.

## Events

### `audit.updated`

Sent after general audit information is saved or audit approvals are changed.

```json
{
  "version": 1,
  "id": "a41005a4-a0d0-4c60-b54a-12d26208a5c4",
  "type": "audit.updated",
  "createdAt": "2026-09-10T12:00:00.000Z",
  "data": {
    "auditId": "68c16d4fd5fc72bb1b7d70c6",
    "actorId": "68c16cce90c9ae7552dd9153",
    "changedFields": ["customFields"]
  }
}
```

The payload intentionally omits audit field values. For example, an integration interested in a custom field can react when `changedFields` contains `customFields`, then fetch the audit and decide whether processing is required. The receiver can ignore events whose `actorId` belongs to its own service account to avoid processing loops.

### `audit.state.changed`

Sent in addition to `audit.updated` when the review state changes between `EDIT`, `REVIEW`, and `APPROVED`.

```json
{
  "version": 1,
  "id": "17b574a2-0bc7-493c-8968-a6319a0bdaef",
  "type": "audit.state.changed",
  "createdAt": "2026-09-10T12:05:00.000Z",
  "data": {
    "auditId": "68c16d4fd5fc72bb1b7d70c6",
    "actorId": "68c16cce90c9ae7552dd9153",
    "previousState": "REVIEW",
    "state": "APPROVED"
  }
}
```

## Request verification

Each request is a JSON `POST` with these headers:

| Header | Value |
|---|---|
| `X-PwnDoc-Event` | Event type |
| `X-PwnDoc-Delivery` | Unique delivery identifier |
| `X-PwnDoc-Signature` | `sha256=` followed by the hexadecimal HMAC-SHA256 of the exact request body |

The receiver should calculate the HMAC with `PWNDOC_WEBHOOK_SECRET`, compare signatures using a constant-time comparison, and keep processed delivery identifiers to prevent duplicate work.

## Delivery behavior

Delivery is asynchronous and never blocks or rolls back an audit update. This first implementation performs one delivery attempt and logs failures in the backend logs. Persistent retries and delivery history are not included yet, so critical integrations should periodically reconcile their state with the PwnDoc API.
