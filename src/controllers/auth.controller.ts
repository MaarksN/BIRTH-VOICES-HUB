import { Request, Response } from 'express';
import { registerSchema, loginSchema } from '../validators/index.js';
import { register, login, AuthError } from '../services/authService.js';
import { writeAuditLog } from '../services/audit.js';
import { getAuthUser } from '../middlewares/index.js';
import { findUserById } from '../repositories/userRepository.js';

const COOKIE_BASE = { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const };

function setSessionCookies(res: Response, token: string, refreshToken: string, publicUser: { id: string; name: string; company: string; email: string; role: string }) {
  res.cookie('access_token', token, { ...COOKIE_BASE, httpOnly: true, maxAge: 900000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_BASE, httpOnly: true, maxAge: 86400 * 30 * 1000 });
  res.cookie('logged_in', 'true', { ...COOKIE_BASE, maxAge: 86400 * 30 * 1000 });
  res.cookie('user_info', JSON.stringify(publicUser), { ...COOKIE_BASE, maxAge: 86400 * 30 * 1000 });
}

export async function registerHandler(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const result = await register(parsed.data.email, parsed.data.password, parsed.data.companyName);
    setSessionCookies(res, result.token, result.refreshToken, result.user);
    writeAuditLog(undefined, result.user.id, 'USER_REGISTER', { email: result.user.email, companyName: parsed.data.companyName });

    res.json({ token: result.token, user: result.user });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error('Register Error:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const result = await login(parsed.data.email, parsed.data.password);
    setSessionCookies(res, result.token, result.refreshToken, result.user);
    writeAuditLog(undefined, result.user.id, 'USER_LOGIN', { email: result.user.email });

    res.json({ token: result.token, user: result.user });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}

export async function meHandler(req: Request, res: Response) {
  const session = await getAuthUser(req, res);
  if (!session) return res.status(401).json({ error: 'Não autorizado.' });

  const user = await findUserById(session.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  res.json({
    user: {
      id: user.id,
      name: user.email.split('@')[0],
      company: user.companyName,
      email: user.email,
      role: session.role,
    },
  });
}

export async function logoutHandler(req: Request, res: Response) {
  const session = await getAuthUser(req, res);
  if (session) {
    writeAuditLog(session.tenantId, session.id, 'USER_LOGOUT', { email: session.email });
  }
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('logged_in');
  res.clearCookie('user_info');
  res.json({ success: true, message: 'Desconectado com sucesso.' });
}
