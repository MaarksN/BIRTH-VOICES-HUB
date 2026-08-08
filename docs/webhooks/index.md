# Webhooks Documentation

Birth Voices Hub can push real-time events to your external systems via Webhooks.

## Events

Emitted today:
- `agent.call.ended`: a phone call reached a terminal state — answered and finished, or never
  answered at all (busy, no-answer, failed, canceled). Covers both inbound calls and calls placed
  via `POST /api/voice/outbound`.
- `call.completed`: a voice-runtime (non-telephony) session ended.

Planned, not yet emitted: `workflow.completed`, `contact.onboarded`.

## Delivery target

Each event goes to the `callbackUrl` supplied when the call was placed, falling back to the
deployment-wide `WEBHOOK_URL`. If neither is set, the event is dropped (and logged at debug level).

## Payload Structure

All webhooks follow a standard JSON envelope:

```json
{
  "id": "evt_123456",
  "type": "agent.call.ended",
  "timestamp": "2024-05-20T10:00:00Z",
  "tenantId": "tnt_789",
  "data": { }
}
```

### `agent.call.ended` data

```json
{
  "sessionId": "b1f2...",
  "callSid": "CA123...",
  "direction": "outbound",
  "from": "+5511333333333",
  "to": "+5511999998888",
  "status": "no-answer",
  "outcome": "Não atendida",
  "durationSeconds": 0,
  "agentId": "a1b2...",
  "agentName": "Catarina SDR",
  "transcript": [
    { "role": "assistant", "content": "Olá João, tem um minuto?", "timestamp": 1716200000000 }
  ],
  "context": { "leadId": "ckv1234", "name": "João" }
}
```

`status` is the raw provider status; `outcome` is its Portuguese label. `context` is echoed back
verbatim from the `POST /api/voice/outbound` request, which is how the originating system
correlates the result with its own record. On an unanswered call `transcript` is empty and
`durationSeconds` is `0` — the event still fires, so a dialer can record the attempt.

## Security & Signatures

To ensure requests originate from Birth Voices Hub, every webhook includes an `x-birthvoices-signature` header.
This is a hex HMAC-SHA256 of the **raw request body**, keyed by the deployment's
`WEBHOOK_SIGNING_SECRET`. (Per-tenant secrets are not implemented yet — one secret per
deployment.) If that variable is unset, events are sent **unsigned**, with the header absent.

Verify against the raw body bytes, before any JSON parsing and re-serialization: `JSON.parse`
followed by `JSON.stringify` can reorder keys and produce a different string, which will not match.

### Verifying the Signature (Node.js)

```javascript
const crypto = require('crypto');

function verifySignature(rawBody, receivedSignature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = Buffer.from(String(receivedSignature || ''), 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  // Length check first: timingSafeEqual throws on a length mismatch.
  return received.length === expectedBuf.length && crypto.timingSafeEqual(received, expectedBuf);
}
```

## Retries (BullMQ)

If your endpoint returns a non-2xx status code or times out (timeout = 5s), the system will automatically retry delivery.
- **Retry Strategy**: Exponential backoff.
- **Max Retries**: 5 attempts.
- **Failure**: After 5 attempts, the event is moved to a Dead Letter Queue and an alert is logged.
