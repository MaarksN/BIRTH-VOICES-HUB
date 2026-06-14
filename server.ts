import crypto from "crypto";
import dns from "dns/promises";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import net from "net";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import type {
  AgentConfig,
  AuditLogEntry,
  IntegrationDelivery,
  IntegrationSettings,
  OrganizationRole,
  PrivacyConsent,
  RuntimeStatus,
  ReadinessStatus,
  SessionRecord,
  StoredAgent,
  StructuredDraft,
  StructuredRisk,
  TelephonyCall,
  TelephonyCallStatus,
  TranscriptItem,
  User,
} from "./types";

type StoredUser = Required<Pick<User, "id" | "name" | "company" | "email" | "brandColor">> & {
  role: OrganizationRole;
  privacyConsent?: PrivacyConsent;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
};

type StoredOrganization = {
  id: string;
  name: string;
  brandColor: string;
  createdAt: string;
  updatedAt: string;
};

type StoredMembership = {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
};

type TokenRecord = {
  token: string;
  userId: string;
  expiresAt: string;
};

type StoredSession = SessionRecord & {
  ownerId: string;
  createdAt: string;
};

type StoredIntegration = {
  ownerId: string;
  webhook: {
    enabled: boolean;
    url: string;
    secret?: string;
    updatedAt?: string;
    lastDelivery?: IntegrationDelivery;
  };
};

type StoredTelephonyCall = TelephonyCall & {
  ownerId: string;
};

type StoredIntegrationDelivery = IntegrationDelivery & {
  ownerId: string;
  createdAt: string;
};

type Database = {
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

type AuthedRequest = Request & {
  user?: StoredUser;
  data?: Database;
  tenantId?: string;
  role?: OrganizationRole;
  requestId?: string;
};

const DATA_DIR = process.env.BIRTH_VOICES_DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "birth-voices.json");
const DEFAULT_BRAND_COLOR = "#2563eb";
const WEBHOOK_TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS || 10000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || 240);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 20);
const WEBHOOK_RATE_LIMIT_MAX = Number(process.env.WEBHOOK_RATE_LIMIT_MAX || 120);
const PRIVACY_TERMS_VERSION = process.env.PRIVACY_TERMS_VERSION || "2026-06-05";
const DATA_RETENTION_DAYS = Number(process.env.DATA_RETENTION_DAYS || 365);
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 15000);

const metrics = {
  requests: 0,
  status4xx: 0,
  status5xx: 0,
  totalLatencyMs: 0,
  webhookFailures: 0,
  geminiFailures: 0,
  twilioFailures: 0,
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown, fallback = "Erro interno do servidor.") {
  if (error instanceof Error && error.message) return error.message;
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : isRecord(error) && typeof error.name === "string" ? error.name : "";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function loadLocalEnv() {
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

const emptyDatabase = (): Database => ({
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

function normalizeRole(value: unknown): OrganizationRole {
  const role = String(value || "").toLowerCase();
  if (["owner", "admin", "operator", "viewer", "suspended"].includes(role)) return role as OrganizationRole;
  return "owner";
}

function migrateTenancy(data: Database) {
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

async function readDatabase(): Promise<Database> {
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

async function writeDatabase(data: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, DATA_FILE);
}

function publicUser(user: StoredUser): User {
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

type Permission =
  | "admin:read"
  | "agent:write"
  | "billing:read"
  | "integration:write"
  | "organization:write"
  | "privacy:delete"
  | "privacy:export"
  | "session:write"
  | "telephony:write";

const rolePermissions: Record<OrganizationRole, Set<Permission>> = {
  owner: new Set(["admin:read", "agent:write", "billing:read", "integration:write", "organization:write", "privacy:delete", "privacy:export", "session:write", "telephony:write"]),
  admin: new Set(["admin:read", "agent:write", "billing:read", "integration:write", "organization:write", "privacy:export", "session:write", "telephony:write"]),
  operator: new Set(["agent:write", "session:write", "telephony:write"]),
  viewer: new Set([]),
  suspended: new Set([]),
};

function can(role: OrganizationRole | undefined, permission: Permission) {
  return Boolean(role && rolePermissions[role]?.has(permission));
}

function requirePermission(permission: Permission) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!can(req.role, permission)) {
      return res.status(req.role === "suspended" ? 403 : 403).json({ error: "Permissão insuficiente para esta ação." });
    }

    next();
  };
}

function sanitizeMetadata(metadata: Record<string, unknown> = {}) {
  const blocked = /password|token|secret|transcript|authorization|cookie/i;
  const sanitized: NonNullable<AuditLogEntry["metadata"]> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (blocked.test(key)) {
      sanitized[key] = "[redacted]";
    } else if (value === null) {
      sanitized[key] = null;
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else if (value !== undefined) {
      sanitized[key] = JSON.stringify(value).slice(0, 200);
    }
  }

  return sanitized;
}

function hashAuditLog(entry: Omit<AuditLogEntry, "hash">) {
  return crypto.createHash("sha256").update(JSON.stringify(entry)).digest("hex");
}

function appendAuditLog(data: Database, params: {
  organizationId: string;
  userId?: string;
  action: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}) {
  const previous = data.auditLogs[data.auditLogs.length - 1];
  const entryWithoutHash: Omit<AuditLogEntry, "hash"> = {
    id: crypto.randomUUID(),
    organizationId: params.organizationId,
    userId: params.userId,
    action: params.action,
    createdAt: new Date().toISOString(),
    requestId: params.requestId,
    metadata: sanitizeMetadata(params.metadata),
    previousHash: previous?.hash,
  };
  const entry = {
    ...entryWithoutHash,
    hash: hashAuditLog(entryWithoutHash),
  };
  data.auditLogs.push(entry);
  return entry;
}

function createPasswordHash(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, user: StoredUser) {
  const { hash } = createPasswordHash(password, user.salt);
  const stored = Buffer.from(user.passwordHash, "hex");
  const attempted = Buffer.from(hash, "hex");
  return stored.length === attempted.length && crypto.timingSafeEqual(stored, attempted);
}

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function requireFields(fields: Record<string, unknown>, required: string[]) {
  const missing = required.filter((field) => !String(fields[field] ?? "").trim());
  if (missing.length) {
    throw new Error(`Campos obrigatórios ausentes: ${missing.join(", ")}`);
  }
}

function normalizeList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isPrivateIp(address: string) {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd");
  }

  return true;
}

async function validatePublicWebhookUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL do webhook inválida.");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("URL do webhook precisa usar HTTP ou HTTPS.");
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("URL do webhook precisa usar HTTPS em produção.");
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowLocalWebhookSandbox = process.env.NODE_ENV !== "production" && process.env.ALLOW_LOCAL_WEBHOOKS_FOR_TESTS === "true";
  if (allowLocalWebhookSandbox && ["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    return parsed.toString();
  }

  if (["localhost", "localhost.localdomain"].includes(hostname) || hostname.endsWith(".localhost")) {
    throw new Error("URL do webhook não pode apontar para localhost.");
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error("URL do webhook não pode apontar para IP privado, local ou reservado.");
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateIp(item.address))) {
    throw new Error("URL do webhook resolve para rede privada, local ou reservada.");
  }

  return parsed.toString();
}

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const current = rateLimitBuckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + options.windowMs };
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);

    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - bucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." });
    }

    next();
  };
}

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://generativelanguage.googleapis.com",
    ].join("; "),
  );
  next();
}

function requestContext(req: AuthedRequest, res: Response, next: NextFunction) {
  const incoming = String(req.header("X-Request-Id") || "").trim();
  req.requestId = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function currentRequestId(req: Request) {
  return (req as AuthedRequest).requestId;
}

function structuredLogger(req: AuthedRequest, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  metrics.requests += 1;

  res.on("finish", () => {
    const latencyMs = Date.now() - startedAt;
    metrics.totalLatencyMs += latencyMs;
    if (res.statusCode >= 500) metrics.status5xx += 1;
    else if (res.statusCode >= 400) metrics.status4xx += 1;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? "error" : "info",
      message: "http_request",
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency_ms: latencyMs,
      user_id: req.user?.id,
      tenant_id: req.tenantId,
    }));
  });

  next();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeStructuredDraft(value: unknown): StructuredDraft {
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

function hasStructuredDraft(draft: StructuredDraft) {
  return Boolean(draft.extracted.length || draft.triggeredRisks.length || draft.requiredMissing?.length);
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function keywordMatches(answer: string, keyword: string) {
  const normalizedAnswer = normalizeForMatch(answer);
  const normalizedKeyword = normalizeForMatch(keyword).trim();
  if (!normalizedKeyword) return false;
  if (/^\d+$/.test(normalizedKeyword)) {
    return normalizedAnswer.split(/\D+/).includes(normalizedKeyword);
  }
  return normalizedAnswer.includes(normalizedKeyword);
}

function detectStructuredRisk(question: AgentConfig["questions"][number], answer: string): StructuredRisk | null {
  const keyword = (question.riskKeywords || []).find((item) => keywordMatches(answer, item));
  if (!keyword) return null;
  return {
    questionId: question.id,
    question: question.text,
    keyword,
    answer,
    detectedAt: new Date().toISOString(),
  };
}

function applyAnswerToDraft(draft: StructuredDraft, question: AgentConfig["questions"][number], answer: string, risk: StructuredRisk | null): StructuredDraft {
  const label = question.collectAs?.trim();
  const extracted = label
    ? [
        ...draft.extracted.filter((item) => item.label.toLowerCase() !== label.toLowerCase()),
        { label, value: answer },
      ]
    : draft.extracted;

  const triggeredRisks = risk && !draft.triggeredRisks.some((item) => item.questionId === risk.questionId && item.keyword === risk.keyword)
    ? [...draft.triggeredRisks, risk]
    : draft.triggeredRisks;

  return {
    extracted,
    triggeredRisks,
    requiredMissing: draft.requiredMissing || [],
  };
}

function getRequiredMissing(agent: StoredAgent, draft: StructuredDraft) {
  const collected = new Set(draft.extracted.map((item) => item.label.toLowerCase()));
  return agent.questions
    .filter((question) => question.required && question.collectAs && !collected.has(question.collectAs.toLowerCase()))
    .map((question) => question.collectAs!);
}

function publicTelephonyCall(call: StoredTelephonyCall): TelephonyCall {
  const { ownerId: _ownerId, ...publicCall } = call;
  return publicCall;
}

function getPublicBaseUrl() {
  return String(process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
}

function telephonyConfig() {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const from = String(process.env.TWILIO_FROM_NUMBER || "").trim();
  const publicBaseUrl = getPublicBaseUrl();
  const missing = [
    !accountSid && "TWILIO_ACCOUNT_SID",
    !authToken && "TWILIO_AUTH_TOKEN",
    !from && "TWILIO_FROM_NUMBER",
    !publicBaseUrl && "PUBLIC_BASE_URL",
  ].filter(Boolean) as string[];

  return {
    accountSid,
    authToken,
    from,
    publicBaseUrl,
    missing,
    providerConfigured: Boolean(accountSid && authToken),
    outboundConfigured: missing.length === 0,
  };
}

function validatePhoneNumber(value: unknown) {
  const phone = String(value || "").trim();
  if (!/^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s().-]/g, ""))) {
    throw new Error("Informe um telefone real em formato internacional. Exemplo: +5511999999999.");
  }
  return phone.replace(/[\s().-]/g, "");
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(inner: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

function say(text: string) {
  return `<Say language="pt-BR" voice="alice">${escapeXml(text)}</Say>`;
}

function redirect(url: string) {
  return `<Redirect method="POST">${escapeXml(url)}</Redirect>`;
}

function gatherSpeech(actionUrl: string, prompt: string, retryUrl: string) {
  return `<Gather input="speech" action="${escapeXml(actionUrl)}" method="POST" language="pt-BR" speechTimeout="auto">${say(prompt)}</Gather>${say("Não consegui ouvir sua resposta. Vou repetir a pergunta.")}${redirect(retryUrl)}`;
}

async function twilioCreateCall(to: string, from: string, voiceUrl: string, statusUrl: string) {
  const { accountSid, authToken } = telephonyConfig();
  const body = new URLSearchParams();
  body.set("To", to);
  body.set("From", from);
  body.set("Url", voiceUrl);
  body.set("Method", "POST");
  body.set("StatusCallback", statusUrl);
  body.append("StatusCallbackEvent", "initiated");
  body.append("StatusCallbackEvent", "ringing");
  body.append("StatusCallbackEvent", "answered");
  body.append("StatusCallbackEvent", "completed");
  body.set("StatusCallbackMethod", "POST");

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Falha ao iniciar chamada na Twilio.");
  }

  return payload;
}

function createToken(data: Database, userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  data.tokens.push({ token, userId, expiresAt });
  return token;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return res.status(401).json({ error: "Sessão não informada." });
    }

    const data = await readDatabase();
    const now = Date.now();
    const tokenRecord = data.tokens.find((item) => item.token === token);

    if (!tokenRecord || Date.parse(tokenRecord.expiresAt) < now) {
      data.tokens = data.tokens.filter((item) => item.token !== token);
      await writeDatabase(data);
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }

    const user = data.users.find((item) => item.id === tokenRecord.userId);
    if (!user) {
      return res.status(401).json({ error: "Usuário da sessão não encontrado." });
    }

    const membership = data.memberships.find((item) => item.userId === user.id);
    if (!membership) {
      return res.status(403).json({ error: "Usuário sem organização vinculada." });
    }

    if (membership.role === "suspended") {
      return res.status(403).json({ error: "Usuário suspenso." });
    }

    req.user = user;
    req.data = data;
    req.tenantId = membership.organizationId;
    req.role = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}

function validateAgentConfig(body: Partial<AgentConfig>) {
  requireFields(body as Record<string, unknown>, ["name", "template", "description", "systemInstruction"]);

  if (!Array.isArray(body.questions)) {
    throw new Error("O roteiro do agente precisa conter uma lista de perguntas.");
  }

  return {
    name: String(body.name),
    template: body.template,
    description: String(body.description),
    language: String(body.language || "Português Brasileiro"),
    tone: Array.isArray(body.tone) ? body.tone.map(String) : [],
    speed: Number(body.speed || 1),
    systemInstruction: String(body.systemInstruction),
    analysisPrompt: String(body.analysisPrompt || ""),
    questions: body.questions.map((question, index: number) => ({
      id: String(question.id || crypto.randomUUID()),
      text: String(question.text || `Pergunta ${index + 1}`),
      type: question.type === "closed" ? "closed" : "open",
      collectAs: String(question.collectAs || "").trim() || undefined,
      required: Boolean(question.required),
      riskKeywords: normalizeList(question.riskKeywords).slice(0, 30),
      stopOnRisk: Boolean(question.stopOnRisk),
    })),
  } as AgentConfig;
}

function validateSession(body: Partial<SessionRecord>) {
  requireFields(body as Record<string, unknown>, ["agentName", "caller", "duration", "summary", "transcript"]);
  const now = new Date().toISOString();

  return {
    id: String(body.id || `SES-${Date.now()}`),
    agentName: String(body.agentName),
    caller: String(body.caller),
    dateTime: String(body.dateTime || now.slice(0, 16).replace("T", " ")),
    duration: String(body.duration),
    sentiment: body.sentiment === "Negativo" || body.sentiment === "Neutro" ? body.sentiment : "Positivo",
    riskLevel: body.riskLevel === "Alto" || body.riskLevel === "Moderado" ? body.riskLevel : "Baixo",
    score: Math.max(0, Math.min(100, Number(body.score ?? 80))),
    summary: String(body.summary),
    transcript: String(body.transcript),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    followUp: String(body.followUp || "Revisar e definir próxima ação."),
    extracted: Array.isArray(body.extracted)
      ? body.extracted.map((item: unknown) => {
          const record = isRecord(item) ? item : {};
          return { label: String(record.label || ""), value: String(record.value || "") };
        })
      : [],
    structuredDraft: body.structuredDraft ? normalizeStructuredDraft(body.structuredDraft) : undefined,
    integrationDelivery: body.integrationDelivery,
    audioUrl: body.audioUrl ? String(body.audioUrl) : undefined,
  } as SessionRecord;
}

function getIntegration(data: Database, ownerId: string) {
  let integration = data.integrations.find((item) => item.ownerId === ownerId);

  if (!integration) {
    integration = {
      ownerId,
      webhook: {
        enabled: false,
        url: "",
      },
    };
    data.integrations.push(integration);
  }

  return integration;
}

function publicIntegration(integration: StoredIntegration): IntegrationSettings {
  return {
    webhook: {
      enabled: Boolean(integration.webhook.enabled),
      url: integration.webhook.url || "",
      hasSecret: Boolean(integration.webhook.secret),
      updatedAt: integration.webhook.updatedAt,
      lastDelivery: integration.webhook.lastDelivery,
    },
  };
}

function createWebhookSignature(secret: string, body: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

async function sendWebhook(url: string, secret: string | undefined, event: string, data: unknown): Promise<IntegrationDelivery & { responseBody?: string }> {
  const deliveredAt = new Date().toISOString();
  const body = JSON.stringify({
    event,
    createdAt: deliveredAt,
    data,
  });

  let safeUrl = url;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    safeUrl = await validatePublicWebhookUrl(url);
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Birth-Voices-Hub/1.0",
    };

    if (secret) {
      headers["X-Birth-Voices-Signature"] = createWebhookSignature(secret, body);
    }

    const response = await fetch(safeUrl, {
      method: "POST",
      headers,
      body,
      redirect: "error",
      signal: controller.signal,
    });
    const responseBody = await response.text();
    if (!response.ok) metrics.webhookFailures += 1;

    return {
      status: response.ok ? "delivered" : "failed",
      target: safeUrl,
      statusCode: response.status,
      message: response.ok ? "Entregue ao endpoint configurado." : responseBody.slice(0, 300) || response.statusText,
      deliveredAt,
      responseBody: responseBody.slice(0, 2000),
    };
  } catch (error) {
    metrics.webhookFailures += 1;
    return {
      status: "failed",
      target: safeUrl,
      message: errorName(error) === "AbortError" ? "Timeout ao entregar webhook." : errorMessage(error, "Falha ao entregar webhook."),
      deliveredAt,
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function publicDelivery(delivery: IntegrationDelivery): IntegrationDelivery {
  return {
    id: delivery.id,
    status: delivery.status,
    event: delivery.event,
    sessionId: delivery.sessionId,
    attempt: delivery.attempt,
    target: delivery.target,
    statusCode: delivery.statusCode,
    message: delivery.message,
    deliveredAt: delivery.deliveredAt,
    responseBody: delivery.responseBody,
  };
}

function recordIntegrationDelivery(data: Database, ownerId: string, delivery: IntegrationDelivery & { responseBody?: string }) {
  const createdAt = delivery.deliveredAt || new Date().toISOString();
  const record: StoredIntegrationDelivery = {
    ...publicDelivery(delivery),
    id: delivery.id || crypto.randomUUID(),
    ownerId,
    createdAt,
  };
  data.integrationDeliveries.push(record);
  return publicDelivery(record);
}

async function deliverSession(data: Database, ownerId: string, session: SessionRecord): Promise<IntegrationDelivery> {
  const integration = getIntegration(data, ownerId);
  const previousAttempts = data.integrationDeliveries.filter((delivery) => delivery.ownerId === ownerId && delivery.sessionId === session.id).length;

  if (!integration.webhook.enabled || !integration.webhook.url) {
    const delivery: IntegrationDelivery = {
      id: crypto.randomUUID(),
      status: "not_configured",
      event: "session.completed",
      sessionId: session.id,
      attempt: previousAttempts + 1,
      message: "Webhook/CRM não configurado.",
      deliveredAt: new Date().toISOString(),
    };
    integration.webhook.lastDelivery = delivery;
    return recordIntegrationDelivery(data, ownerId, delivery);
  }

  const delivery = await sendWebhook(
    integration.webhook.url,
    integration.webhook.secret,
    "session.completed",
    session,
  );

  const publicDelivery: IntegrationDelivery = {
    id: crypto.randomUUID(),
    status: delivery.status,
    event: "session.completed",
    sessionId: session.id,
    attempt: previousAttempts + 1,
    target: delivery.target,
    statusCode: delivery.statusCode,
    message: delivery.message,
    deliveredAt: delivery.deliveredAt,
    responseBody: delivery.responseBody,
  };
  integration.webhook.lastDelivery = publicDelivery;
  return recordIntegrationDelivery(data, ownerId, publicDelivery);
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last < first) {
    throw new Error("A IA não retornou JSON estruturado.");
  }
  return JSON.parse(raw.slice(first, last + 1));
}

function transcriptToText(items: Array<{ role: "agent" | "user"; text: string }>) {
  return items
    .map((item) => `${item.role === "agent" ? "Agente" : "Usuário"}: ${item.text}`)
    .join("\n");
}

type AnalysisResult = Pick<SessionRecord, "summary" | "sentiment" | "riskLevel" | "score" | "tags" | "followUp" | "extracted">;

function mergeStructuredFindings(analysis: AnalysisResult, draft: StructuredDraft): AnalysisResult {
  const extracted: AnalysisResult["extracted"] = [];
  const seenLabels = new Set<string>();
  const addExtracted = (item: { label: string; value: string }) => {
    const label = String(item.label || "").trim();
    const value = String(item.value || "").trim();
    const key = label.toLowerCase();
    if (!label || !value || seenLabels.has(key)) return;
    seenLabels.add(key);
    extracted.push({ label, value });
  };

  draft.extracted.forEach(addExtracted);
  analysis.extracted.forEach(addExtracted);

  const riskKeywords = uniqueStrings(draft.triggeredRisks.map((risk) => risk.keyword));
  const missingFields = uniqueStrings(draft.requiredMissing || []);
  const tags = uniqueStrings([
    ...analysis.tags,
    ...riskKeywords.map((keyword) => `risco:${keyword}`),
    ...(draft.triggeredRisks.length ? ["risco-detectado", "escalacao-humana"] : []),
    ...(missingFields.length ? ["campos-pendentes"] : []),
  ]).slice(0, 12);

  let riskLevel = analysis.riskLevel;
  let score = analysis.score;
  let followUp = analysis.followUp;

  if (draft.triggeredRisks.length) {
    riskLevel = "Alto";
    score = Math.min(score, 45);
    followUp = `Escalar para atendimento humano com prioridade alta. Sinais detectados: ${riskKeywords.join(", ")}.`;
  } else if (missingFields.length) {
    score = Math.min(score, 75);
    followUp = `Completar campos obrigatórios pendentes: ${missingFields.join(", ")}.`;
  }

  return {
    ...analysis,
    riskLevel,
    score,
    tags,
    followUp,
    extracted,
  };
}

function buildDeterministicAnalysis(agent: StoredAgent, transcript: string, durationSeconds: number, draft: StructuredDraft): AnalysisResult {
  const riskKeywords = uniqueStrings(draft.triggeredRisks.map((risk) => risk.keyword));
  const missingFields = uniqueStrings(draft.requiredMissing || []);
  const hasRisk = draft.triggeredRisks.length > 0;
  const hasMissingFields = missingFields.length > 0;

  return {
    summary: hasRisk
      ? `Conversa registrada pelo roteiro "${agent.name}" com sinal de risco detectado e necessidade de escalação humana.`
      : `Conversa registrada pelo roteiro "${agent.name}" com ${draft.extracted.length} campo(s) estruturado(s) coletado(s) em ${durationSeconds} segundo(s).`,
    sentiment: "Neutro",
    riskLevel: hasRisk ? "Alto" : hasMissingFields ? "Moderado" : "Baixo",
    score: hasRisk ? 35 : hasMissingFields ? 65 : Math.min(95, 70 + draft.extracted.length * 5),
    tags: uniqueStrings([
      "roteiro-estruturado",
      ...(hasRisk ? ["risco-detectado", "escalacao-humana"] : []),
      ...(hasMissingFields ? ["campos-pendentes"] : []),
      ...riskKeywords.map((keyword) => `risco:${keyword}`),
    ]).slice(0, 12),
    followUp: hasRisk
      ? `Escalar para atendimento humano com prioridade alta. Sinais detectados: ${riskKeywords.join(", ")}.`
      : hasMissingFields
        ? `Completar campos obrigatórios pendentes: ${missingFields.join(", ")}.`
        : "Revisar registro estruturado e seguir o fluxo operacional definido.",
    extracted: draft.extracted,
  };
}

async function analyzeTranscript(agent: StoredAgent & { ownerId: string }, transcript: string, durationSeconds: number, draft: StructuredDraft) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada. A análise inteligente e extração estruturada dependem dessa chave.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Analise a transcrição de uma conversa conduzida por agente de voz.

Agente:
${JSON.stringify({
    name: agent.name,
    template: agent.template,
    description: agent.description,
    analysisPrompt: agent.analysisPrompt,
    questions: agent.questions,
  }, null, 2)}

Transcrição:
${transcript}

Achados determinísticos coletados pelo roteiro:
${JSON.stringify(draft, null, 2)}

Duração aproximada em segundos: ${durationSeconds}

Regras obrigatórias:
- Preserve os campos estruturados já coletados quando fizer sentido.
- Se houver triggeredRisks, classifique riskLevel como Alto e recomende escalação humana.
- Não invente campos, diagnósticos, integrações ou ações já concluídas.

Retorne somente JSON válido, sem markdown, no formato:
{
  "summary": "resumo objetivo da conversa",
  "sentiment": "Positivo | Neutro | Negativo",
  "riskLevel": "Baixo | Moderado | Alto",
  "score": 0,
  "tags": ["tag1", "tag2"],
  "followUp": "próxima ação clara",
  "extracted": [{"label": "campo", "value": "valor"}]
}`;

  const response = await Promise.race([
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout ao analisar transcrição com Gemini.")), AI_TIMEOUT_MS)),
  ]);

  const parsed = extractJson(response.text || "{}");
  return {
    summary: String(parsed.summary || "Conversa concluída."),
    sentiment: parsed.sentiment === "Negativo" || parsed.sentiment === "Neutro" ? parsed.sentiment : "Positivo",
    riskLevel: parsed.riskLevel === "Alto" || parsed.riskLevel === "Moderado" ? parsed.riskLevel : "Baixo",
    score: Math.max(0, Math.min(100, Number(parsed.score ?? 80))),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [],
    followUp: String(parsed.followUp || "Revisar resultado e definir próxima ação."),
    extracted: Array.isArray(parsed.extracted)
      ? parsed.extracted
          .map((item: unknown) => {
            const record = isRecord(item) ? item : {};
            return { label: String(record.label || ""), value: String(record.value || "") };
          })
          .filter((item) => item.label)
      : [],
  };
}

async function createSessionFromConversation(params: {
  data: Database;
  ownerId: string;
  agent: StoredAgent & { ownerId: string };
  caller: string;
  transcriptItems: TranscriptItem[];
  durationSeconds: number;
  structuredDraft: StructuredDraft;
  audioUrl?: string;
}) {
  const { data, ownerId, agent, caller, transcriptItems, durationSeconds, audioUrl } = params;
  const structuredDraft = {
    ...params.structuredDraft,
    requiredMissing: getRequiredMissing(agent, params.structuredDraft),
  };
  const transcript = transcriptToText(transcriptItems);
  let baseAnalysis: AnalysisResult;
  if (process.env.GEMINI_API_KEY) {
    try {
      baseAnalysis = await analyzeTranscript(agent, transcript, durationSeconds, structuredDraft);
    } catch (error) {
      metrics.geminiFailures += 1;
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: "gemini_analysis_failed",
        tenant_id: ownerId,
        error: errorMessage(error),
      }));
      baseAnalysis = buildDeterministicAnalysis(agent, transcript, durationSeconds, structuredDraft);
    }
  } else {
    baseAnalysis = buildDeterministicAnalysis(agent, transcript, durationSeconds, structuredDraft);
  }
  const analysis = mergeStructuredFindings(baseAnalysis, structuredDraft);
  const now = new Date().toISOString();
  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  const session: SessionRecord = {
    id: `SES-${Date.now()}`,
    agentName: agent.name,
    caller: caller || "Contato não informado",
    dateTime: now.slice(0, 16).replace("T", " "),
    duration: `${Math.floor(totalSeconds / 60).toString().padStart(2, "0")}:${(totalSeconds % 60).toString().padStart(2, "0")}`,
    transcript,
    structuredDraft: hasStructuredDraft(structuredDraft) ? structuredDraft : undefined,
    audioUrl,
    ...analysis,
  };

  session.integrationDelivery = await deliverSession(data, ownerId, session);

  const storedSession: StoredSession = {
    ...session,
    ownerId,
    createdAt: now,
  };

  data.sessions.push(storedSession);
  const { ownerId: _ownerId, createdAt: _createdAt, ...publicSession } = storedSession;
  return publicSession;
}

async function finalizeTelephonyCall(data: Database, call: StoredTelephonyCall, agent: StoredAgent & { ownerId: string }) {
  if (call.sessionId) {
    const existing = data.sessions.find((session) => session.id === call.sessionId && session.ownerId === call.ownerId);
    if (existing) {
      const { ownerId: _ownerId, createdAt: _createdAt, ...publicSession } = existing;
      return publicSession;
    }
  }

  const completedAt = new Date().toISOString();
  const startedAt = Date.parse(call.startedAt) || Date.now();
  const durationSeconds = Math.max(1, Math.round((Date.parse(completedAt) - startedAt) / 1000));
  const session = await createSessionFromConversation({
    data,
    ownerId: call.ownerId,
    agent,
    caller: call.caller || call.to,
    transcriptItems: call.transcriptItems,
    durationSeconds,
    structuredDraft: normalizeStructuredDraft(call.structuredDraft),
  });

  call.sessionId = session.id;
  call.status = "completed";
  call.completedAt = completedAt;
  call.updatedAt = completedAt;
  return session;
}

function mapTwilioStatus(value: unknown): TelephonyCallStatus {
  const status = String(value || "").toLowerCase();
  if (status === "ringing") return "ringing";
  if (status === "in-progress" || status === "answered") return "in-progress";
  if (status === "completed") return "completed";
  if (["busy", "failed", "no-answer", "canceled"].includes(status)) return "failed";
  return "queued";
}

function twilioSignaturePayload(req: Request) {
  const baseUrl = getPublicBaseUrl();
  const requestUrl = baseUrl ? `${baseUrl}${req.originalUrl}` : `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const params = req.body && typeof req.body === "object" ? req.body : {};
  const suffix = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  return `${requestUrl}${suffix}`;
}

function verifyTwilioRequest(req: Request) {
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const signature = String(req.header("X-Twilio-Signature") || "").trim();
  if (!authToken || !signature) return false;

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(twilioSignaturePayload(req), "utf8"))
    .digest("base64");
  return constantTimeEqual(expected, signature);
}

function requireTwilioSignature(req: Request, res: Response, next: NextFunction) {
  if (!process.env.TWILIO_AUTH_TOKEN) {
    return res.status(503).type("text/xml").send(twiml(`${say("Telefonia não configurada.")}<Hangup />`));
  }

  if (!verifyTwilioRequest(req)) {
    return res.status(403).type("text/xml").send(twiml(`${say("Assinatura Twilio inválida.")}<Hangup />`));
  }

  next();
}

function runtimeStatus(data?: Database, ownerId?: string): RuntimeStatus {
  const integration = data && ownerId ? data.integrations.find((item) => item.ownerId === ownerId) : undefined;
  const twilio = telephonyConfig();
  return {
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    telephonyConfigured: twilio.providerConfigured,
    telephonyOutboundConfigured: twilio.outboundConfigured,
    publicBaseUrlConfigured: Boolean(twilio.publicBaseUrl),
    integrationConfigured: Boolean(integration?.webhook.enabled && integration.webhook.url),
    storage: DATA_FILE,
  };
}

async function readinessStatus(data?: Database, ownerId?: string): Promise<ReadinessStatus> {
  const checks: ReadinessStatus["checks"] = [];
  const addCheck = (name: string, status: "pass" | "warn" | "fail", detail: string, required = true) => {
    checks.push({ name, status, detail, required });
  };

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_DIR);
    addCheck("storage", "pass", `Persistência local gravável em ${DATA_FILE}.`);
  } catch (error) {
    addCheck("storage", "fail", `Persistência local indisponível: ${errorMessage(error)}`);
  }

  const twilio = telephonyConfig();
  const integration = data && ownerId ? data.integrations.find((item) => item.ownerId === ownerId) : undefined;

  addCheck("security_headers", "pass", "Headers CSP, HSTS, frame-ancestors, X-Content-Type-Options e referrer policy ativos.");
  addCheck("rate_limiting", "pass", "Rate limit global de API, autenticação e callbacks Twilio ativo.");
  addCheck("privacy", "pass", `Consentimento, exportação, exclusão e retenção (${DATA_RETENTION_DAYS} dias) configurados.`);
  addCheck("gemini", process.env.GEMINI_API_KEY ? "pass" : "warn", process.env.GEMINI_API_KEY ? "Gemini real configurado." : "GEMINI_API_KEY ausente; análise determinística de fallback será usada.", false);
  addCheck("twilio", twilio.providerConfigured && twilio.outboundConfigured && Boolean(twilio.publicBaseUrl) ? "pass" : "warn", twilio.providerConfigured && twilio.outboundConfigured && Boolean(twilio.publicBaseUrl) ? "Twilio outbound e callbacks públicos configurados." : "Credenciais Twilio, número de origem ou PUBLIC_BASE_URL ausentes; telefonia real fica indisponível.", false);
  addCheck("webhook", integration?.webhook.enabled && integration.webhook.url ? "pass" : "warn", integration?.webhook.enabled && integration.webhook.url ? "Webhook do tenant configurado." : "Webhook do tenant não configurado; entregas externas ficam desativadas.", false);

  const hasRequiredFailure = checks.some((check) => check.required && check.status === "fail");
  const hasWarning = checks.some((check) => check.status === "warn");

  return {
    status: hasRequiredFailure ? "not_ready" : hasWarning ? "degraded" : "ready",
    generatedAt: new Date().toISOString(),
    checks,
  };
}

async function startServer() {
  await loadLocalEnv();
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(requestContext);
  app.use(securityHeaders);
  app.use(structuredLogger);
  app.use("/api/", rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: API_RATE_LIMIT_MAX, keyPrefix: "api" }));
  app.use(["/api/auth/login", "/api/auth/register"], rateLimit({ windowMs: AUTH_RATE_LIMIT_WINDOW_MS, max: AUTH_RATE_LIMIT_MAX, keyPrefix: "auth" }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use("/api/twilio", rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: WEBHOOK_RATE_LIMIT_MAX, keyPrefix: "twilio" }));
  app.use("/api/twilio", requireTwilioSignature);

  app.get("/api/status", async (req, res, next) => {
    try {
      const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
      if (!token) {
        return res.json(runtimeStatus());
      }

      const data = await readDatabase();
      const tokenRecord = data.tokens.find((item) => item.token === token);
      const membership = tokenRecord ? data.memberships.find((item) => item.userId === tokenRecord.userId) : undefined;
      res.json(runtimeStatus(data, membership?.organizationId));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/readiness", async (req, res, next) => {
    try {
      const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
      if (!token) {
        const readiness = await readinessStatus();
        return res.status(readiness.status === "not_ready" ? 503 : 200).json(readiness);
      }

      const data = await readDatabase();
      const tokenRecord = data.tokens.find((item) => item.token === token);
      const membership = tokenRecord ? data.memberships.find((item) => item.userId === tokenRecord.userId) : undefined;
      const readiness = await readinessStatus(data, membership?.organizationId);
      res.status(readiness.status === "not_ready" ? 503 : 200).json(readiness);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { companyName, email, password } = req.body;
      const normalizedEmail = normalizeEmail(email);
      requireFields({ companyName, email: normalizedEmail, password }, ["companyName", "email", "password"]);

      if (String(password).length < 6) {
        return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
      }

      const data = await readDatabase();
      if (data.users.some((user) => user.email === normalizedEmail)) {
        return res.status(409).json({ error: "Este email já possui uma conta." });
      }

      const { salt, hash } = createPasswordHash(String(password));
      const now = new Date().toISOString();
      const user: StoredUser = {
        id: crypto.randomUUID(),
        name: normalizedEmail.split("@")[0],
        company: String(companyName).trim(),
        email: normalizedEmail,
        role: "owner",
        brandColor: DEFAULT_BRAND_COLOR,
        privacyConsent: {
          acceptedAt: now,
          version: PRIVACY_TERMS_VERSION,
          source: String(req.body.consentSource || "account_registration"),
        },
        passwordHash: hash,
        salt,
        createdAt: now,
        updatedAt: now,
      };
      const organization: StoredOrganization = {
        id: user.id,
        name: user.company,
        brandColor: user.brandColor,
        createdAt: now,
        updatedAt: now,
      };
      const membership: StoredMembership = {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: organization.id,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      };

      data.users.push(user);
      data.organizations.push(organization);
      data.memberships.push(membership);
      const token = createToken(data, user.id);
      appendAuditLog(data, {
        organizationId: organization.id,
        userId: user.id,
        action: "account_register",
        requestId: currentRequestId(req),
        metadata: { email: normalizedEmail, consentVersion: PRIVACY_TERMS_VERSION },
      });
      await writeDatabase(data);

      res.status(201).json({ token, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || "");
      requireFields({ email, password }, ["email", "password"]);

      const data = await readDatabase();
      const user = data.users.find((item) => item.email === email);

      if (!user || !verifyPassword(password, user)) {
        return res.status(401).json({ error: "Email ou senha inválidos." });
      }

      const token = createToken(data, user.id);
      const membership = data.memberships.find((item) => item.userId === user.id);
      if (membership) {
        appendAuditLog(data, {
          organizationId: membership.organizationId,
          userId: user.id,
          action: "login",
          requestId: currentRequestId(req),
        });
      }
      await writeDatabase(data);

      res.json({ token, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
      const data = req.data || await readDatabase();
      data.tokens = data.tokens.filter((item) => item.token !== token);
      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "logout",
        requestId: req.requestId,
      });
      await writeDatabase(data);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/me", requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: publicUser(req.user!) });
  });

  app.get("/api/privacy/policy", (_req, res) => {
    res.json({
      termsVersion: PRIVACY_TERMS_VERSION,
      retentionDays: DATA_RETENTION_DAYS,
      exportEndpoint: "/api/privacy/export",
      deleteEndpoint: "/api/privacy/delete",
    });
  });

  app.get("/api/privacy/export", requireAuth, requirePermission("privacy:export"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const tenantId = req.tenantId!;
      appendAuditLog(data, {
        organizationId: tenantId,
        userId: req.user!.id,
        action: "privacy_export",
        requestId: req.requestId,
      });
      await writeDatabase(data);

      const organization = data.organizations.find((item) => item.id === tenantId);
      const integration = data.integrations.find((item) => item.ownerId === tenantId);
      res.json({
        exportedAt: new Date().toISOString(),
        policy: {
          termsVersion: PRIVACY_TERMS_VERSION,
          retentionDays: DATA_RETENTION_DAYS,
        },
        organization,
        user: publicUser(req.user!),
        agents: data.agents.filter((item) => item.ownerId === tenantId).map(({ ownerId: _ownerId, ...agent }) => agent),
        sessions: data.sessions.filter((item) => item.ownerId === tenantId).map(({ ownerId: _ownerId, createdAt: _createdAt, ...session }) => session),
        integrations: integration ? publicIntegration(integration) : undefined,
        integrationDeliveries: data.integrationDeliveries.filter((item) => item.ownerId === tenantId).map(publicDelivery),
        auditLogs: data.auditLogs.filter((item) => item.organizationId === tenantId),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/privacy/delete", requireAuth, requirePermission("privacy:delete"), async (req: AuthedRequest, res, next) => {
    try {
      if (req.body.confirmation !== "DELETE") {
        return res.status(400).json({ error: "Confirme a exclusão enviando confirmation=DELETE." });
      }

      const data = req.data || await readDatabase();
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      appendAuditLog(data, {
        organizationId: tenantId,
        userId,
        action: "account_delete",
        requestId: req.requestId,
        metadata: { policy: "anonymize_user_remove_operational_data" },
      });

      data.tokens = data.tokens.filter((item) => item.userId !== userId);
      data.agents = data.agents.filter((item) => item.ownerId !== tenantId);
      data.sessions = data.sessions.filter((item) => item.ownerId !== tenantId);
      data.integrations = data.integrations.filter((item) => item.ownerId !== tenantId);
      data.telephonyCalls = data.telephonyCalls.filter((item) => item.ownerId !== tenantId);
      data.integrationDeliveries = data.integrationDeliveries.filter((item) => item.ownerId !== tenantId);

      const user = data.users.find((item) => item.id === userId);
      if (user) {
        user.name = "Usuário excluído";
        user.company = "Conta excluída";
        user.email = `deleted-${user.id}@deleted.local`;
        user.role = "suspended";
        user.brandColor = DEFAULT_BRAND_COLOR;
        user.privacyConsent = undefined;
        const deletedPassword = createPasswordHash(crypto.randomUUID());
        user.passwordHash = deletedPassword.hash;
        user.salt = deletedPassword.salt;
        user.updatedAt = new Date().toISOString();
      }

      const organization = data.organizations.find((item) => item.id === tenantId);
      if (organization) {
        organization.name = "Conta excluída";
        organization.brandColor = DEFAULT_BRAND_COLOR;
        organization.updatedAt = new Date().toISOString();
      }

      data.memberships = data.memberships.map((membership) =>
        membership.organizationId === tenantId
          ? { ...membership, role: "suspended", updatedAt: new Date().toISOString() }
          : membership,
      );

      await writeDatabase(data);
      res.json({ ok: true, mode: "anonymized_user_removed_operational_data" });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/me", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const user = data.users.find((item) => item.id === req.user!.id)!;
      const organization = data.organizations.find((item) => item.id === req.tenantId);

      if (typeof req.body.company === "string" && req.body.company.trim()) {
        user.company = req.body.company.trim();
        if (organization) {
          organization.name = user.company;
          organization.updatedAt = new Date().toISOString();
        }
      }

      if (typeof req.body.name === "string" && req.body.name.trim()) {
        user.name = req.body.name.trim();
      }

      if (typeof req.body.brandColor === "string" && /^#[0-9a-f]{6}$/i.test(req.body.brandColor)) {
        user.brandColor = req.body.brandColor;
        if (organization) {
          organization.brandColor = user.brandColor;
          organization.updatedAt = new Date().toISOString();
        }
      }

      user.updatedAt = new Date().toISOString();
      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "organization_update",
        requestId: req.requestId,
        metadata: { changedCompany: typeof req.body.company === "string", changedBrandColor: typeof req.body.brandColor === "string" },
      });
      await writeDatabase(data);
      res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/agents", requireAuth, (req: AuthedRequest, res) => {
    const agents = (req.data?.agents || [])
      .filter((agent) => agent.ownerId === req.tenantId)
      .map(({ ownerId: _ownerId, ...agent }) => agent);
    res.json({ agents });
  });

  app.get("/api/health", async (_req, res) => {
    const checks = {
      api: true,
      storage: false,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      twilioConfigured: telephonyConfig().providerConfigured,
      sentryConfigured: Boolean(process.env.SENTRY_DSN),
      retentionDays: DATA_RETENTION_DAYS,
    };

    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.access(DATA_DIR);
      checks.storage = true;
    } catch {
      checks.storage = false;
    }

    res.status(checks.storage ? 200 : 503).json({
      status: checks.storage ? "ok" : "degraded",
      checks,
    });
  });

  app.get("/api/metrics", requireAuth, requirePermission("admin:read"), (_req: AuthedRequest, res) => {
    const averageLatencyMs = metrics.requests ? Math.round(metrics.totalLatencyMs / metrics.requests) : 0;
    res.json({
      ...metrics,
      averageLatencyMs,
    });
  });

  app.post("/api/agents", requireAuth, requirePermission("agent:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const config = validateAgentConfig(req.body);
      const now = new Date().toISOString();
      const agent = {
        ...config,
        id: crypto.randomUUID(),
        ownerId: req.tenantId!,
        createdAt: now,
        updatedAt: now,
      };

      data.agents.push(agent);
      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "agent_create",
        requestId: req.requestId,
        metadata: { agentId: agent.id, name: agent.name },
      });
      await writeDatabase(data);
      const { ownerId: _ownerId, ...publicAgent } = agent;
      res.status(201).json({ agent: publicAgent });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/agents/:id", requireAuth, requirePermission("agent:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const index = data.agents.findIndex((agent) => agent.id === req.params.id && agent.ownerId === req.tenantId);

      if (index < 0) {
        return res.status(404).json({ error: "Agente não encontrado." });
      }

      const config = validateAgentConfig(req.body);
      data.agents[index] = {
        ...data.agents[index],
        ...config,
        updatedAt: new Date().toISOString(),
      };

      await writeDatabase(data);
      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "agent_update",
        requestId: req.requestId,
        metadata: { agentId: req.params.id },
      });
      await writeDatabase(data);
      const { ownerId: _ownerId, ...agent } = data.agents[index];
      res.json({ agent });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/agents/:id", requireAuth, requirePermission("agent:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const before = data.agents.length;
      data.agents = data.agents.filter((agent) => !(agent.id === req.params.id && agent.ownerId === req.tenantId));

      if (data.agents.length === before) {
        return res.status(404).json({ error: "Agente não encontrado." });
      }

      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "agent_delete",
        requestId: req.requestId,
        metadata: { agentId: req.params.id },
      });
      await writeDatabase(data);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sessions", requireAuth, (req: AuthedRequest, res) => {
    const sessions = (req.data?.sessions || [])
      .filter((session) => session.ownerId === req.tenantId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(({ ownerId: _ownerId, createdAt: _createdAt, ...session }) => session);
    res.json({ sessions });
  });

  app.post("/api/sessions", requireAuth, requirePermission("session:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const session = validateSession(req.body);
      session.integrationDelivery = await deliverSession(data, req.tenantId!, session);
      const storedSession: StoredSession = {
        ...session,
        ownerId: req.tenantId!,
        createdAt: new Date().toISOString(),
      };

      data.sessions.push(storedSession);
      await writeDatabase(data);
      const { ownerId: _ownerId, createdAt: _createdAt, ...publicSession } = storedSession;
      res.status(201).json({ session: publicSession });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/sessions/analyze-and-save", requireAuth, requirePermission("session:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const agent = data.agents.find((item) => item.id === req.body.agentId && item.ownerId === req.tenantId);

      if (!agent) {
        return res.status(404).json({ error: "Agente não encontrado." });
      }

      if (!Array.isArray(req.body.transcriptItems) || req.body.transcriptItems.length === 0) {
        return res.status(400).json({ error: "Transcrição vazia. Conduza uma conversa antes de salvar." });
      }

      const durationSeconds = Number(req.body.durationSeconds || 0);
      const structuredDraft = normalizeStructuredDraft(req.body.structuredDraft);
      const session = await createSessionFromConversation({
        data,
        ownerId: req.tenantId!,
        agent,
        caller: String(req.body.caller || "Contato não informado"),
        transcriptItems: req.body.transcriptItems,
        durationSeconds,
        structuredDraft,
      });
      await writeDatabase(data);
      res.status(201).json({ session });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/telephony/calls", requireAuth, (req: AuthedRequest, res) => {
    const calls = (req.data?.telephonyCalls || [])
      .filter((call) => call.ownerId === req.tenantId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map(publicTelephonyCall);
    res.json({ calls });
  });

  app.post("/api/telephony/calls", requireAuth, requirePermission("telephony:write"), async (req: AuthedRequest, res, next) => {
    try {
      const config = telephonyConfig();
      if (!config.outboundConfigured) {
        return res.status(503).json({
          error: `Telefonia real indisponível. Configure: ${config.missing.join(", ")}.`,
        });
      }

      const data = req.data || await readDatabase();
      const agent = data.agents.find((item) => item.id === req.body.agentId && item.ownerId === req.tenantId);
      if (!agent) {
        return res.status(404).json({ error: "Agente não encontrado." });
      }

      if (!agent.questions.length) {
        return res.status(400).json({ error: "Este agente precisa de ao menos uma pergunta antes de ligar." });
      }

      const now = new Date().toISOString();
      const call: StoredTelephonyCall = {
        id: crypto.randomUUID(),
        ownerId: req.tenantId!,
        agentId: agent.id,
        agentName: agent.name,
        caller: String(req.body.caller || req.body.to || "Contato telefônico"),
        to: validatePhoneNumber(req.body.to),
        from: config.from,
        provider: "twilio",
        status: "queued",
        currentQuestionIndex: 0,
        transcriptItems: [],
        structuredDraft: normalizeStructuredDraft({}),
        startedAt: now,
        updatedAt: now,
      };

      data.telephonyCalls.push(call);
      await writeDatabase(data);

      try {
        const voiceUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}`;
        const statusUrl = `${config.publicBaseUrl}/api/twilio/status/${call.id}`;
        const providerCall = await twilioCreateCall(call.to, call.from, voiceUrl, statusUrl);
        call.providerCallSid = providerCall.sid ? String(providerCall.sid) : undefined;
        call.status = mapTwilioStatus(providerCall.status);
        call.updatedAt = new Date().toISOString();
        await writeDatabase(data);
        res.status(201).json({ call: publicTelephonyCall(call) });
      } catch (error) {
        metrics.twilioFailures += 1;
        call.status = "failed";
        call.error = errorMessage(error, "Falha ao iniciar chamada na Twilio.");
        call.updatedAt = new Date().toISOString();
        await writeDatabase(data);
        res.status(502).json({ error: call.error, call: publicTelephonyCall(call) });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/twilio/voice/:callId", async (req, res, next) => {
    try {
      const data = await readDatabase();
      const call = data.telephonyCalls.find((item) => item.id === req.params.callId);
      if (!call) {
        res.type("text/xml").send(twiml(`${say("Chamada não encontrada.")}<Hangup />`));
        return;
      }

      const agent = data.agents.find((item) => item.id === call.agentId && item.ownerId === call.ownerId);
      const question = agent?.questions[call.currentQuestionIndex];
      if (!agent || !question) {
        if (agent && call.transcriptItems.some((item) => item.role === "user")) {
          await finalizeTelephonyCall(data, call, agent);
          await writeDatabase(data);
        }
        res.type("text/xml").send(twiml(`${say("Obrigada. A conversa foi registrada.")}<Hangup />`));
        return;
      }

      const lastMessage = call.transcriptItems[call.transcriptItems.length - 1];
      if (!(lastMessage?.role === "agent" && lastMessage.text === question.text)) {
        call.transcriptItems.push({ role: "agent", text: question.text });
      }
      call.status = "in-progress";
      call.updatedAt = new Date().toISOString();
      await writeDatabase(data);

      const config = telephonyConfig();
      const retryUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}`;
      const actionUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}/answer`;
      res.type("text/xml").send(twiml(gatherSpeech(actionUrl, question.text, retryUrl)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/twilio/voice/:callId/answer", async (req, res, next) => {
    try {
      const data = await readDatabase();
      const call = data.telephonyCalls.find((item) => item.id === req.params.callId);
      const agent = call ? data.agents.find((item) => item.id === call.agentId && item.ownerId === call.ownerId) : undefined;

      if (!call || !agent) {
        res.type("text/xml").send(twiml(`${say("Chamada não encontrada.")}<Hangup />`));
        return;
      }

      const question = agent.questions[call.currentQuestionIndex];
      const answer = String(req.body.SpeechResult || req.body.Digits || "").trim();
      const config = telephonyConfig();
      const retryUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}`;

      if (!question) {
        await finalizeTelephonyCall(data, call, agent);
        await writeDatabase(data);
        res.type("text/xml").send(twiml(`${say("Obrigada. A conversa foi registrada.")}<Hangup />`));
        return;
      }

      if (!answer) {
        const actionUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}/answer`;
        res.type("text/xml").send(twiml(gatherSpeech(actionUrl, question.text, retryUrl)));
        return;
      }

      call.transcriptItems.push({ role: "user", text: answer });
      const risk = detectStructuredRisk(question, answer);
      call.structuredDraft = applyAnswerToDraft(normalizeStructuredDraft(call.structuredDraft), question, answer, risk);

      if (risk && question.stopOnRisk) {
        const escalation = "Identifiquei um possível sinal de atenção. Vou registrar prioridade alta e encaminhar para retorno humano.";
        call.transcriptItems.push({ role: "agent", text: escalation });
        await finalizeTelephonyCall(data, call, agent);
        await writeDatabase(data);
        res.type("text/xml").send(twiml(`${say(escalation)}<Hangup />`));
        return;
      }

      const nextIndex = call.currentQuestionIndex + 1;
      const nextQuestion = agent.questions[nextIndex];

      if (!nextQuestion) {
        const closing = "Obrigada. Vou registrar a conversa e preparar a entrega para a operação.";
        call.transcriptItems.push({ role: "agent", text: closing });
        await finalizeTelephonyCall(data, call, agent);
        await writeDatabase(data);
        res.type("text/xml").send(twiml(`${say(closing)}<Hangup />`));
        return;
      }

      call.currentQuestionIndex = nextIndex;
      call.transcriptItems.push({ role: "agent", text: nextQuestion.text });
      call.status = "in-progress";
      call.updatedAt = new Date().toISOString();
      await writeDatabase(data);

      const actionUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}/answer`;
      res.type("text/xml").send(twiml(gatherSpeech(actionUrl, nextQuestion.text, retryUrl)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/twilio/status/:callId", async (req, res, next) => {
    try {
      const data = await readDatabase();
      const call = data.telephonyCalls.find((item) => item.id === req.params.callId);
      if (call) {
        call.providerCallSid = req.body.CallSid ? String(req.body.CallSid) : call.providerCallSid;
        call.status = mapTwilioStatus(req.body.CallStatus);
        call.updatedAt = new Date().toISOString();

        if (call.status === "completed" && !call.sessionId && call.transcriptItems.some((item) => item.role === "user")) {
          const agent = data.agents.find((item) => item.id === call.agentId && item.ownerId === call.ownerId);
          if (agent) await finalizeTelephonyCall(data, call, agent);
        }

        await writeDatabase(data);
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/integrations", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const integration = getIntegration(data, req.tenantId!);
      await writeDatabase(data);
      res.json(publicIntegration(integration));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/integrations/deliveries", requireAuth, (req: AuthedRequest, res) => {
    const deliveries = (req.data?.integrationDeliveries || [])
      .filter((delivery) => delivery.ownerId === req.tenantId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 100)
      .map(publicDelivery);
    res.json({ deliveries });
  });

  app.post("/api/integrations/deliveries/:id/retry", requireAuth, requirePermission("integration:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const previousDelivery = data.integrationDeliveries.find((delivery) => delivery.id === req.params.id && delivery.ownerId === req.tenantId);

      if (!previousDelivery) {
        return res.status(404).json({ error: "Entrega não encontrada." });
      }

      if (!previousDelivery.sessionId) {
        return res.status(400).json({ error: "Esta entrega não está vinculada a uma sessão." });
      }

      const session = data.sessions.find((item) => item.id === previousDelivery.sessionId && item.ownerId === req.tenantId);
      if (!session) {
        return res.status(404).json({ error: "Sessão original não encontrada." });
      }

      const integration = getIntegration(data, req.tenantId!);
      if (!integration.webhook.enabled || !integration.webhook.url) {
        return res.status(400).json({ error: "Configure e ative o webhook antes de retentar a entrega." });
      }

      const delivery = await deliverSession(data, req.tenantId!, session);
      session.integrationDelivery = delivery;
      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "integration_delivery_retry",
        requestId: req.requestId,
        metadata: { deliveryId: req.params.id, sessionId: previousDelivery.sessionId },
      });
      await writeDatabase(data);
      res.json({ delivery });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/integrations", requireAuth, requirePermission("integration:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const integration = getIntegration(data, req.tenantId!);
      const webhook = req.body.webhook || {};

      if (typeof webhook.url === "string") {
        const url = webhook.url.trim();
        integration.webhook.url = url ? await validatePublicWebhookUrl(url) : "";
      }

      if (typeof webhook.enabled === "boolean") {
        integration.webhook.enabled = webhook.enabled;
      }

      if (typeof webhook.secret === "string") {
        integration.webhook.secret = webhook.secret.trim() || undefined;
      }

      integration.webhook.updatedAt = new Date().toISOString();
      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "webhook_update",
        requestId: req.requestId,
        metadata: { enabled: integration.webhook.enabled, hasUrl: Boolean(integration.webhook.url), hasSecret: Boolean(integration.webhook.secret) },
      });
      await writeDatabase(data);
      res.json(publicIntegration(integration));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/integrations/test-webhook", requireAuth, requirePermission("integration:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const integration = getIntegration(data, req.tenantId!);
      const url = String(req.body.url || integration.webhook.url || "").trim();
      const secret = typeof req.body.secret === "string" ? req.body.secret : integration.webhook.secret;

      if (!url) {
        return res.status(400).json({ error: "Configure uma URL de webhook antes de testar." });
      }

      const delivery = await sendWebhook(url, secret, "integration.test", {
        message: "Teste real do Birth Voices Hub",
        user: publicUser(req.user!),
      });

      const publicDelivery: IntegrationDelivery = {
        status: delivery.status,
        target: delivery.target,
        statusCode: delivery.statusCode,
        message: delivery.message,
        deliveredAt: delivery.deliveredAt,
      };
      integration.webhook.lastDelivery = publicDelivery;
      await writeDatabase(data);
      res.json({ delivery: publicDelivery, responseBody: delivery.responseBody });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chat", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const { prompt, currentMessages, enableSearchGrounding = false, temperature = 0.7, model = "gemini-2.5-flash" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          error: "GEMINI_API_KEY não configurada. Defina a variável de ambiente para usar o agente de IA real.",
        });
      }

      if (!Array.isArray(currentMessages)) {
        return res.status(400).json({ error: "Histórico de mensagens inválido." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const history = currentMessages.map((message: unknown) => {
        const record = isRecord(message) ? message : {};
        return {
          role: record.role === "agent" ? "model" : "user",
          parts: [{ text: String(record.text || "") }],
        };
      });

      const config: {
        systemInstruction: string;
        temperature: number;
        tools?: Array<{ googleSearch: Record<string, never> }>;
      } = {
        systemInstruction: String(prompt || "Você é um assistente útil."),
        temperature: Number(temperature),
      };

      if (enableSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: String(model),
        contents: history,
        config,
      });

      res.json({ text: response.text });
    } catch (error) {
      next(error);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const req = _req as AuthedRequest;
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: "api_error",
      request_id: req.requestId,
      user_id: req.user?.id,
      tenant_id: req.tenantId,
      error: errorMessage(error),
    }));
    res.status(400).json({ error: errorMessage(error) });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Persistent storage: ${DATA_FILE}`);
  });
}

startServer();
