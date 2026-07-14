import { Request, Response, NextFunction } from 'express';
import { getAuthUser } from './index.js';

import { prisma } from '../repositories/db.js';

export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
    const session = getAuthUser(req, res);
    if (!session) {
        return res.status(401).json({ error: "Não autorizado." });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { tenantId: true }
    });

    if (!user || !user.tenantId) {
        return res.status(403).json({ error: "Acesso negado. Usuário sem tenant associado." });
    }

    (req as any).tenantId = user.tenantId;
    (req as any).user = session;
    next();
};

export const requireRole = (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const session = (req as any).user || getAuthUser(req, res);
        if (!session) {
            return res.status(401).json({ error: "Não autorizado." });
        }

        if (!allowedRoles.includes(session.role)) {
            return res.status(403).json({ error: `Acesso proibido. Requer nível: ${allowedRoles.join(' ou ')}.` });
        }

        next();
    };
};
