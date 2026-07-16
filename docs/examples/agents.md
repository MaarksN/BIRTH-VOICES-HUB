# Agents Example

This example demonstrates how to configure and interact with an AI Agent.

```javascript
const API_URL = 'http://localhost:5001/api';
const TOKEN = 'your_jwt_token';

async function createSupportAgent() {
  const payload = {
    name: "Customer Support Bot",
    model: "gemini-1.5-pro",
    configuration: {
      temperature: 0.7,
      systemPrompt: "You are a helpful assistant for a maternal health clinic. Always be empathetic."
    }
  };

  const response = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}
```
