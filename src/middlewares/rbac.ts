import { Request, Response, NextFunction } from 'express';
import { getAuthUser } from './index.js';

export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  const session = await getAuthUser(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  if (!session.tenantId) {
    return res.status(403).json({ error: 'Acesso negado. Usuário sem tenant associado.' });
  }

  req.tenantId = session.tenantId;
  req.user = session;
  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.user;
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    if (!allowedRoles.includes(session.role)) {
      return res.status(403).json({ error: `Acesso proibido. Requer nível: ${allowedRoles.join(' ou ')}.` });
    }

    next();
  };
};
