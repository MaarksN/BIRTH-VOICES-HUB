import express from 'express';
import { verifyToken, TokenPayload } from '../lib/auth-tokens.js';
import { refreshSession } from '../services/authService.js';
import { setCookie, ACCESS_TOKEN_MAX_AGE_MS } from '../lib/cookies.js';

export const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Requests authenticated via a Bearer token in the Authorization header — rather than the
    // ambient session cookie — are not exploitable via CSRF: a malicious page cannot attach an
    // arbitrary Authorization header to a cross-site request, and cors() already restricts which
    // origins may read the response of a JS-initiated cross-origin request. This unblocks
    // legitimate server-to-server callers authenticated this way (e.g. the AtlasGR CRM calling
    // POST /api/voice/outbound with its own bearer token, which never sends an Origin header)
    // without weakening protection for the cookie-authenticated browser path below.
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return next();
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const origin = req.headers.origin;
    const host = req.headers.host;

    if (!origin) {
      // Same-site requests without credentials (e.g. plain HTML form posts) legitimately omit
      // Origin in some browsers, but in production we require it for mutation requests since
      // this is our only CSRF signal — outside production, tooling (tests, curl, etc.) may not send it.
      if (isProduction) {
        res.status(403).json({ error: 'Validação de origem de segurança (CSRF) falhou.' });
        return;
      }
      return next();
    }

    if (host) {
      try {
        const parsedOrigin = new URL(origin).host;
        const isLocalBypass = !isProduction && (host.includes('localhost') || host.includes('127.0.0.1'));
        if (parsedOrigin !== host && !isLocalBypass) {
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
  setCookie(res, 'access_token', token, ACCESS_TOKEN_MAX_AGE_MS);
  // Non-httpOnly UI flag (no sensitive data) so the frontend can tell it has a live session
  // without parsing the httpOnly access_token cookie.
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

    // Auto-upsert User and Tenant in Dev environment so old JWT cookies don't break fresh databases
    if (process.env.NODE_ENV !== 'production' && session.tenantId) {
      try {
        const { prisma } = await import('../lib/prisma.js');
        await prisma.tenant.upsert({
          where: { id: session.tenantId },
          update: {},
          create: { id: session.tenantId, name: 'Local Dev Tenant' }
        });
        await prisma.user.upsert({
          where: { id: session.id },
          update: {},
          create: {
            id: session.id,
            tenantId: session.tenantId,
            email: session.email || 'dev@local.com',
            companyName: 'Local Dev Corp',
            passwordHash: 'dummy'
          }
        });
      } catch (err) {
        console.error('Failed to auto-upsert dev tenant/user:', err);
      }
    }
  }
  next();
};
