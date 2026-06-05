CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  brand_color TEXT NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  brand_color TEXT NOT NULL DEFAULT '#2563eb',
  privacy_consent JSONB,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS integrations (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  webhook JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS telephony_calls (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  payload JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS integration_deliveries (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  session_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID,
  action TEXT NOT NULL,
  request_id TEXT,
  metadata JSONB,
  previous_hash TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_organization_id ON agents (organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_created_at ON sessions (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_organization_created_at ON integration_deliveries (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_created_at ON audit_logs (organization_id, created_at DESC);
