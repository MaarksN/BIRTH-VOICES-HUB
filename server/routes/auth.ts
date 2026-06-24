import crypto from "crypto";
import { Router } from "express";
import {
  AuthedRequest,
  createPasswordHash,
  normalizeEmail,
  publicUser,
  readDatabase,
  requireFields,
  StoredUser,
  StoredOrganization,
  StoredMembership,
  writeDatabase,
  Database,
} from "../repositories/database";
import { currentRequestId } from "../middleware/common";
import { requireAuth } from "../middleware/auth";

const router = Router();

const PRIVACY_TERMS_VERSION = process.env.PRIVACY_TERMS_VERSION || "2026-06-05";
const DEFAULT_BRAND_COLOR = "#2563eb";

function createToken(data: Database, userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  data.tokens.push({ token, userId, expiresAt });
  return token;
}

import { AuditLogEntry } from "../../types";

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

function verifyPassword(password: string, user: StoredUser) {
  const { hash } = createPasswordHash(password, user.salt);
  const stored = Buffer.from(user.passwordHash, "hex");
  const attempted = Buffer.from(hash, "hex");
  return stored.length === attempted.length && crypto.timingSafeEqual(stored, attempted);
}

router.post("/register", async (req, res, next) => {
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

  router.post("/login", async (req, res, next) => {
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

  router.post("/logout", requireAuth, async (req: AuthedRequest, res, next) => {
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

export { router as authRouter, appendAuditLog, sanitizeMetadata };
