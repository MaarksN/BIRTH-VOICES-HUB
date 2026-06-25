import { Router } from "express";
import {
  AuthedRequest,
  readDatabase,
  writeDatabase,
} from "../repositories/database";
import { requireAuth, requirePermission } from "../middleware/auth";
import { appendAuditLog } from "./auth";
import { getIntegration, publicIntegration, deliverSession, sendWebhook, validatePublicWebhookUrl, publicDelivery } from "../repositories/integrations";
import { IntegrationDelivery } from "../../types";
import { publicUser } from "../repositories/database";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const integration = getIntegration(data, req.tenantId!);
      await writeDatabase(data);
      res.json(publicIntegration(integration));
    } catch (error) {
      next(error);
    }
});

router.get("/deliveries", requireAuth, (req: AuthedRequest, res) => {
    const deliveries = (req.data?.integrationDeliveries || [])
      .filter((delivery) => delivery.ownerId === req.tenantId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 100)
      .map(publicDelivery);
    res.json({ deliveries });
});

router.post("/deliveries/:id/retry", requireAuth, requirePermission("integration:write"), async (req: AuthedRequest, res, next) => {
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

router.patch("/", requireAuth, requirePermission("integration:write"), async (req: AuthedRequest, res, next) => {
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

router.post("/test-webhook", requireAuth, requirePermission("integration:write"), async (req: AuthedRequest, res, next) => {
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

export { router as integrationsRouter };
