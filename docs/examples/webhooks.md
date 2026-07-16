# Webhook Receiver Example (Express.js)

This example shows how to set up an endpoint to receive and verify webhooks from Birth Voices Hub.

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

const WEBHOOK_SECRET = 'your_configured_webhook_secret';

// Important: We need the raw body to compute the HMAC signature accurately.
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-birthvoices-signature'];

  if (!signature) {
    return res.status(400).send('Missing signature');
  }

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  // Parse the verified JSON
  const event = JSON.parse(req.body.toString());

  console.log(`Received verified event: ${event.type}`);

  // Handle specific events
  if (event.type === 'workflow.completed') {
    console.log('Workflow result:', event.data.result);
  }

  // Acknowledge receipt immediately (2xx response)
  res.status(200).send('OK');
});

app.listen(3000, () => console.log('Webhook receiver listening on port 3000'));
```
