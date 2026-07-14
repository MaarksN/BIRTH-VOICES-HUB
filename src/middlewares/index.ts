import express from 'express';
import { verifyToken, TokenPayload } from '../lib/auth-tokens.js';
import { refreshSession } from '../services/authService.js';

export const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && host) {
      try {
        const parsedOrigin = new URL(origin).host;
        if (parsedOrigin !== host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
          res.status(403).json({ error: 'Validação de origem de segurança (CSRF) falhou.' });
          return;
        }
      } catch {
        res.status(403).json({ error: 'Validação de origem de segurança (CSRF) falhou.' });
        return;
      }
    }
  }
  next();
};

function setAccessTokenCookie(res: express.Response, token: string) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 900000,
  });
  res.cookie('logged_in', 'true', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400 * 30 * 1000,
  });
}

export async function getAuthUser(req: express.Request, res?: express.Response): Promise<TokenPayload | null> {
  let token = req.cookies?.access_token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) return decoded;
  }

  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    const refreshed = await refreshSession(refreshToken);
    if (refreshed) {
      if (res) setAccessTokenCookie(res, refreshed.token);
      return refreshed.session;
    }
  }

  return null;
}

export const attachAuthIfPresent = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const session = await getAuthUser(req, res);
  if (session) {
    req.user = session;
    req.tenantId = session.tenantId;
  }
  next();
};
