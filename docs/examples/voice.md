# Voice Runtime Example

This example demonstrates how to interact with the Voice Runtime capabilities. (Note: These endpoints typically involve WebSockets or streaming HTTP for real-time interaction, but basic REST control might look like this).

```javascript
const API_URL = 'http://localhost:5001/api';
const TOKEN = 'your_jwt_token';

async function initiateVoiceCall(agentId, phoneNumber) {
  const payload = {
    agentId,
    targetNumber: phoneNumber,
    context: { patientId: "12345" }
  };

  const response = await fetch(`${API_URL}/voice/initiate`, {
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
