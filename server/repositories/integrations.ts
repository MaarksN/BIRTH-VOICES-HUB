import crypto from "crypto";
import {
  Database,
  errorMessage,
  errorName,
  StoredIntegration,
  StoredIntegrationDelivery,
} from "./database";
import {
  IntegrationDelivery,
  IntegrationSettings,
  SessionRecord,
} from "../../types";
import { metrics } from "../middleware/common";

const WEBHOOK_TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS || 10000);

export function getIntegration(data: Database, ownerId: string) {
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

export function publicIntegration(integration: StoredIntegration): IntegrationSettings {
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

export function createWebhookSignature(secret: string, body: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function publicDelivery(delivery: IntegrationDelivery): IntegrationDelivery {
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

export function recordIntegrationDelivery(data: Database, ownerId: string, delivery: IntegrationDelivery & { responseBody?: string }) {
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

import net from "net";
import dns from "dns/promises";

export function isPrivateIp(address: string) {
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

export async function validatePublicWebhookUrl(rawUrl: string) {
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

export async function sendWebhook(url: string, secret: string | undefined, event: string, data: unknown): Promise<IntegrationDelivery & { responseBody?: string }> {
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

export async function deliverSession(data: Database, ownerId: string, session: SessionRecord): Promise<IntegrationDelivery> {
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
