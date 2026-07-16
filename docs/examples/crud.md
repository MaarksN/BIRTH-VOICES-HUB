# Basic CRUD Operations Example (Node.js/fetch)

This example demonstrates creating, reading, updating, and deleting a Workflow.

```javascript
const API_URL = 'http://localhost:5001/api';
const TOKEN = 'your_jwt_token'; // Obtain this via the Auth endpoint

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

async function createWorkflow(name) {
  const response = await fetch(`${API_URL}/workflows`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, description: 'Created via API' })
  });
  return response.json();
}

async function getWorkflows() {
  const response = await fetch(`${API_URL}/workflows`, { headers });
  return response.json();
}

// ... update and delete would follow similar patterns using PUT/PATCH and DELETE methods.
```
