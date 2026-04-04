# Order Status Update via Topza Webhook — Internal Implementation

This document describes how the backend receives Topza webhook events and
translates them into order status changes in the database.

---

## Overview

When an order is placed through the Topza provider, the order starts at
`pending` and advances through states as Topza processes it. Rather than
polling the Topza API, the backend exposes a public webhook endpoint that
Topza calls whenever the order status changes.

```
Topza Platform
     │
     │  POST /api/topza/webhook
     │  Header: X-Topza-Signature: <hmac-sha256-hex>
     ▼
handleWebhook()  (topzaController.js)
     │
     ├─ 1. Signature verification  (JSON.stringify, not raw bytes)
     ├─ 2. Event type filter
     ├─ 3. Order lookup (externalOrderId primary, orderNumber fallback)
     ├─ 4. Status mapping + field updates
     ├─ 5. statusHistory append
     └─ 6. Persist log  (TopzaWebhookLog)
```

---

## Webhook Endpoint

| Detail          | Value                              |
|-----------------|------------------------------------|
| Route           | `POST /api/topza/webhook`          |
| Auth required   | No (public route, verified by HMAC)|
| Controller      | `exports.handleWebhook`            |
| File            | `backend/src/controllers/topzaController.js` |
| Route file      | `backend/src/routes/topza.js`      |

> The route is registered **before** the `protect + adminOnly` middleware
> block so Topza can reach it without a bearer token.

---

## Step-by-Step Handler Flow

### 1. Body Parsing

The webhook route uses standard `express.json()` — **not** `express.raw()`.
`req.body` is the fully parsed JavaScript object by the time the handler runs.

> **Why not raw bytes?** Topza's delivery worker uses `axios.post(url, payload)`,
> which re-serialises the payload object. The signature was computed from
> `JSON.stringify(payload)` when the job was enqueued — not from a frozen byte
> stream. Capturing raw bytes and hashing them produces a different string and
> the HMAC will never match.

---

### 2. Signature Verification

```
HMAC-SHA256( JSON.stringify(req.body), TOPZA_WEBHOOK_SECRET )  →  lowercase hex
```

The computed hex is compared to the `X-Topza-Signature` request header using
`crypto.timingSafeEqual` (both sides decoded from hex) to prevent timing-based
attacks.

| Condition                                | Response                             |
|------------------------------------------|--------------------------------------|
| `TOPZA_WEBHOOK_SECRET` env var missing   | `200 {received:true, ignored:true, reason:'missing_secret'}` |
| Signature mismatch or absent             | `200 {received:true, ignored:true, reason:'invalid_signature'}` |

Both cases also write a `TopzaWebhookLog` record with `signatureValid: false`.

> Always returns HTTP 200 even on rejection so Topza stops retrying.

---

### 3. Payload Parsing & Event Filter

`payload = req.body` — no additional JSON parsing needed. Only the
`order.status_updated` event is acted upon; any other `event` value results in:

```
200 {received:true, ignored:true, reason:'unsupported_event'}
```

---

### 4. Order Lookup

The handler matches the incoming webhook to an `Order` document using two
identifiers extracted from `payload.data`:

| Field in payload   | Matched against Order field  |
|--------------------|------------------------------|
| `data.orderId`     | `Order.externalOrderId`      |
| `data.orderNumber` | `Order.orderNumber`          |

A single `Order.findOne({ $or: [...] })` is executed — **no `provider` filter**.

> **Why no `provider: 'topza'` filter?**  
> The `provider` field may not be explicitly set on every order (it defaults to
> `'xpresdata'`). Adding that filter causes silent `order_not_found` failures.

> **Why is `data.reference` not used for lookup?**  
> `data.reference` is Topza's upstream VTU provider reference (DataMart /
> Dakazina internal transaction ID) — it is **not** a Paystack reference and
> does not match any of our own fields. Using it for matching would never
> produce a hit and is misleading.

---

### 5. Status Mapping

`mapTopzaStatusToOrderStatus(status)` normalises the raw Topza status string
to one of the four internal values:

| Topza raw status                           | Internal status |
|--------------------------------------------|-----------------|
| `completed`, `success`, `delivered`        | `completed`     |
| `failed`, `error`                          | `failed`        |
| `processing`, `in_progress`, `in-progress` | `processing`    |
| anything else                              | `pending`       |

Comparison is case-insensitive with leading/trailing whitespace stripped.

---

### 6. Order Field Updates

Once the mapped status is known, the following `Order` document fields are
written before calling `order.save()`:

| Field                | Updated to                                               |
|----------------------|----------------------------------------------------------|
| `status`             | Mapped internal status (`pending/processing/completed/failed`) |
| `providerStatus`     | Raw status string from Topza (preserved as-is)           |
| `externalOrderId`    | `data.orderId` (only if not already set)                 |
| `providerMessage`    | Human-readable note quoting the webhook event            |
| `completedAt`        | Set to `data.updatedAt` (or `now`) when `completed`      |
| `completedBy`        | Set to `'system'` when `completed`; `null` otherwise     |
| `paymentStatus`      | Set to `'completed'` when order completes (unless already `failed`) |
| `errorMessage`       | Set on `failed`; cleared to `null` on `completed`        |

---

### 7. Status History Append

`Order.statusHistory` is an array of state-change records. A new entry is
appended only when the mapped status **differs** from the last entry in the
array (deduplication guard):

```json
{
  "status": "completed",
  "updatedAt": "<data.updatedAt or now>",
  "source": "topza_webhook",
  "notes": "Topza status: Completed"
}
```

---

### 8. Webhook Log Persistence

Every webhook request — accepted or rejected — is written to the
`TopzaWebhookLog` collection by `createWebhookLog()`:

| Log field            | Description                                         |
|----------------------|-----------------------------------------------------|
| `event`              | Event type string from payload                      |
| `signatureValid`     | Whether HMAC check passed                           |
| `handled`            | Whether the order was found and updated             |
| `reason`             | Short code explaining the outcome                   |
| `providerStatus`     | Raw Topza status string                             |
| `matchedOrderId`     | ObjectId ref to the `Order` document                |
| `matchedOrderNumber` | Order number string                                 |
| `orderStatusBefore`  | `order.status` value before the update              |
| `orderStatusAfter`   | `order.status` value after the update               |
| `requestMeta`        | `userAgent`, raw `signature` header, `contentType`  |
| `identifiers`        | `orderId`, `orderNumber` from payload               |
| `payload`            | Full parsed JSON payload (mixed type)               |
| `rawBodySnippet`     | First 2 000 chars of re-serialised body             |
| `receivedAt`         | Timestamp the webhook arrived                       |

Admins can query logs at `GET /api/topza/webhook/logs` (paginated, filterable
by `handled`, `signatureValid`, `event`, `reason`).

---

## Outcome Codes (`reason` field)

| Reason code          | What happened                                          |
|----------------------|--------------------------------------------------------|
| `missing_secret`     | `TOPZA_WEBHOOK_SECRET` env var is not set              |
| `invalid_signature`  | HMAC check failed or `X-Topza-Signature` header absent |
| `unsupported_event`  | `event` is not `order.status_updated`                  |
| `missing_identifiers`| Payload has no `orderId` or `orderNumber`              |
| `order_not_found`    | No matching `Order` document in the database           |
| `updated`            | Order was successfully found and status updated        |
| `handler_error`      | Unexpected exception inside the handler                |

---

## Environment Variables

| Variable               | Purpose                                         |
|------------------------|-------------------------------------------------|
| `TOPZA_WEBHOOK_SECRET` | Shared secret used to verify `X-Topza-Signature` |

---

## Admin API Endpoints

| Method   | Path                        | Auth         | Description                  |
|----------|-----------------------------|--------------|------------------------------|
| `POST`   | `/api/topza/webhook`        | None (HMAC)  | Receive Topza webhook events |
| `GET`    | `/api/topza/webhook/logs`   | Admin JWT    | List webhook log entries     |
| `DELETE` | `/api/topza/webhook/logs`   | Admin JWT    | Clear all webhook log entries|

---

## Key Files

| File                                                    | Role                                     |
|---------------------------------------------------------|------------------------------------------|
| `backend/src/controllers/topzaController.js`            | `handleWebhook`, `getWebhookLogs`, `clearWebhookLogs` |
| `backend/src/models/TopzaWebhookLog.js`                 | Mongoose schema for webhook audit logs   |
| `backend/src/models/Order.js`                           | Order document — fields updated by webhook |
| `backend/src/routes/topza.js`                           | Route registration                       |
| `backend/src/server.js`                                 | Middleware setup — uses `express.json()` |

---

## Debugging Checklist

- [ ] **Webhook URL is saved** on the same API key used for order placement (Dashboard → API Keys → Webhook Configuration)
- [ ] **`TOPZA_WEBHOOK_SECRET`** matches the Webhook Secret shown in the dashboard for that key
- [ ] **Endpoint is publicly reachable** (not localhost, not behind VPN/firewall)
- [ ] **`data.orderId` was stored** as `Order.externalOrderId` when the order was placed
- [ ] Check webhook audit logs at `GET /api/topza/webhook/logs` — the `reason` field shows exactly why a delivery was ignored

This document describes how the backend receives Topza webhook events and
translates them into order status changes in the database.

---

## Overview

When an order is placed through the Topza provider, the order starts at
`pending` and advances through states as Topza processes it. Rather than
polling the Topza API, the backend exposes a public webhook endpoint that
Topza calls whenever the order status changes.

```
Topza Platform
     │
     │  POST /api/topza/webhook
     │  Header: X-Topza-Signature: <hmac-sha256-hex>
     ▼
handleWebhook()  (topzaController.js)
     │
     ├─ 1. Signature verification
     ├─ 2. Event type filter
     ├─ 3. Order lookup (multi-identifier)
     ├─ 4. Status mapping + field updates
     ├─ 5. statusHistory append
     └─ 6. Persist log  (TopzaWebhookLog)
```

---

## Webhook Endpoint

| Detail          | Value                              |
|-----------------|------------------------------------|
| Route           | `POST /api/topza/webhook`          |
| Auth required   | No (public route, verified by HMAC)|
| Controller      | `exports.handleWebhook`            |
| File            | `backend/src/controllers/topzaController.js` |
| Route file      | `backend/src/routes/topza.js`      |

> The route is registered **before** the `protect + adminOnly` middleware
> block so Topza can reach it without a bearer token.

---

## Step-by-Step Handler Flow

### 1. Raw Body Extraction

The handler calls `getRawBodyFromRequest(req)` which returns the request body
as a `Buffer`. It checks, in order:

1. `Buffer.isBuffer(req.body)` — set when middleware is configured with a
   `verify` callback that stores raw bytes.
2. `typeof req.body === 'string'` — encodes to UTF-8.
3. Falls back to `JSON.stringify(req.body)` for already-parsed objects.

> Using raw bytes (not a re-serialised object) is critical: any whitespace
> change would invalidate the HMAC.

---

### 2. Signature Verification

```
HMAC-SHA256(rawBody, TOPZA_WEBHOOK_SECRET)  →  lowercase hex
```

The computed hex is compared to the `X-Topza-Signature` request header using
`crypto.timingSafeEqual` to prevent timing-based attacks.

| Condition                                | Response                             |
|------------------------------------------|--------------------------------------|
| `TOPZA_WEBHOOK_SECRET` env var missing   | `200 {received:true, ignored:true, reason:'missing_secret'}` |
| Signature mismatch or absent             | `200 {received:true, ignored:true, reason:'invalid_signature'}` |

Both cases also write a `TopzaWebhookLog` record with `signatureValid: false`.

> Always returns HTTP 200 even on rejection so Topza does not endlessly retry.

---

### 3. Payload Parsing & Event Filter

The raw buffer is parsed as JSON. Only the `order.status_updated` event is
acted upon; any other `event` value results in:

```
200 {received:true, ignored:true, reason:'unsupported_event'}
```

---

### 4. Order Lookup (Multi-Identifier)

The handler extracts three possible identifiers from `payload.data`:

| Field in payload | Matched against Order field          |
|------------------|--------------------------------------|
| `data.orderId`   | `Order.externalOrderId`              |
| `data.orderNumber` | `Order.orderNumber`                |
| `data.reference` | `Order.transactionReference` **or** `Order.paystackReference` |

A single `Order.findOne({ provider: 'topza', $or: [...] })` is executed. If
no order matches, the webhook is logged with `reason: 'order_not_found'` and
ignored.

---

### 5. Status Mapping

`mapTopzaStatusToOrderStatus(status)` normalises the raw Topza status string
to one of the four internal values:

| Topza raw status                        | Internal status |
|-----------------------------------------|-----------------|
| `completed`, `success`                  | `completed`     |
| `failed`, `error`                       | `failed`        |
| `processing`, `in_progress`, `in-progress` | `processing` |
| anything else                           | `pending`       |

Comparison is case-insensitive with leading/trailing whitespace stripped.

---

### 6. Order Field Updates

Once the mapped status is known, the following `Order` document fields are
written before calling `order.save()`:

| Field                | Updated to                                               |
|----------------------|----------------------------------------------------------|
| `status`             | Mapped internal status (`pending/processing/completed/failed`) |
| `providerStatus`     | Raw status string from Topza (preserved as-is)           |
| `externalOrderId`    | `data.orderId` (only if not already set)                 |
| `transactionReference` | `data.reference` (only if currently empty)             |
| `providerMessage`    | Human-readable note quoting the webhook event            |
| `completedAt`        | Set to `data.updatedAt` (or `now`) when `completed`      |
| `completedBy`        | Set to `'system'` when `completed`; `null` otherwise     |
| `paymentStatus`      | Set to `'completed'` when order completes (unless already `failed`) |
| `errorMessage`       | Set on `failed`; cleared to `null` on `completed`        |

---

### 7. Status History Append

`Order.statusHistory` is an array of state-change records. A new entry is
appended only when the mapped status **differs** from the last entry in the
array (deduplication guard):

```json
{
  "status": "completed",
  "updatedAt": "<data.updatedAt or now>",
  "source": "topza_webhook",
  "notes": "Topza status: Completed"
}
```

---

### 8. Webhook Log Persistence

Every webhook request — accepted or rejected — is written to the
`TopzaWebhookLog` collection by `createWebhookLog()`:

| Log field            | Description                                         |
|----------------------|-----------------------------------------------------|
| `event`              | Event type string from payload                      |
| `signatureValid`     | Whether HMAC check passed                           |
| `handled`            | Whether the order was found and updated             |
| `reason`             | Short code explaining the outcome                   |
| `providerStatus`     | Raw Topza status string                             |
| `matchedOrderId`     | ObjectId ref to the `Order` document                |
| `matchedOrderNumber` | Order number string                                 |
| `orderStatusBefore`  | `order.status` value before the update              |
| `orderStatusAfter`   | `order.status` value after the update               |
| `requestMeta`        | `userAgent`, raw `signature` header, `contentType`  |
| `identifiers`        | `orderId`, `orderNumber`, `reference` from payload  |
| `payload`            | Full parsed JSON payload (mixed type)               |
| `rawBodySnippet`     | First 2 000 bytes of the raw request body           |
| `receivedAt`         | Timestamp the webhook arrived                       |

Admins can query logs at `GET /api/topza/webhook/logs` (paginated, filterable
by `handled`, `signatureValid`, `event`, `reason`).

---

## Outcome Codes (`reason` field)

| Reason code          | What happened                                          |
|----------------------|--------------------------------------------------------|
| `missing_secret`     | `TOPZA_WEBHOOK_SECRET` env var is not set              |
| `invalid_signature`  | HMAC check failed or `X-Topza-Signature` header absent |
| `invalid_json`       | Could not parse request body as JSON                   |
| `unsupported_event`  | `event` is not `order.status_updated`                  |
| `missing_identifiers`| Payload has no `orderId`, `orderNumber`, or `reference`|
| `order_not_found`    | No matching `Order` document in the database           |
| `updated`            | Order was successfully found and status updated        |
| `handler_error`      | Unexpected exception inside the handler                |

---

## Environment Variables

| Variable               | Purpose                                         |
|------------------------|-------------------------------------------------|
| `TOPZA_WEBHOOK_SECRET` | Shared secret used to verify `X-Topza-Signature` |

---

## Admin API Endpoints

| Method   | Path                        | Auth         | Description                  |
|----------|-----------------------------|--------------|------------------------------|
| `POST`   | `/api/topza/webhook`        | None (HMAC)  | Receive Topza webhook events |
| `GET`    | `/api/topza/webhook/logs`   | Admin JWT    | List webhook log entries     |
| `DELETE` | `/api/topza/webhook/logs`   | Admin JWT    | Clear all webhook log entries|

---

## Key Files

| File                                                    | Role                                     |
|---------------------------------------------------------|------------------------------------------|
| `backend/src/controllers/topzaController.js`            | `handleWebhook`, `getWebhookLogs`, `clearWebhookLogs` |
| `backend/src/models/TopzaWebhookLog.js`                 | Mongoose schema for webhook audit logs   |
| `backend/src/models/Order.js`                           | Order document — fields updated by webhook |
| `backend/src/routes/topza.js`                           | Route registration                       |
