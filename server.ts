try {
  process.loadEnvFile();
} catch {
  // No .env file present (e.g. production containers inject env vars directly) — safe to ignore.
}

import "./lib/otelInitializer.js";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Redis } from "ioredis";
import { verifyToken } from "./src/lib/auth-tokens.js";
import { csrfProtection } from "./src/middlewares/index.js";
import { createHealthRouter } from "./src/routes/health.routes.js";
import apiRoutes from "./src/routes/index.js";
import { otelCollector } from "./lib/voice-runtime/otel.js";

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

    const s1 = otelCollector.startLocalSpan("EmotionEngine.analyzeTurn", ses1, { text: "Estou preocupada com o meu pré-natal" });
    otelCollector.endLocalSpan(s1, { detectedEmotions: ["Ansiedade"], intensity: 85 });

    const s2 = otelCollector.startLocalSpan("IntentEngine.analyzeIntent", ses1, { context: "Triagem inicial" });
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
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
      },
    },
  }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(cookieParser());
  app.use(express.json());

  // Redis-backed Rate Limiter
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisClient = new Redis(redisUrl, { maxRetriesPerRequest: null });

  const rateLimitMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const key = `ratelimit:${ip}`;
    const limit = 200;
    const windowSeconds = 60;

    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      if (current > limit) {
        return res.status(429).json({ error: "Limite de requisições excedido. Tente novamente em um minuto." });
      }
      next();
    } catch (err) {
      next();
    }
  };
  app.use(rateLimitMiddleware);
  app.use(csrfProtection);

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
    (socket as any).user = session;
    next();
  });

  io.on("connection", (socket) => {
    console.log("Supervisor connected via WebSocket:", socket.id);

    let callDuration = 0;
    const interval = setInterval(() => {
      callDuration++;

      let emotions = { empathy: 85, confidence: 90, frustration: 10 };
      let intent = { primary: 'Fornecer informações', confidence: 90 };
      let objections: string[] = [];
      let alerts: any[] = [];

      if (callDuration < 12) {
        emotions = { empathy: 84, confidence: 89, frustration: 6 };
        intent = { primary: 'Identificação & Saudação (Live Stream)', confidence: 96 };
      } else if (callDuration < 30) {
        emotions = { empathy: 87, confidence: 93, frustration: 10 };
        intent = { primary: 'Coleta de CPF do Paciente (Live Stream)', confidence: 99 };
        if (callDuration >= 15) {
          alerts.push({ id: 'a-1', level: 'info', message: 'CPF recebido e validado com sucesso no CRM via WebSocket.', timestamp: Date.now() });
        }
      } else if (callDuration < 55) {
        emotions = { empathy: 90, confidence: 95, frustration: 18 };
        intent = { primary: 'Triagem de Sintomas / Urgência (Live Stream)', confidence: 92 };
        if (callDuration >= 35) {
          alerts.push({ id: 'a-2', level: 'warning', message: 'Paciente relata dor de dente aguda e persistente (WebSocket Stream).', timestamp: Date.now() });
          objections.push('Solicitou encaixe de urgência no mesmo dia');
        }
      } else {
        emotions = { empathy: 96, confidence: 98, frustration: 4 };
        intent = { primary: 'Agendamento e Finalização (Live Stream)', confidence: 98 };
        if (callDuration >= 58) {
          alerts.push({ id: 'a-3', level: 'critical', message: 'Agendamento de urgência confirmado para amanhã às 14:00 via Socket.io.', timestamp: Date.now() });
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
      console.log("Intervention received from supervisor:", data);
      io.emit("intervention_triggered", { message: "Supervisor interveio na chamada!" });
    });

    socket.on("disconnect", () => {
      clearInterval(interval);
      console.log("Supervisor disconnected:", socket.id);
    });
  });

  // Centralized error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled request error:', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Erro interno no servidor.' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

export const appPromise = startServer();
