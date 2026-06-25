import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type {
  AuditLogEntry,
  IntegrationDelivery,
  OrganizationRole,
  PrivacyConsent,
  SessionRecord,
  StoredAgent,
  TelephonyCall,
  User,
} from "../../types";

export type StoredUser = Required<Pick<User, "id" | "name" | "company" | "email" | "brandColor">> & {
  role: OrganizationRole;
  privacyConsent?: PrivacyConsent;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredOrganization = {
  id: string;
  name: string;
  brandColor: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredMembership = {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
};

export type TokenRecord = {
  token: string;
  userId: string;
  expiresAt: string;
};

export type StoredSession = SessionRecord & {
  ownerId: string;
  createdAt: string;
};

export type StoredIntegration = {
  ownerId: string;
  webhook: {
    enabled: boolean;
    url: string;
    secret?: string;
    updatedAt?: string;
    lastDelivery?: IntegrationDelivery;
  };
};

export type StoredTelephonyCall = TelephonyCall & {
  ownerId: string;
};

export type StoredIntegrationDelivery = IntegrationDelivery & {
  ownerId: string;
  createdAt: string;
};

export type Database = {
  users: StoredUser[];
  tokens: TokenRecord[];
  organizations: StoredOrganization[];
  memberships: StoredMembership[];
  agents: Array<StoredAgent & { ownerId: string }>;
  sessions: StoredSession[];
  integrations: StoredIntegration[];
  telephonyCalls: StoredTelephonyCall[];
  integrationDeliveries: StoredIntegrationDelivery[];
  auditLogs: AuditLogEntry[];
};

import { Request } from "express";

export type AuthedRequest = Request & {
  user?: StoredUser;
  data?: Database;
  tenantId?: string;
  role?: OrganizationRole;
  requestId?: string;
};

export const DATA_DIR = process.env.BIRTH_VOICES_DATA_DIR || path.join(process.cwd(), "data");
export const DATA_FILE = path.join(DATA_DIR, "birth-voices.json");
export const DEFAULT_BRAND_COLOR = "#2563eb";
export const PRIVACY_TERMS_VERSION = process.env.PRIVACY_TERMS_VERSION || "2026-06-05";
export const DATA_RETENTION_DAYS = Number(process.env.DATA_RETENTION_DAYS || 365);

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export function errorMessage(error: unknown, fallback = "Erro interno do servidor.") {
  if (error instanceof Error && error.message) return error.message;
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function errorName(error: unknown) {
  return error instanceof Error ? error.name : isRecord(error) && typeof error.name === "string" ? error.name : "";
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export async function loadLocalEnv() {
  const envFile = path.join(process.cwd(), ".env");

  try {
    const raw = await fs.readFile(envFile, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") throw error;
  }
}

export const emptyDatabase = (): Database => ({
  users: [],
  tokens: [],
  organizations: [],
  memberships: [],
  agents: [],
  sessions: [],
  integrations: [],
  telephonyCalls: [],
  integrationDeliveries: [],
  auditLogs: [],
});

export function normalizeRole(value: unknown): OrganizationRole {
  const role = String(value || "").toLowerCase();
  if (["owner", "admin", "operator", "viewer", "suspended"].includes(role)) return role as OrganizationRole;
  return "owner";
}

export function createPasswordHash(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

export function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function requireFields(fields: Record<string, unknown>, required: string[]) {
  const missing = required.filter((field) => !String(fields[field] ?? "").trim());
  if (missing.length) {
    throw new Error(`Campos obrigatórios ausentes: ${missing.join(", ")}`);
  }
}

export function normalizeList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

import { StructuredDraft } from "../../types";

export function normalizeStructuredDraft(value: unknown): StructuredDraft {
  const source = isRecord(value) ? value : {};
  const extracted = Array.isArray(source.extracted)
    ? source.extracted
        .map((item: unknown) => {
          const record = isRecord(item) ? item : {};
          return {
            label: String(record.label || "").trim(),
            value: String(record.value || "").trim(),
          };
        })
        .filter((item) => item.label && item.value)
        .slice(0, 80)
    : [];

  const triggeredRisks = Array.isArray(source.triggeredRisks)
    ? source.triggeredRisks
        .map((risk: unknown) => {
          const record = isRecord(risk) ? risk : {};
          return {
            questionId: record.questionId ? String(record.questionId) : undefined,
            question: String(record.question || "").trim(),
            keyword: String(record.keyword || "").trim(),
            answer: String(record.answer || "").trim(),
            detectedAt: record.detectedAt ? String(record.detectedAt) : new Date().toISOString(),
          };
        })
        .filter((risk) => risk.question && risk.keyword && risk.answer)
        .slice(0, 40)
    : [];

  return {
    extracted,
    triggeredRisks,
    requiredMissing: uniqueStrings(normalizeList(source.requiredMissing)).slice(0, 40),
  };
}

export function publicUser(user: StoredUser): User {
  return {
    id: user.id,
    name: user.name,
    company: user.company,
    role: user.role,
    email: user.email,
    brandColor: user.brandColor,
    organizationId: user.id,
    privacyConsent: user.privacyConsent,
  };
}

export function migrateTenancy(data: Database) {
  const now = new Date().toISOString();
  for (const user of data.users) {
    user.role = normalizeRole(user.role);
    let organization = data.organizations.find((item) => item.id === user.id);
    if (!organization) {
      organization = {
        id: user.id,
        name: user.company,
        brandColor: user.brandColor || DEFAULT_BRAND_COLOR,
        createdAt: user.createdAt || now,
        updatedAt: user.updatedAt || now,
      };
      data.organizations.push(organization);
    }

    const membership = data.memberships.find((item) => item.userId === user.id && item.organizationId === organization.id);
    if (!membership) {
      data.memberships.push({
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: organization.id,
        role: user.role,
        createdAt: user.createdAt || now,
        updatedAt: user.updatedAt || now,
      });
    }
  }
}

export async function readDatabase(): Promise<Database> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const data: Database = {
      ...emptyDatabase(),
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
      organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
      memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
      agents: Array.isArray(parsed.agents) ? parsed.agents : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations : [],
      telephonyCalls: Array.isArray(parsed.telephonyCalls) ? parsed.telephonyCalls : [],
      integrationDeliveries: Array.isArray(parsed.integrationDeliveries) ? parsed.integrationDeliveries : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
    migrateTenancy(data);
    return data;
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") throw error;
    const data = emptyDatabase();
    await writeDatabase(data);
    return data;
  }
}

export async function writeDatabase(data: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, DATA_FILE);
}
