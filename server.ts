import "./lib/otelInitializer.js";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import http from "http";
import crypto from "crypto";
import { Server as SocketIOServer } from "socket.io";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { z } from "zod";
import { 
  readDb, 
  writeDb, 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  User
} from "./src/repositories/db.js";
import { otelCollector } from "./lib/voice-runtime/otel.js";
import { llmProviderGateway } from "./lib/voice-runtime/providers/LLMGateway.js";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Seed some initial traces for live preview dashboard
  if (otelCollector.getSpans().length === 0) {
    const ses1 = "sess-12345";
    const ses2 = "sess-67890";
    
    // Seed spans
    const s1 = otelCollector.startLocalSpan("EmotionEngine.analyzeTurn", ses1, { text: "Estou preocupada com o meu pré-natal" });
    otelCollector.endLocalSpan(s1, { detectedEmotions: ["Ansiedade"], intensity: 85 });
    
    const s2 = otelCollector.startLocalSpan("IntentEngine.analyzeIntent", ses1, { context: "Triagem inicial" });
    otelCollector.endLocalSpan(s2, { primaryIntent: "Agendar consulta", confidence: 95 });
    
    const s3 = otelCollector.startLocalSpan("StrategyEngine.adaptStrategy", ses1);
    otelCollector.endLocalSpan(s3, { tone: "Comforting", empathyLevel: "High" });
    
    const s4 = otelCollector.startLocalSpan("EmotionEngine.analyzeTurn", ses2, { text: "Tudo bem, deu certo o agendamento" });
    otelCollector.endLocalSpan(s4, { detectedEmotions: ["Satisfação"], intensity: 90 });
    
    // Seed metrics
    otelCollector.recordLocalMetric('emotion_intensity', 85, { emotion: 'Ansiedade', sessionId: ses1 });
    otelCollector.recordLocalMetric('intent_confidence', 95, { primaryIntent: 'Agendar consulta', sessionId: ses1 });
    otelCollector.recordLocalMetric('emotion_intensity', 90, { emotion: 'Satisfação', sessionId: ses2 });
  }

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(express.json());

  // Pure Code Sliding-Window IP Rate Limiter
  const rateLimits: Record<string, { count: number; resetTime: number }> = {};
  const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000;
    const limit = 200; // generous but protective

    if (!rateLimits[ip] || now > rateLimits[ip].resetTime) {
      rateLimits[ip] = { count: 1, resetTime: now + windowMs };
    } else {
      rateLimits[ip].count++;
    }

    if (rateLimits[ip].count > limit) {
      return res.status(429).json({ error: "Limite de requisições excedido. Tente novamente em um minuto." });
    }
    next();
  };
  app.use(rateLimitMiddleware);

  // Custom CSRF validation check for state-changing requests
  const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (origin && host) {
        try {
          const parsedOrigin = new URL(origin).host;
          if (parsedOrigin !== host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            return res.status(403).json({ error: "Validação de origem de segurança (CSRF) falhou." });
          }
        } catch {
          // ignore parsing error but block if suspicious
        }
      }
    }
    next();
  };
  app.use(csrfProtection);

  // Helper for secure authorization check & token rotation
  const getAuthUser = (req: express.Request, res?: express.Response) => {
    let token = req.cookies?.access_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) return decoded;
    }
    
    // Automatic transparent token rotation via HTTP-Only Refresh Token cookie
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      const decodedRefresh = verifyRefreshToken(refreshToken);
      if (decodedRefresh) {
        const db = readDb();
        const user = db.users.find(u => u.id === decodedRefresh.id);
        if (user) {
          const newAccessToken = generateToken({ id: user.id, email: user.email, role: user.role || 'user' });
          if (res) {
            res.cookie('access_token', newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 900000 // 15 mins
            });
            res.cookie('logged_in', 'true', {
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 86400 * 30 * 1000
            });
          }
          return { id: user.id, email: user.email, role: user.role || 'user' };
        }
      }
    }
    
    return null;
  };

  // Audit Logging engine
  const writeAuditLog = (userId: string, action: string, details: any) => {
    try {
      const db = readDb();
      const logEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
        userId,
        action,
        details,
        timestamp: new Date().toISOString()
      };
      db.auditLogs.unshift(logEntry);
      if (db.auditLogs.length > 500) {
        db.auditLogs = db.auditLogs.slice(0, 500);
      }
      writeDb(db);
    } catch (err) {
      console.error("Audit log persistence failure:", err);
    }
  };

  // --- PERSISTENT DATABASE API ENDPOINTS ---

  // Auth: Register
  app.post("/api/auth/register", (req, res) => {
    try {
      // Zod strict register body validation
      const registerSchema = z.object({
        email: z.string().email("Formato de email inválido"),
        password: z.string().min(6, "A senha precisa de no mínimo 6 caracteres"),
        companyName: z.string().min(2, "Nome de empresa inválido")
      });

      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { email, password, companyName } = parsed.data;

      const db = readDb();
      const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "Este email já está cadastrado." });
      }

      const userId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
      const isFirstUser = db.users.length === 0;
      const newUser: User = {
        id: userId,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        companyName,
        role: isFirstUser ? 'admin' : 'user', // first user is admin
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      writeDb(db);

      const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });
      const refreshToken = generateRefreshToken({ id: newUser.id });

      // Set httpOnly and secure session cookies
      res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 900000 // 15 mins
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 30 * 1000 // 30 days
      });

      res.cookie('logged_in', 'true', {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 30 * 1000
      });

      res.cookie('user_info', JSON.stringify({
        id: newUser.id,
        name: newUser.email.split('@')[0],
        company: newUser.companyName,
        email: newUser.email,
        role: newUser.role
      }), {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 30 * 1000
      });

      writeAuditLog(newUser.id, "USER_REGISTER", { email: newUser.email, companyName });

      res.json({
        token,
        user: {
          id: newUser.id,
          name: newUser.email.split('@')[0],
          company: newUser.companyName,
          email: newUser.email,
          role: newUser.role
        }
      });
    } catch (err: any) {
      console.error("Register Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    try {
      // Zod login body validation
      const loginSchema = z.object({
        email: z.string().email("Formato de email inválido"),
        password: z.string().min(1, "Senha é obrigatória")
      });

      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { email, password } = parsed.data;

      const db = readDb();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      const token = generateToken({ id: user.id, email: user.email, role: user.role || 'user' });
      const refreshToken = generateRefreshToken({ id: user.id });

      // Set httpOnly and secure session cookies
      res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 900000 // 15 mins
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 30 * 1000 // 30 days
      });

      res.cookie('logged_in', 'true', {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 30 * 1000
      });

      res.cookie('user_info', JSON.stringify({
        id: user.id,
        name: user.email.split('@')[0],
        company: user.companyName,
        email: user.email,
        role: user.role || 'user'
      }), {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 30 * 1000
      });

      writeAuditLog(user.id, "USER_LOGIN", { email: user.email });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.email.split('@')[0],
          company: user.companyName,
          email: user.email,
          role: user.role || 'user'
        }
      });
    } catch (err: any) {
      console.error("Login Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Auth: Me
  app.get("/api/auth/me", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    const db = readDb();
    const user = db.users.find(u => u.id === session.id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json({
      user: {
        id: user.id,
        name: user.email.split('@')[0],
        company: user.companyName,
        email: user.email,
        role: user.role || 'user'
      }
    });
  });

  // Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    const session = getAuthUser(req, res);
    if (session) {
      writeAuditLog(session.id, "USER_LOGOUT", { email: session.email });
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('logged_in');
    res.clearCookie('user_info');
    res.json({ success: true, message: "Desconectado com sucesso." });
  });

  // Workflow Persistence Endpoints
  app.get("/api/workflow", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const workflow = db.workflows.find(w => w.userId === session.id);
    res.json({ workflow: workflow || null });
  });

  app.post("/api/workflow", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { nodes, edges, name } = req.body;
    const db = readDb();
    let workflow = db.workflows.find(w => w.userId === session.id);

    if (workflow) {
      workflow.nodes = nodes || [];
      workflow.edges = edges || [];
      workflow.name = name || workflow.name || "Default Workflow";
      workflow.updatedAt = new Date().toISOString();
    } else {
      workflow = {
        id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
        userId: session.id,
        name: name || "Default Workflow",
        nodes: nodes || [],
        edges: edges || [],
        updatedAt: new Date().toISOString()
      };
      db.workflows.push(workflow);
    }

    writeDb(db);
    writeAuditLog(session.id, "WORKFLOW_SAVE", { workflowId: workflow.id, name: workflow.name });
    res.json({ success: true, workflow });
  });

  app.put("/api/workflow", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { nodes, edges, name } = req.body;
    const db = readDb();
    let workflow = db.workflows.find(w => w.userId === session.id);

    if (!workflow) {
      return res.status(404).json({ error: "Workflow não encontrado para atualização." });
    }

    workflow.nodes = nodes || workflow.nodes;
    workflow.edges = edges || workflow.edges;
    workflow.name = name || workflow.name;
    workflow.updatedAt = new Date().toISOString();

    writeDb(db);
    writeAuditLog(session.id, "WORKFLOW_UPDATE", { workflowId: workflow.id, name: workflow.name });
    res.json({ success: true, workflow });
  });

  app.delete("/api/workflow", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const index = db.workflows.findIndex(w => w.userId === session.id);
    if (index === -1) {
      return res.status(404).json({ error: "Nenhum fluxo encontrado para exclusão." });
    }

    const deleted = db.workflows.splice(index, 1)[0];
    writeDb(db);
    writeAuditLog(session.id, "WORKFLOW_DELETE", { workflowId: deleted.id });
    res.json({ success: true, message: "Fluxo removido com sucesso." });
  });

  // Onboarding Checklist Endpoints
  app.get("/api/onboarding", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const checklist = db.checklist[session.id] || {
      orgCreated: true,
      agentCreated: false,
      telephonyConnected: false,
      knowledgeAdded: false,
      firstTest: false,
      agentPublished: false,
      analyticsActive: false,
      firstCallCompleted: false
    };
    res.json({ checklist });
  });

  app.post("/api/onboarding", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { checklist } = req.body;
    const db = readDb();
    db.checklist[session.id] = checklist;
    writeDb(db);
    res.json({ success: true, checklist });
  });

  app.put("/api/onboarding", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { checklist } = req.body;
    const db = readDb();
    db.checklist[session.id] = checklist;
    writeDb(db);
    res.json({ success: true, checklist });
  });

  app.delete("/api/onboarding", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    delete db.checklist[session.id];
    writeDb(db);
    res.json({ success: true, message: "Progresso resetado." });
  });

  // Brand Color Endpoints
  app.get("/api/brand-color", (req, res) => {
    const session = getAuthUser(req, res);
    const userId = session ? session.id : 'anonymous';
    const db = readDb();
    res.json({ brandColor: db.brandColors[userId] || "#2563eb" });
  });

  app.post("/api/brand-color", (req, res) => {
    const session = getAuthUser(req, res);
    const userId = session ? session.id : 'anonymous';
    const { color } = req.body;
    const db = readDb();
    db.brandColors[userId] = color;
    writeDb(db);
    res.json({ success: true, brandColor: color });
  });

  app.put("/api/brand-color", (req, res) => {
    const session = getAuthUser(req, res);
    const userId = session ? session.id : 'anonymous';
    const { color } = req.body;
    const db = readDb();
    db.brandColors[userId] = color;
    writeDb(db);
    res.json({ success: true, brandColor: color });
  });

  app.delete("/api/brand-color", (req, res) => {
    const session = getAuthUser(req, res);
    const userId = session ? session.id : 'anonymous';
    const db = readDb();
    delete db.brandColors[userId];
    writeDb(db);
    res.json({ success: true, brandColor: "#2563eb" });
  });

  // Call Logs & Telemetry Endpoints
  app.get("/api/call-logs", (req, res) => {
    const session = getAuthUser(req, res);
    const userId = session ? session.id : 'system';
    const db = readDb();
    const logs = db.callLogs.filter(l => l.userId === userId || l.userId === 'system');
    res.json({ callLogs: logs });
  });

  app.post("/api/call-logs", (req, res) => {
    const session = getAuthUser(req, res);
    const userId = session ? session.id : 'anonymous';
    const { patientName, duration, status, agent } = req.body;

    const db = readDb();
    const newLog = {
      id: crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : crypto.randomBytes(4).toString("hex"),
      userId,
      patientName: patientName || "Paciente Anônimo",
      duration: duration || "02:15",
      status: status || "Concluído",
      time: "Agora mesmo",
      agent: agent || "Catarina Triagem",
      timestamp: new Date().toISOString()
    };

    db.callLogs.unshift(newLog);
    if (db.callLogs.length > 100) {
      db.callLogs = db.callLogs.slice(0, 100);
    }
    writeDb(db);

    if (session) {
      writeAuditLog(session.id, "CALL_LOG_CREATE", { logId: newLog.id });
    }

    res.json({ success: true, log: newLog });
  });

  app.put("/api/call-logs/:id", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { id } = req.params;
    const { patientName, status, duration } = req.body;
    const db = readDb();
    const log = db.callLogs.find(l => l.id === id && (l.userId === session.id || l.userId === 'system'));

    if (!log) {
      return res.status(404).json({ error: "Log de chamada não encontrado." });
    }

    if (patientName) log.patientName = patientName;
    if (status) log.status = status;
    if (duration) log.duration = duration;

    writeDb(db);
    res.json({ success: true, log });
  });

  app.delete("/api/call-logs/:id", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { id } = req.params;
    const db = readDb();
    const index = db.callLogs.findIndex(l => l.id === id && (l.userId === session.id || l.userId === 'system'));

    if (index === -1) {
      return res.status(404).json({ error: "Log não encontrado para exclusão." });
    }

    db.callLogs.splice(index, 1);
    writeDb(db);
    res.json({ success: true, message: "Log excluído com sucesso." });
  });

  // Voice Runtime Config Endpoints
  app.get("/api/voice-runtime", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const config = db.settings[`runtime_${session.id}`] || {
      voiceId: "eleven_rachel",
      language: "pt-BR",
      speed: 1.0,
      stability: 0.75,
      clarity: 0.85
    };
    res.json({ config });
  });

  app.post("/api/voice-runtime", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { config } = req.body;
    const db = readDb();
    db.settings[`runtime_${session.id}`] = config;
    writeDb(db);
    res.json({ success: true, config });
  });

  app.put("/api/voice-runtime", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { config } = req.body;
    const db = readDb();
    db.settings[`runtime_${session.id}`] = {
      ...(db.settings[`runtime_${session.id}`] || {}),
      ...config
    };
    writeDb(db);
    res.json({ success: true, config: db.settings[`runtime_${session.id}`] });
  });

  app.delete("/api/voice-runtime", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    delete db.settings[`runtime_${session.id}`];
    writeDb(db);
    res.json({ success: true, message: "Configurações de voz restauradas ao padrão." });
  });

  // Telemetry Metrics Endpoints
  app.get("/api/metrics", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const userMetrics = db.metrics.filter(m => m.userId === session.id);
    res.json({ metrics: userMetrics });
  });

  app.post("/api/metrics", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { name, value, tags } = req.body;
    const db = readDb();
    const newMetric = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
      userId: session.id,
      name,
      value,
      tags: tags || {},
      timestamp: new Date().toISOString()
    };
    db.metrics.push(newMetric);
    if (db.metrics.length > 1000) {
      db.metrics = db.metrics.slice(-1000);
    }
    writeDb(db);
    res.json({ success: true, metric: newMetric });
  });

  app.put("/api/metrics", (req, res) => {
    res.status(501).json({ error: "Métricas consolidadas não podem ser editadas diretamente." });
  });

  app.delete("/api/metrics", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    db.metrics = db.metrics.filter(m => m.userId !== session.id);
    writeDb(db);
    res.json({ success: true, message: "Métricas limpas para esta organização." });
  });

  // Session Manager Endpoints
  app.get("/api/sessions", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const userSessions = db.sessions.filter(s => s.userId === session.id);
    res.json({ sessions: userSessions });
  });

  app.post("/api/sessions", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { agentId, channel, metadata } = req.body;
    const db = readDb();
    const newSession = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
      userId: session.id,
      agentId: agentId || "default_catarina",
      channel: channel || "WebChat",
      status: "active",
      metadata: metadata || {},
      createdAt: new Date().toISOString()
    };
    db.sessions.push(newSession);
    writeDb(db);
    res.json({ success: true, session: newSession });
  });

  app.put("/api/sessions/:id", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { id } = req.params;
    const { status, metadata } = req.body;
    const db = readDb();
    const activeSession = db.sessions.find(s => s.id === id && s.userId === session.id);

    if (!activeSession) {
      return res.status(404).json({ error: "Sessão não encontrada." });
    }

    if (status) activeSession.status = status;
    if (metadata) activeSession.metadata = { ...activeSession.metadata, ...metadata };

    writeDb(db);
    res.json({ success: true, session: activeSession });
  });

  app.delete("/api/sessions/:id", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { id } = req.params;
    const db = readDb();
    const index = db.sessions.findIndex(s => s.id === id && s.userId === session.id);

    if (index === -1) {
      return res.status(404).json({ error: "Sessão não encontrada para finalização." });
    }

    db.sessions.splice(index, 1);
    writeDb(db);
    res.json({ success: true, message: "Sessão encerrada e removida com sucesso." });
  });

  // Users Directory Endpoints (RBAC protected)
  app.get("/api/users", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });
    if (session.role !== 'admin') {
      return res.status(403).json({ error: "Acesso proibido. Requer nível Administrador." });
    }

    const db = readDb();
    const safeUsers = db.users.map(u => ({
      id: u.id,
      email: u.email,
      companyName: u.companyName,
      role: u.role || 'user',
      createdAt: u.createdAt
    }));
    res.json({ users: safeUsers });
  });

  app.post("/api/users", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });
    if (session.role !== 'admin') {
      return res.status(403).json({ error: "Acesso proibido. Requer nível Administrador." });
    }

    const { email, password, companyName, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha obrigatórios." });
    }

    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "Este email já está cadastrado." });
    }

    const newUser: User = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      companyName: companyName || "Organização Associada",
      role: role === 'admin' ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDb(db);
    writeAuditLog(session.id, "USER_CREATE_BY_ADMIN", { targetUserId: newUser.id, email: newUser.email });

    res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  });

  app.put("/api/users/:id", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { id } = req.params;
    const { companyName, role, password } = req.body;

    if (session.role !== 'admin' && session.id !== id) {
      return res.status(403).json({ error: "Você não tem permissão para alterar este perfil." });
    }

    const db = readDb();
    const userToEdit = db.users.find(u => u.id === id);
    if (!userToEdit) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (companyName) userToEdit.companyName = companyName;
    if (role && session.role === 'admin') userToEdit.role = role;
    if (password) userToEdit.passwordHash = hashPassword(password);

    writeDb(db);
    writeAuditLog(session.id, "USER_UPDATE", { targetUserId: id });
    res.json({ success: true, message: "Perfil atualizado com sucesso." });
  });

  app.delete("/api/users/:id", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });
    if (session.role !== 'admin') {
      return res.status(403).json({ error: "Requer privilégios administrativos." });
    }

    const { id } = req.params;
    if (session.id === id) {
      return res.status(400).json({ error: "Você não pode excluir o seu próprio usuário admin." });
    }

    const db = readDb();
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    db.users.splice(index, 1);
    writeDb(db);
    writeAuditLog(session.id, "USER_DELETE", { targetUserId: id });
    res.json({ success: true, message: "Usuário excluído com sucesso." });
  });

  // Settings Configuration Endpoints
  app.get("/api/settings", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const userSettings = db.settings[session.id] || {
      theme: "light",
      notificationsEnabled: true,
      mfaEnabled: false,
      recordingEnabled: true
    };
    res.json({ settings: userSettings });
  });

  app.post("/api/settings", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { settings } = req.body;
    const db = readDb();
    db.settings[session.id] = settings;
    writeDb(db);
    res.json({ success: true, settings });
  });

  app.put("/api/settings", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { settings } = req.body;
    const db = readDb();
    db.settings[session.id] = {
      ...(db.settings[session.id] || {}),
      ...settings
    };
    writeDb(db);
    res.json({ success: true, settings: db.settings[session.id] });
  });

  app.delete("/api/settings", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    delete db.settings[session.id];
    writeDb(db);
    res.json({ success: true, message: "Configurações resetadas." });
  });

  // API Routes
  app.get("/api/observability/metrics", (req, res) => {
    res.json({
      spans: otelCollector.getSpans(),
      metrics: otelCollector.getMetrics()
    });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, currentMessages, provider = 'GoogleGemini' } = req.body;
      
      if (!currentMessages || currentMessages.length === 0) {
        return res.status(400).json({ error: "Mensagens vazias" });
      }

      const lastUserMessage = currentMessages[currentMessages.length - 1].text;
      
      const result = await llmProviderGateway.processRequest(
        lastUserMessage,
        provider,
        prompt
      );

      res.json({ 
        text: result.text, 
        providerUsed: result.providerUsed,
        latencyMs: result.latencyMs,
        tokensUsed: result.tokensUsed,
        costUSD: result.costUSD,
        fromFallback: result.fromFallback
      });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
            }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ audioBase64: base64Audio });
    } catch (error: any) {
      console.error("TTS API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/generate-music", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      
      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: prompt
      });

      let audioBase64 = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
        }
      }

      res.json({ audioBase64, mimeType });
    } catch (error: any) {
      console.error("Lyria API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Video Generation Endpoints
  const { GenerateVideosOperation } = await import('@google/genai');

  app.post("/api/generate-video", async (req, res) => {
    try {
      const { prompt, imageBytes, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Chave da API não configurada." });

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt,
        image: {
          imageBytes,
          mimeType
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
      
      res.json({ operationName: operation.name });
    } catch (error: any) {
      console.error("Veo start error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "API Key missing" });

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      res.json({ done: updated.done, error: updated.error });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/video-download", async (req, res) => {
    try {
      const { operationName } = req.query;
      if (!operationName) return res.status(400).send("No operation name");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).send("API Key missing");

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const op = new GenerateVideosOperation();
      op.name = operationName as string;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) return res.status(404).send("Vídeo não encontrado ou não finalizado.");

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': apiKey },
      });
      
      res.setHeader('Content-Type', 'video/mp4');
      videoRes.body!.pipeTo(
        new WritableStream({
          write(chunk) { res.write(chunk); },
          close() { res.end(); },
        })
      );
    } catch (error: any) {
      console.error("Video download error:", error);
      res.status(500).send(error.message);
    }
  });

  app.post("/api/ai/refactor", async (req, res) => {
    try {
      const { mode, nodes } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

      const prompt = `Você é um engenheiro staff especialista em otimização de fluxos de atendimento de voz por IA.
Você deve refatorar as configurações dos nós do fluxo atual de acordo com o modo desejado: "${mode}".

Modos possíveis:
- 'simplify': Simplificar os textos e prompts para respostas diretas.
- 'reduceCost': Reduzir custos substituindo modelos caros por gemini-2.5-flash e otimizando parâmetros.
- 'reduceLatency': Otimizar latência diminuindo o tamanho das perguntas e prompts, solicitando respostas extremamente curtas.
- 'moreHuman': Adicionar técnicas de empatia, respiração, pausas e tom natural nos prompts e configurações de voz.

Nós atuais para refatorar:
${JSON.stringify(nodes, null, 2)}

Sua tarefa:
Retorne os mesmos nós, mantendo seus IDs e posições intactos, mas modificando apropriadamente seus campos "data.label" e "data.config" (por exemplo, promptText, questionText, model, temperature, voiceId, stability, speechRate, etc.) para refletir a otimização solicitada de forma inteligente.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              nodes: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    type: { type: "STRING" },
                    position: {
                      type: "OBJECT",
                      properties: {
                        x: { type: "NUMBER" },
                        y: { type: "NUMBER" }
                      },
                      required: ["x", "y"]
                    },
                    data: {
                      type: "OBJECT",
                      properties: {
                        label: { type: "STRING" },
                        category: { type: "STRING" },
                        config: { type: "OBJECT" }
                      },
                      required: ["label", "category", "config"]
                    }
                  },
                  required: ["id", "type", "position", "data"]
                }
              }
            },
            required: ["nodes"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Refactor API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/ai/generate-workflow", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

      const systemPrompt = `Você é um Arquiteto de Software Staff especializado em projetar fluxos de atendimento de voz profissionais por telefone/web.
Com base no prompt do usuário: "${prompt}", gere um grafo completo de XYFlow estruturado contendo nós (nodes) e conexões (edges) que façam sentido lógico e técnico para o fluxo desejado.

Tipos de nós suportados:
1. "start": O gatilho de início da chamada. (Ex: Inbound Call Trigger). Config padrão: { channel: "Telefone", language: "pt-BR", timezone: "America/Sao_Paulo", provider: "Twilio", persona: "Recepção Médica", model: "Gemini 3.1 Pro" }
2. "voice": Configurações de voz (TTS). (Ex: Voz ElevenLabs). Config padrão: { provider: "ElevenLabs", voiceId: "Rachel_pt_BR", stability: 0.75, clarity: 0.85, speechRate: 1.0 }
3. "llm": O provedor de modelo de IA. (Ex: Gemini). Config padrão: { provider: "Gemini", model: "gemini-2.5-pro", temperature: 0.2, topP: 0.9, maxTokens: 1024, safetySettings: "Strict" }
4. "prompt": Prompt de instrução do bot. (Ex: Atendimento Inicial). Config padrão: { promptText: "Instruções do robô de forma simpática.", streaming: "Enabled", thinking: "DeepThinking" }
5. "question": Coleta de informação do usuário com regex de validação. (Ex: Coletar CPF, CEP, Nome). Config padrão: { questionText: "Fale seu nome.", maxRetryCount: 3, speechTimeoutMs: 5000, validationRegex: "^[a-zA-Z\\\\s]{3,30}$", variableToSave: "customer_name", fallbackPrompt: "Não entendi, pode repetir?" }
6. "condition": Desvio de fluxo por lógica ou intent. (Ex: Filtro de Suporte). Config padrão: { variable: "intent", operator: "equals", value: "Suporte", naturalLanguageCheck: "false", matchConfidenceThreshold: 0.8 }
7. "switch": Switch menu para várias rotas. Config padrão: { variableToCheck: "userIntent", path0: "Agendamento", path1: "Suporte", path2: "Financeiro" }
8. "knowledge": Busca vetorial / RAG no Notion/PDFs. (Ex: FAQ). Config padrão: { database: "Notion FAQs", ragTopK: 3, minScoreThreshold: 0.72, searchStrategy: "Embeddings + Semantic Match", autoChunkSize: 512 }
9. "tool": Integração HTTP REST API. (Ex: API Cadastrar). Config padrão: { method: "POST", endpoint: "https://api.empresa.com/v1/agenda", headers: "{}", bodyPayload: "{\\"name\\": \\"{{customer_name}}\\"}", timeoutMs: 4000, retryLimit: 2 }
10. "memory": Gerenciador de estado em memória. Config padrão: { variable: "session_id", value: "{{call_id}}" }
11. "human_handoff": Direciona para um operador humano. Config padrão: { queueName: "Suporte Geral", routingPriority: "High" }
12. "end": Desliga / finaliza a chamada.

Regras de posicionamento do layout:
- Inicie o "start" node na posição x: 50, y: 300.
- Distribua os outros nós sequencialmente para a direita (avançando no eixo X de 300 em 300 ou 400 em 400) e faça desvios verticais no eixo Y (por exemplo, y: 150 para ramo de sucesso e y: 480 para ramo de falha ou FAQ) para criar um grafo visualmente elegante, espaçado e fácil de ler sem sobreposições.
- Certifique-se de que cada nó tenha conexões lógicas que façam sentido. Conecte outputs (como sourceHandle "out-0" para Sucesso / Rota 0, "out-1" para Falha / Rota 1 na tomada de decisão ou perguntas) aos nós subsequentes.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              nodes: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    type: { type: "STRING" },
                    position: {
                      type: "OBJECT",
                      properties: {
                        x: { type: "NUMBER" },
                        y: { type: "NUMBER" }
                      },
                      required: ["x", "y"]
                    },
                    data: {
                      type: "OBJECT",
                      properties: {
                        label: { type: "STRING" },
                        category: { type: "STRING" },
                        config: { type: "OBJECT" }
                      },
                      required: ["label", "category", "config"]
                    }
                  },
                  required: ["id", "type", "position", "data"]
                }
              },
              edges: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    source: { type: "STRING" },
                    target: { type: "STRING" },
                    sourceHandle: { type: "STRING" },
                    type: { type: "STRING" },
                    data: {
                      type: "OBJECT",
                      properties: {
                        condition: { type: "STRING" },
                        isFallback: { type: "BOOLEAN" }
                      }
                    }
                  },
                  required: ["id", "source", "target"]
                }
              }
            },
            required: ["nodes", "edges"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Generate Workflow API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Socket.io WebSocket Event Streaming Integration
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


  app.get("/api/agents", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });
    const db = readDb();
    res.json({ agents: db.agents || [] });
  });

  app.post("/api/agents", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });
    const { name, model, configuration } = req.body;
    const db = readDb();
    const newAgent = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
      userId: session.id,
      name,
      model,
      configuration,
      createdAt: new Date().toISOString()
    };
    if (!db.agents) db.agents = [];
    db.agents.push(newAgent);
    writeDb(db);
    res.json({ success: true, agent: newAgent });
  });

  app.delete("/api/agents/:id", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });
    const db = readDb();
    if (!db.agents) db.agents = [];
    db.agents = db.agents.filter(a => a.id !== req.params.id || a.userId !== session.id);
    writeDb(db);
    res.json({ success: true });
  });

  app.get("/api/organizations", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });
    const db = readDb();
    res.json({ organizations: db.organizations || [] });
  });

  app.post("/api/organizations", (req, res) => {
    const session = getAuthUser(req, res);
    if (!session) return res.status(401).json({ error: "Não autorizado." });
    const { name } = req.body;
    const db = readDb();
    const newOrg = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
      userId: session.id,
      name,
      createdAt: new Date().toISOString()
    };
    if (!db.organizations) db.organizations = [];
    db.organizations.push(newOrg);
    writeDb(db);
    res.json({ success: true, organization: newOrg });
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();