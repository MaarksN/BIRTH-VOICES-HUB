import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../src/services/settingService.js', () => ({
  getAiConsent: vi.fn(),
}));

import { getAiConsent } from '../src/services/settingService.js';
import { requireAiProviderConsent } from '../src/middlewares/aiConsent.js';

const mockGetAiConsent = vi.mocked(getAiConsent);

function responseDouble() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return {
    res: { status, json } as unknown as Response,
    status,
    json,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireAiProviderConsent', () => {
  it('fails closed when no authenticated tenant is present', async () => {
    const { res, status, json } = responseDouble();
    const next = vi.fn() as NextFunction;

    await requireAiProviderConsent({} as Request, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TENANT_REQUIRED' }));
    expect(mockGetAiConsent).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks external AI processing when consent is absent', async () => {
    mockGetAiConsent.mockResolvedValue({
      granted: false,
      grantedAt: null,
      revokedAt: null,
      grantedByUserId: null,
    });
    const { res, status, json } = responseDouble();
    const next = vi.fn() as NextFunction;
    const req = { tenantId: 'tenant-1' } as Request;

    await requireAiProviderConsent(req, res, next);

    expect(mockGetAiConsent).toHaveBeenCalledWith('tenant-1');
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AI_PROVIDER_CONSENT_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows the request only after explicit tenant consent', async () => {
    mockGetAiConsent.mockResolvedValue({
      granted: true,
      grantedAt: '2026-08-14T12:00:00.000Z',
      revokedAt: null,
      grantedByUserId: 'user-1',
    });
    const { res } = responseDouble();
    const next = vi.fn() as NextFunction;
    const req = { tenantId: 'tenant-1' } as Request;

    await requireAiProviderConsent(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 503 instead of bypassing consent when the consent store is unavailable', async () => {
    mockGetAiConsent.mockRejectedValue(new Error('database unavailable'));
    const { res, status, json } = responseDouble();
    const next = vi.fn() as NextFunction;
    const req = { tenantId: 'tenant-1' } as Request;

    await requireAiProviderConsent(req, res, next);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AI_CONSENT_CHECK_UNAVAILABLE' }));
    expect(next).not.toHaveBeenCalled();
  });
});
