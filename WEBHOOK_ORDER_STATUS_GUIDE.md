# Tracking Order Status with the Topza Webhook

This guide shows you how to receive real-time order status updates from Topza
on your own server instead of polling the API repeatedly.

---

## How It Works

1. You place an order via `POST /api/v1/orders/buy`.
2. Topza processes the order in the background (status goes `Pending` →
   `Processing` → `Completed` or `Failed`).
3. Every time the status changes, Topza **POSTs a JSON payload** to the webhook
   URL you registered on your API key.

---

## Step 1 — Register Your Webhook URL

1. Log in to your Topza dashboard and go to **API Keys**.
2. Open (or create) the API key you use for purchases.
3. Set the **Webhook URL** field to a publicly reachable endpoint on your
   server, e.g. `https://yoursite.com/webhooks/topza`.
4. **Copy the Webhook Secret** shown on the same page. Store it securely as an
   environment variable — you'll use it to verify requests.

---

## Step 2 — Understand the Payload

Topza sends a `POST` request with `Content-Type: application/json`:

```json
{
  "event": "order.status_updated",
  "data": {
    "orderId": "65ab1234cdef567890123456",
    "orderNumber": "TOP-12345678",
    "status": "Completed",
    "network": "MTN",
    "phoneNumber": "0591234567",
    "dataAmount": "1GB",
    "planName": "1GB Monthly",
    "amount": 15.00,
    "reference": "YOUR_UNIQUE_REF_123",
    "updatedAt": "2024-02-14T10:30:00.000Z"
  },
  "timestamp": 1707906600000
}
```

### Status values

| Status        | Meaning                                       |
|---------------|-----------------------------------------------|
| `Pending`     | Order received, not yet sent to provider      |
| `Processing`  | Sent to provider, awaiting confirmation       |
| `Completed`   | Data delivered successfully                   |
| `Failed`      | Delivery failed                               |

### Important headers sent by Topza

| Header                | Value                              |
|-----------------------|------------------------------------|
| `Content-Type`        | `application/json`                 |
| `User-Agent`          | `Topza-Webhook/1.0`                |
| `X-Topza-Signature`   | HMAC‑SHA256 hex of the raw body, signed with your Webhook Secret |

---

## Step 3 — Verify the Signature

Always verify the `X-Topza-Signature` header before trusting the payload.
This prevents attackers from forging fake status updates.

**Algorithm:** `HMAC-SHA256(rawRequestBody, webhookSecret)` → lowercase hex

> **Important:** use the **raw** request bytes, not `JSON.stringify(req.body)`.
> Reformatting the JSON can change whitespace and break the signature check.

---

## Step 4 — Implement the Receiver

Pick the language/framework you use:

### Node.js (Express)

```javascript
// npm install express crypto
const express = require('express');
const crypto  = require('crypto');
const app     = express();

// Store your Webhook Secret in an environment variable
const WEBHOOK_SECRET = process.env.TOPZA_WEBHOOK_SECRET;

// Capture the raw body so we can verify the signature
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));

app.post('/webhooks/topza', (req, res) => {
  const sig = req.headers['x-topza-signature'];

  // 1. Reject missing signature
  if (!sig) return res.status(401).send('Missing signature');

  // 2. Compute expected signature
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  // 3. Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    console.warn('Invalid webhook signature');
    return res.status(200).end(); // return 200 so Topza stops retrying
  }

  const { event, data } = req.body;

  if (event === 'order.status_updated') {
    if (data.status === 'Completed') {
      console.log(`Order ${data.orderNumber} delivered to ${data.phoneNumber}`);
      // mark order complete in your DB, notify your user, etc.
    } else if (data.status === 'Failed') {
      console.log(`Order ${data.orderNumber} failed — consider refunding`);
      // handle failure
    }
  }

  res.status(200).json({ received: true });
});

app.listen(3000, () => console.log('Webhook receiver listening on port 3000'));
```

---

### Python (Flask)

```python
# pip install flask
import os, hmac, hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = os.environ['TOPZA_WEBHOOK_SECRET'].encode()

@app.route('/webhooks/topza', methods=['POST'])
def topza_webhook():
    sig = request.headers.get('X-Topza-Signature', '')

    # Verify signature
    expected = hmac.new(WEBHOOK_SECRET, request.get_data(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        app.logger.warning('Invalid webhook signature')
        return '', 200  # return 200 so Topza stops retrying

    payload = request.get_json()
    event   = payload.get('event')
    data    = payload.get('data', {})

    if event == 'order.status_updated':
        status = data.get('status')
        order_number = data.get('orderNumber')
        if status == 'Completed':
            print(f'Order {order_number} delivered!')
            # update your DB, notify user, etc.
        elif status == 'Failed':
            print(f'Order {order_number} failed.')
            # handle failure

    return jsonify(received=True), 200

if __name__ == '__main__':
    app.run(port=3000)
```

---

### PHP

```php
<?php
$secret = getenv('TOPZA_WEBHOOK_SECRET');
$sig    = $_SERVER['HTTP_X_TOPZA_SIGNATURE'] ?? '';
$body   = file_get_contents('php://input');

// Verify signature
$expected = hash_hmac('sha256', $body, $secret);
if (!hash_equals($expected, $sig)) {
    error_log('Invalid webhook signature');
    http_response_code(200); // return 200 so Topza stops retrying
    exit;
}

$payload = json_decode($body, true);
$event   = $payload['event'] ?? '';
$data    = $payload['data']  ?? [];

if ($event === 'order.status_updated') {
    $status      = $data['status']      ?? '';
    $orderNumber = $data['orderNumber'] ?? '';

    if ($status === 'Completed') {
        // mark order complete, notify user, etc.
        error_log("Order $orderNumber delivered!");
    } elseif ($status === 'Failed') {
        // handle failure / refund
        error_log("Order $orderNumber failed.");
    }
}

http_response_code(200);
echo json_encode(['received' => true]);
```

---

## Step 5 — Test Locally with a Tunnel

Your webhook URL must be publicly accessible. During development you can
expose your local server using a tunnel tool:

```bash
# Using ngrok (https://ngrok.com)
ngrok http 3000
# Paste the generated https://xxxxx.ngrok.io/webhooks/topza into your API key settings
```

---

## Retry Behaviour

If your endpoint returns **anything other than a 2xx status**, Topza will
retry the delivery a few more times with a short back-off. To prevent
duplicate processing:

- Design your handler to be **idempotent** — check whether you've already
  processed an `orderId` before acting on it.
- Persist a log of processed order IDs in your database.

---

## Quick Reference

| What you need               | Where to find it                      |
|-----------------------------|---------------------------------------|
| Your API key                | Dashboard → API Keys                  |
| Your Webhook Secret         | Dashboard → API Keys → (key details)  |
| Signature header name       | `X-Topza-Signature`                   |
| Signature algorithm         | HMAC-SHA256, lowercase hex            |
| Event name for status change| `order.status_updated`                |
| Order ID field              | `data.orderId`                        |
| Order number field          | `data.orderNumber`                    |
| Status field                | `data.status`                         |
| Base API URL                | `https://api.topzagh.com/api/v1` |

---

## Still Stuck?

Contact Topza support and include:
- Your API key name (not the secret)
- The `orderNumber` of a failing order
- The response your endpoint returned (or any error logs)
