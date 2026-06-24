import crypto from "crypto";
import { NextFunction, Response } from "express";
import {
  AuthedRequest,
  Database,
  OrganizationRole,
  readDatabase,
  writeDatabase,
} from "../repositories/database";

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
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

export type Permission =
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

export function can(role: OrganizationRole | undefined, permission: Permission) {
  return Boolean(role && rolePermissions[role]?.has(permission));
}

export function requirePermission(permission: Permission) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!can(req.role, permission)) {
      return res.status(req.role === "suspended" ? 403 : 403).json({ error: "Permissão insuficiente para esta ação." });
    }

    next();
  };
}

export function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getPublicBaseUrl() {
  return String(process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
}

function twilioSignaturePayload(req: any) {
  const baseUrl = getPublicBaseUrl();
  const requestUrl = baseUrl ? `${baseUrl}${req.originalUrl}` : `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const params = req.body && typeof req.body === "object" ? req.body : {};
  const suffix = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  return `${requestUrl}${suffix}`;
}

export function verifyTwilioRequest(req: any) {
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const signature = String(req.header("X-Twilio-Signature") || "").trim();
  if (!authToken || !signature) return false;

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(twilioSignaturePayload(req), "utf8"))
    .digest("base64");
  return constantTimeEqual(expected, signature);
}

function twiml(inner: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function say(text: string) {
  return `<Say language="pt-BR" voice="alice">${escapeXml(text)}</Say>`;
}

export function requireTwilioSignature(req: any, res: Response, next: NextFunction) {
  if (!process.env.TWILIO_AUTH_TOKEN) {
    return res.status(503).type("text/xml").send(twiml(`${say("Telefonia não configurada.")}<Hangup />`));
  }

  if (!verifyTwilioRequest(req)) {
    return res.status(403).type("text/xml").send(twiml(`${say("Assinatura Twilio inválida.")}<Hangup />`));
  }

  next();
}
