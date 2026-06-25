import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { AuthedRequest } from "../repositories/database";

export const metrics = {
  requests: 0,
  status4xx: 0,
  status5xx: 0,
  totalLatencyMs: 0,
  webhookFailures: 0,
  geminiFailures: 0,
  twilioFailures: 0,
};

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://generativelanguage.googleapis.com",
    ].join("; "),
  );
  next();
}

export function requestContext(req: AuthedRequest, res: Response, next: NextFunction) {
  const incoming = String(req.header("X-Request-Id") || "").trim();
  req.requestId = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

export function currentRequestId(req: Request) {
  return (req as AuthedRequest).requestId;
}

export function structuredLogger(req: AuthedRequest, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  metrics.requests += 1;

  res.on("finish", () => {
    const latencyMs = Date.now() - startedAt;
    metrics.totalLatencyMs += latencyMs;
    if (res.statusCode >= 500) metrics.status5xx += 1;
    else if (res.statusCode >= 400) metrics.status4xx += 1;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? "error" : "info",
      message: "http_request",
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency_ms: latencyMs,
      user_id: req.user?.id,
      tenant_id: req.tenantId,
    }));
  });

  next();
}

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const current = rateLimitBuckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + options.windowMs };
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);

    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - bucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." });
    }

    next();
  };
}
