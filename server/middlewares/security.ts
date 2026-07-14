import { Request, Response, NextFunction } from 'express';
const rateLimits: Record<string, { count: number; resetTime: number }> = {};
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown'; const now = Date.now();
  if (!rateLimits[ip] || now > rateLimits[ip].resetTime) rateLimits[ip] = { count: 1, resetTime: now + 60000 };
  else rateLimits[ip].count++;
  if (rateLimits[ip].count > 200) return res.status(429).json({ error: "Limite excedido." });
  next();
};
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin; const host = req.headers.host;
    if (origin && host) { try { if (new URL(origin).host !== host && !host.includes('localhost') && !host.includes('127.0.0.1')) return res.status(403).json({ error: "CSRF fail." }); } catch {} }
  }
  next();
};
