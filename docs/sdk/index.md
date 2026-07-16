# JavaScript / TypeScript SDK

We are actively developing official SDKs to simplify interacting with the Birth Voices Hub API.

## Pre-Release SDK Structure

The SDK will wrap standard HTTP requests (e.g., using `fetch` or `axios`) and provide strongly typed interfaces for TypeScript users.

### Installation (Coming Soon)
```bash
npm install @birthvoices/sdk
```

### Initializing the Client

```typescript
import { BirthVoicesClient } from '@birthvoices/sdk';

const client = new BirthVoicesClient({
  apiKey: 'your_api_key_or_jwt',
  baseUrl: 'https://api.birthvoiceshub.com/api', // Optional, defaults to production
});
```

### Example Usage (TypeScript)

#### Fetching Workflows
```typescript
async function fetchWorkflows() {
  try {
    const workflows = await client.workflows.list();
    console.log(workflows.map(wf => wf.name));
  } catch (error) {
    console.error('Failed to fetch workflows:', error);
  }
}
```

#### Executing an Agent
```typescript
async function runAgent(agentId: string, input: string) {
  const result = await client.agents.execute(agentId, { prompt: input });
  console.log(result.output);
}
```

## Features
- **Strong Typing**: Full TypeScript interfaces matching our `openapi.yaml`.
- **Automatic Retries**: Configurable retries for network failures or rate limits (429).
- **Authentication Handling**: Automatic injection of Bearer tokens.
