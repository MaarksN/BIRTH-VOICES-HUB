import { Request, Response } from 'express';
import crypto from 'crypto';
import { readDb, writeDb, hashPassword, verifyPassword, generateToken, generateRefreshToken, User } from '../repositories/db.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { writeAuditLog } from '../services/audit.js';
import { getAuthUser } from '../middlewares/index.js';

export const register = (req: Request, res: Response) => {
  try {
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
      role: isFirstUser ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDb(db);

    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });
    const refreshToken = generateRefreshToken({ id: newUser.id });

    res.cookie('access_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 900000 });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400 * 30 * 1000 });
    res.cookie('logged_in', 'true', { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400 * 30 * 1000 });
    res.cookie('user_info', JSON.stringify({ id: newUser.id, name: newUser.email.split('@')[0], company: newUser.companyName, email: newUser.email, role: newUser.role }), { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400 * 30 * 1000 });

    writeAuditLog(newUser.id, "USER_REGISTER", { email: newUser.email, companyName });

    res.json({ token, user: { id: newUser.id, name: newUser.email.split('@')[0], company: newUser.companyName, email: newUser.email, role: newUser.role } });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

export const login = (req: Request, res: Response) => {
  try {
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

    res.cookie('access_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 900000 });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400 * 30 * 1000 });
    res.cookie('logged_in', 'true', { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400 * 30 * 1000 });
    res.cookie('user_info', JSON.stringify({ id: user.id, name: user.email.split('@')[0], company: user.companyName, email: user.email, role: user.role || 'user' }), { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400 * 30 * 1000 });

    writeAuditLog(user.id, "USER_LOGIN", { email: user.email });

    res.json({ token, user: { id: user.id, name: user.email.split('@')[0], company: user.companyName, email: user.email, role: user.role || 'user' } });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

export const me = (req: Request, res: Response) => {
  const session = getAuthUser(req, res);
  if (!session) return res.status(401).json({ error: "Não autorizado." });
  res.json({ user: session });
};

export const logout = (req: Request, res: Response) => {
  const session = getAuthUser(req, res);
  if (session) {
    writeAuditLog(session.id, "USER_LOGOUT", { email: session.email });
  }
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('logged_in');
  res.clearCookie('user_info');
  res.json({ success: true, message: "Desconectado com sucesso." });
};
