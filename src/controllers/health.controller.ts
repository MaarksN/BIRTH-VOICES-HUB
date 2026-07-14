import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { prisma } from '../lib/prisma.js';

export function healthHandler(_req: Request, res: Response) {
  res.status(200).json({ status: 'ok' });
}

export function liveHandler(_req: Request, res: Response) {
  res.status(200).json({ status: 'ok' });
}

export function makeReadyHandler(redisClient: Redis) {
  return async (_req: Request, res: Response) => {
    const checks: Record<string, 'ok' | 'error'> = { database: 'error', redis: 'error' };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      const pong = await redisClient.ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'error';
    } catch {
      checks.redis = 'error';
    }

    const ready = Object.values(checks).every((v) => v === 'ok');
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks });
  };
}
