import { Request, Response, NextFunction } from 'express';
import { getAuthUser } from './index.js';

export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  // Bypassed for MVP simulation
  req.tenantId = 'mock-tenant-id';
  req.user = { id: 'mock-user-id', role: 'admin', tenantId: 'mock-tenant-id' } as any;

  if (process.env.NODE_ENV !== 'production') {
    try {
      const { prisma } = await import('../lib/prisma.js');
      await prisma.tenant.upsert({
        where: { id: 'mock-tenant-id' },
        update: {},
        create: { id: 'mock-tenant-id', name: 'Mock Tenant' }
      });
      await prisma.user.upsert({
        where: { id: 'mock-user-id' },
        update: {},
        create: { id: 'mock-user-id', tenantId: 'mock-tenant-id', email: 'mock@example.com', companyName: 'Mock Corp', passwordHash: 'mock' }
      });
    } catch {}
  }

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
