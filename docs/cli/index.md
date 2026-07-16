# Birth Voices CLI

*Note: The CLI is currently in active development and not yet released.*

The Birth Voices CLI (`bv`) is a command-line tool to manage your tenants, workflows, and agents without leaving the terminal.

## Planned Features

- **Tenant Management**: Create, list, and delete tenants.
- **Agent Configuration**: Deploy AI agent configurations from local JSON files.
- **Workflow Sync**: Pull workflows down to local JSON for version control, and push updates.
- **Secret Management**: Inject and rotate Webhook secrets and API keys.

## Planned Usage

### Authentication
```bash
bv login
# Opens a browser to authenticate and stores a secure session locally.
```

### Managing Agents
```bash
# Push a local agent.json config to the active tenant
bv agents push ./agent.json

# List active agents
bv agents ls
```

### Emulating Webhooks Locally
```bash
# Forward webhook events from the cloud to your local machine (ngrok style)
bv webhooks listen --forward-to http://localhost:3000/webhook
```
