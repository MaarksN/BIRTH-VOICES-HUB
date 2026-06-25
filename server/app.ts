import express, { NextFunction, Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  AuthedRequest,
  DATA_DIR,
  DATA_FILE,
  DATA_RETENTION_DAYS,
  errorMessage,
  loadLocalEnv,
  readDatabase,
} from "./repositories/database";
import {
  requestContext,
  securityHeaders,
  structuredLogger,
  rateLimit,
} from "./middleware/common";
import { requireAuth, requireTwilioSignature } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { agentsRouter, metricsRouter } from "./routes/agents";
import { sessionsRouter } from "./routes/sessions";
import { telephonyRouter, twilioRouter, telephonyConfig } from "./routes/telephony";
import { integrationsRouter } from "./routes/integrations";
import { userRouter } from "./routes/user";
import { RuntimeStatus } from "../types";
import fs from "fs/promises";

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || 240);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 20);
const WEBHOOK_RATE_LIMIT_MAX = Number(process.env.WEBHOOK_RATE_LIMIT_MAX || 120);

import { Database } from "./repositories/database";

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

export async function createApp() {
  await loadLocalEnv();
  const app = express();

  app.use(requestContext);
  app.use(securityHeaders);
  app.use(structuredLogger);

  app.use("/api/", rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: API_RATE_LIMIT_MAX, keyPrefix: "api" }));
  app.use(["/api/auth/login", "/api/auth/register"], rateLimit({ windowMs: AUTH_RATE_LIMIT_WINDOW_MS, max: AUTH_RATE_LIMIT_MAX, keyPrefix: "auth" }));

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Routes
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

  app.use("/api/auth", authRouter);
  app.use("/api/agents", agentsRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/telephony", telephonyRouter);
  app.use("/api/integrations", integrationsRouter);
  app.use("/api", userRouter);
  app.use("/api/metrics", metricsRouter);

  app.use("/api/twilio", rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: WEBHOOK_RATE_LIMIT_MAX, keyPrefix: "twilio" }), requireTwilioSignature, twilioRouter);

  app.post("/api/chat", requireAuth, async (req: AuthedRequest, res, next) => {
     // requireAuth is not applied globally to /api/chat in server.ts but it was used in the route.
     // Let's re-verify if requireAuth was needed. In server.ts it had app.post("/api/chat", requireAuth, ...)
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
       const history = currentMessages.map((message: { role: string; text: string }) => {
         return {
           role: message.role === "agent" ? "model" : "user",
           parts: [{ text: String(message.text || "") }],
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

  return app;
}
