try {
  process.loadEnvFile();
} catch {
  // No .env file present (e.g. production containers inject env vars directly) — safe to ignore.
}

import "./lib/otelInitializer.js";
import express from "express";
import path from "path";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { Redis } from "ioredis";
import { verifyToken } from "./src/lib/auth-tokens.js";
import { getRedisUrl } from "./src/lib/env.js";
import { csrfProtection } from "./src/middlewares/index.js";
import { createHealthRouter } from "./src/routes/health.routes.js";
import apiRoutes from "./src/routes/index.js";
import telephonyRoutes from "./src/routes/telephony.routes.js";
import { otelCollector } from "./lib/voice-runtime/otel.js";
import { logger } from "./src/lib/logger.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const server = http.createServer(app);

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || `http://localhost:${PORT}`)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const io = new SocketIOServer(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
  });

  // Seed some initial traces for live preview dashboard
  if (otelCollector.getSpans().length === 0) {
    const ses1 = "sess-12345";
    const ses2 = "sess-67890";

    const s1 = otelCollector.startLocalSpan("EmotionEngine.analyzeTurn", ses1, { text: "Estou preocupada com o orçamento aprovado" });
    otelCollector.endLocalSpan(s1, { detectedEmotions: ["Ansiedade"], intensity: 85 });

    const s2 = otelCollector.startLocalSpan("IntentEngine.analyzeIntent", ses1, { context: "Qualificação inicial" });
    otelCollector.endLocalSpan(s2, { primaryIntent: "Agendar consulta", confidence: 95 });

    const s3 = otelCollector.startLocalSpan("StrategyEngine.adaptStrategy", ses1);
    otelCollector.endLocalSpan(s3, { tone: "Comforting", empathyLevel: "High" });

    const s4 = otelCollector.startLocalSpan("EmotionEngine.analyzeTurn", ses2, { text: "Tudo bem, deu certo o agendamento" });
    otelCollector.endLocalSpan(s4, { detectedEmotions: ["Satisfação"], intensity: 90 });

    otelCollector.recordLocalMetric('emotion_intensity', 85, { emotion: 'Ansiedade', sessionId: ses1 });
    otelCollector.recordLocalMetric('intent_confidence', 95, { primaryIntent: 'Agendar consulta', sessionId: ses1 });
    otelCollector.recordLocalMetric('emotion_intensity', 90, { emotion: 'Satisfação', sessionId: ses2 });
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        // index.css pulls the Inter/JetBrains Mono webfonts from Google Fonts.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }));
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(cookieParser());

  // Redis-backed Rate Limiter
  const redisUrl = getRedisUrl();
  // Bounded retries + short timeouts so a Redis outage makes rate-limit/health checks fail fast
  // and degrade gracefully, instead of hanging every request forever waiting on the command queue.
  const redisClient = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000, commandTimeout: 2000 });
  redisClient.on('error', (err) => logger.error('Redis client error', err.message));

  const createRateLimiter = (keyPrefix: string, limit: number, windowSeconds: number) =>
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
      const key = `ratelimit:${keyPrefix}:${ip}`;

      try {
        const current = await redisClient.incr(key);
        if (current === 1) {
          await redisClient.expire(key, windowSeconds);
        }
        if (current > limit) {
          return res.status(429).json({ error: "Limite de requisições excedido. Tente novamente em um minuto." });
        }
        next();
      } catch {
        next();
      }
    };

  // General limiter for the whole API, applied before body parsing so an oversized/malformed
  // body never gets parsed for a request that's about to be rejected anyway.
  app.use(createRateLimiter('global', 200, 60));
  // Tighter limiter on login/register specifically — brute-force/credential-stuffing protection
  // that the shared 200 req/min global limit doesn't provide.
  app.use(['/api/auth/login', '/api/auth/register'], createRateLimiter('auth', 10, 60));

  // Twilio webhooks: mounted before csrfProtection/express.json() because Twilio sends
  // application/x-www-form-urlencoded bodies with no Origin header (the CSRF check would reject
  // every request). Authenticity is instead verified per-request via the Twilio request signature
  // inside telephonyRoutes — see validateTwilioSignature.
  app.use('/api', createRateLimiter('telephony', 120, 60), telephonyRoutes);

  app.use(csrfProtection);
  app.use(express.json());

  const healthRouter = createHealthRouter(redisClient);
  app.use(healthRouter);
  app.use('/api', healthRouter);
  app.use('/api', apiRoutes);

  // Socket.io WebSocket Event Streaming Integration (authenticated)
  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const tokenFromCookie = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('access_token='))
      ?.split('=')[1];
    const token = tokenFromCookie || (socket.handshake.auth?.token as string | undefined);

    const session = token ? verifyToken(decodeURIComponent(token)) : null;
    if (!session) {
      return next(new Error('unauthorized'));
    }
    socket.data.user = session;
    next();
  });

  io.on("connection", (socket) => {
    logger.info('Supervisor connected via WebSocket', socket.id);

    let callDuration = 0;
    const interval = setInterval(() => {
      callDuration++;

      let emotions = { empathy: 85, confidence: 90, frustration: 10 };
      let intent = { primary: 'Fornecer informações', confidence: 90 };
      const objections: string[] = [];
      const alerts: Array<{ id: string; level: string; message: string; timestamp: number }> = [];

      if (callDuration < 12) {
        emotions = { empathy: 84, confidence: 89, frustration: 6 };
        intent = { primary: 'Identificação & Saudação (Live Stream)', confidence: 96 };
      } else if (callDuration < 30) {
        emotions = { empathy: 87, confidence: 93, frustration: 10 };
        intent = { primary: 'Coleta de CNPJ do Lead (Live Stream)', confidence: 99 };
        if (callDuration >= 15) {
          alerts.push({ id: 'a-1', level: 'info', message: 'CNPJ recebido e validado com sucesso no CRM via WebSocket.', timestamp: Date.now() });
        }
      } else if (callDuration < 55) {
        emotions = { empathy: 90, confidence: 95, frustration: 18 };
        intent = { primary: 'Qualificação de Necessidade / Objeções (Live Stream)', confidence: 92 };
        if (callDuration >= 35) {
          alerts.push({ id: 'a-2', level: 'warning', message: 'Lead relata objeção de preço em relação ao concorrente (WebSocket Stream).', timestamp: Date.now() });
          objections.push('Solicitou desconto para fechamento no mesmo dia');
        }
      } else {
        emotions = { empathy: 96, confidence: 98, frustration: 4 };
        intent = { primary: 'Agendamento e Finalização (Live Stream)', confidence: 98 };
        if (callDuration >= 58) {
          alerts.push({ id: 'a-3', level: 'critical', message: 'Reunião comercial confirmada para amanhã às 14:00 via Socket.io.', timestamp: Date.now() });
        }
      }

      socket.emit("telemetry_stream", {
        sessionId: "live-ws-session",
        callDuration,
        emotions,
        intent,
        objections,
        alerts
      });
    }, 1000);

    socket.on("intervene_call", (data) => {
      logger.info('Intervention received from supervisor', data);
      io.emit("intervention_triggered", { message: "Supervisor interveio na chamada!" });
    });

    socket.on("disconnect", () => {
      clearInterval(interval);
      logger.info('Supervisor disconnected', socket.id);
    });
  });

  // Centralized error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled request error', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Erro interno no servidor.' });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/*splat', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

export const appPromise = startServer();
