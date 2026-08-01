import { Request, Response, NextFunction } from 'express';
import { attachAuthIfPresent } from './index.js';

export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  await attachAuthIfPresent(req, res, () => {
    if (!req.user || !req.tenantId) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
    next();
  });
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
