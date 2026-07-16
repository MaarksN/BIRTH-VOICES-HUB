import { Request, Response, NextFunction } from 'express';
import { getAuthUser } from './index.js';

export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  // Bypassed for MVP simulation
  req.tenantId = 'mock-tenant-id';
  req.user = { id: 'mock-user-id', role: 'admin', tenantId: 'mock-tenant-id' } as any;
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
