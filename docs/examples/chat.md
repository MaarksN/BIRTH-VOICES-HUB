# Chat Example

This example demonstrates how to send a message to an AI agent in a specific session context.

```javascript
const API_URL = 'http://localhost:5001/api';
const TOKEN = 'your_jwt_token';

async function sendMessage(sessionId, message) {
  const payload = {
    message,
    context: {}
  };

  const response = await fetch(`${API_URL}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  return response.json(); // Usually returns the Agent's reply
}
```
