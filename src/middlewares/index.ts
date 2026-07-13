import express from 'express';
import { verifyToken, verifyRefreshToken, generateToken, readDb } from '../repositories/db.js';

// Rate Limiter
export const rateLimits: Record<string, { count: number; resetTime: number }> = {};
export const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 200;

  if (!rateLimits[ip] || now > rateLimits[ip].resetTime) {
    rateLimits[ip] = { count: 1, resetTime: now + windowMs };
  } else {
    rateLimits[ip].count++;
  }

  if (rateLimits[ip].count > limit) {
    res.status(429).json({ error: "Limite de requisições excedido. Tente novamente em um minuto." });
    return;
  }
  next();
};

// CSRF
export const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && host) {
      try {
        const parsedOrigin = new URL(origin).host;
        if (parsedOrigin !== host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
          res.status(403).json({ error: "Validação de origem de segurança (CSRF) falhou." });
          return;
        }
      } catch {
        // ignore parsing error but block if suspicious
      }
    }
  }
  next();
};

// Auth
export const getAuthUser = (req: express.Request, res?: express.Response) => {
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

export const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = getAuthUser(req, res);
    if (!session) {
        res.status(401).json({ error: "Não autorizado." });
        return;
    }
    (req as any).user = session;
    next();
};
