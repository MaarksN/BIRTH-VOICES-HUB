import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import type { Redis } from 'ioredis';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from '../src/lib/prisma.js';
import { makeReadyHandler } from '../src/controllers/health.controller.js';

const mockQueryRaw = vi.mocked(prisma.$queryRaw);

function makeMockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeMockRedis(behavior: 'ok' | 'wrong-reply' | 'throws'): Redis {
  return {
    ping: vi.fn().mockImplementation(async () => {
      if (behavior === 'throws') throw new Error('connection refused');
      return behavior === 'ok' ? 'PONG' : 'WRONG';
    }),
  } as unknown as Redis;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /ready', () => {
  it('returns 200 with all checks ok when db and redis are healthy', async () => {
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const redis = makeMockRedis('ok');
    const res = makeMockResponse();

    await makeReadyHandler(redis)({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ready', checks: { database: 'ok', redis: 'ok' } });
  });

  it('returns 503 when the database query throws', async () => {
    mockQueryRaw.mockRejectedValue(new Error('connection refused'));
    const redis = makeMockRedis('ok');
    const res = makeMockResponse();

    await makeReadyHandler(redis)({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: 'not_ready', checks: { database: 'error', redis: 'ok' } });
  });

  it('returns 503 when redis ping throws (e.g. connection timeout)', async () => {
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const redis = makeMockRedis('throws');
    const res = makeMockResponse();

    await makeReadyHandler(redis)({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: 'not_ready', checks: { database: 'ok', redis: 'error' } });
  });

  it('returns 503 when redis responds with something other than PONG', async () => {
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const redis = makeMockRedis('wrong-reply');
    const res = makeMockResponse();

    await makeReadyHandler(redis)({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(503);
  });
});
