# Workflows Example

This example demonstrates how to create a workflow with specific nodes and edges defining logic.

```javascript
const API_URL = 'http://localhost:5001/api';
const TOKEN = 'your_jwt_token';

async function defineWorkflow() {
  const payload = {
    name: "Patient Onboarding Workflow",
    description: "Handles initial contact and data collection",
    status: "active",
    nodes: [
      { id: "node-1", type: "trigger", data: { event: "incoming_call" } },
      { id: "node-2", type: "action", data: { task: "collect_info" } }
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2" }
    ]
  };

  const response = await fetch(`${API_URL}/workflows`, {
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
