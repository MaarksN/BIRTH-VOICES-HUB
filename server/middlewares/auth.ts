import { Request, Response, NextFunction } from 'express'; import { verifyToken } from '../services/auth.js';
export interface AuthedRequest extends Request { user?: { id: string; email: string; role: 'admin' | 'user' }; }
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization; if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autorizado.' });
  const user = verifyToken(authHeader.split(' ')[1]); if (!user) return res.status(401).json({ error: 'Token inválido ou expirado.' });
  req.user = user; next();
}
