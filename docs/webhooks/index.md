# Webhooks Documentation

Birth Voices Hub can push real-time events to your external systems via Webhooks.

## Events

Currently supported events:
- `workflow.completed`: Triggered when a workflow finishes execution.
- `agent.call.ended`: Triggered when a voice interaction concludes.
- `patient.onboarded`: Triggered upon successful patient registration via workflow.

## Payload Structure

All webhooks follow a standard JSON envelope:

```json
{
  "id": "evt_123456",
  "type": "workflow.completed",
  "timestamp": "2024-05-20T10:00:00Z",
  "tenantId": "tnt_789",
  "data": {
    "workflowId": "wf_abc",
    "status": "success",
    "result": { ... }
  }
}
```

## Security & Signatures

To ensure requests originate from Birth Voices Hub, every webhook includes an `x-birthvoices-signature` header.
This is an HMAC-SHA256 hash of the request body signed with your tenant's configured Webhook Secret.

### Verifying the Signature (Node.js)

```javascript
const crypto = require('crypto');

function verifySignature(payloadBody, receivedSignature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payloadBody)
    .digest('hex');

  return hash === receivedSignature;
}
```

## Retries (BullMQ)

If your endpoint returns a non-2xx status code or times out (timeout = 5s), the system will automatically retry delivery.
- **Retry Strategy**: Exponential backoff.
- **Max Retries**: 5 attempts.
- **Failure**: After 5 attempts, the event is moved to a Dead Letter Queue and an alert is logged.
