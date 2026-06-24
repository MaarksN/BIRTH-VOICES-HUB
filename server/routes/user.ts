import { Router } from "express";
import {
  AuthedRequest,
  readDatabase,
  writeDatabase,
  publicUser,
  DEFAULT_BRAND_COLOR,
  PRIVACY_TERMS_VERSION,
  DATA_RETENTION_DAYS,
} from "../repositories/database";
import { requireAuth, requirePermission } from "../middleware/auth";
import { appendAuditLog } from "./auth";
import crypto from "crypto";
import { getIntegration, publicIntegration, publicDelivery } from "../repositories/integrations";
import { createPasswordHash } from "../repositories/database";

const router = Router();

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: publicUser(req.user!) });
});

router.patch("/me", requireAuth, async (req: AuthedRequest, res, next) => {
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

router.get("/privacy/policy", (_req, res) => {
    res.json({
      termsVersion: PRIVACY_TERMS_VERSION,
      retentionDays: DATA_RETENTION_DAYS,
      exportEndpoint: "/api/privacy/export",
      deleteEndpoint: "/api/privacy/delete",
    });
});

router.get("/privacy/export", requireAuth, requirePermission("privacy:export"), async (req: AuthedRequest, res, next) => {
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

router.post("/privacy/delete", requireAuth, requirePermission("privacy:delete"), async (req: AuthedRequest, res, next) => {
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

export { router as userRouter };
