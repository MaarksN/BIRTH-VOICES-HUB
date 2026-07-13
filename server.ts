import "./lib/otelInitializer.js";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { initializeWebSocket } from "./server/services/websocket.js";
import { rateLimitMiddleware, csrfProtection } from "./server/middlewares/security.js";
import authRoutes from "./server/routes/authRoutes.js";
import userRoutes from "./server/routes/userRoutes.js";
import workflowRoutes from "./server/routes/workflowRoutes.js";
import callLogRoutes from "./server/routes/callLogRoutes.js";
import metricsRoutes from "./server/routes/metricsRoutes.js";
import voiceRuntimeRoutes from "./server/routes/voiceRuntimeRoutes.js";
import settingsRoutes from "./server/routes/settingsRoutes.js";
import onboardingRoutes from "./server/routes/onboardingRoutes.js";
import brandColorRoutes from "./server/routes/brandColorRoutes.js";
import aiRoutes from "./server/routes/aiRoutes.js";
import mediaRoutes from "./server/routes/mediaRoutes.js";
import sessionRoutes from "./server/routes/sessionRoutes.js";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  initializeWebSocket(server);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(express.json());

  app.use(rateLimitMiddleware);
  app.use(csrfProtection);

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/workflow", workflowRoutes);
  app.use("/api/call-logs", callLogRoutes);
  app.use("/api/metrics", metricsRoutes);
  app.use("/api/voice-runtime", voiceRuntimeRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/brand-color", brandColorRoutes);
  app.use("/api", aiRoutes);
  app.use("/api", mediaRoutes);
  app.use("/api/sessions", sessionRoutes);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
