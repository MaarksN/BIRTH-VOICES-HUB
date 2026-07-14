import { Request, Response } from 'express'; import crypto from 'crypto'; import { registerSchema, loginSchema } from '../validators/auth.js'; import { userRepository } from '../repositories/userRepository.js'; import { hashPassword, verifyPassword, generateToken, generateRefreshToken } from '../services/auth.js';
export const authController = {
  register: (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { email, password, companyName } = parsed.data; if (userRepository.findByEmail(email)) return res.status(400).json({ error: "Email cadastrado." });
    const newUser = userRepository.create({ id: crypto.randomUUID(), email: email.toLowerCase(), passwordHash: hashPassword(password), companyName, role: userRepository.count() === 0 ? 'admin' : 'user', createdAt: new Date().toISOString() });
    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role }); const refreshToken = generateRefreshToken({ id: newUser.id });
    res.cookie('access_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 900000 }); res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 2592000000 }); res.json({ token, role: newUser.role, companyName: newUser.companyName });
  },
  login: (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const user = userRepository.findByEmail(parsed.data.email); if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) return res.status(401).json({ error: 'Credenciais inválidas.' });
    const token = generateToken({ id: user.id, email: user.email, role: user.role }); const refreshToken = generateRefreshToken({ id: user.id });
    res.cookie('access_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 900000 }); res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 2592000000 }); res.json({ token, role: user.role, companyName: user.companyName });
  },
  logout: (req: Request, res: Response) => { res.clearCookie('access_token'); res.clearCookie('refresh_token'); res.json({ success: true }); },
  me: (req: any, res: Response) => { const user = userRepository.findById(req.user?.id); if (!user) return res.status(401).json({ error: 'Não autorizado.' }); res.json({ id: user.id, email: user.email, companyName: user.companyName, role: user.role }); }
};
