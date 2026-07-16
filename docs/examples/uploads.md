# Uploads Example

This example demonstrates how to upload a file (e.g., a document for an AI agent's knowledge base) using `FormData`.

```javascript
const API_URL = 'http://localhost:5001/api';
const TOKEN = 'your_jwt_token';

async function uploadDocument(fileInput) {
  const formData = new FormData();
  formData.append('document', fileInput.files[0]);
  formData.append('type', 'knowledge_base');

  const response = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    headers: {
      // Note: Do NOT set Content-Type manually when using FormData.
      // The browser will automatically set it to multipart/form-data with the correct boundary.
      'Authorization': `Bearer ${TOKEN}`
    },
    body: formData
  });

  return response.json();
}
```
