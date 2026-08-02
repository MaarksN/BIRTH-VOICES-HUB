import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    setting: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { findSetting, upsertSetting, deleteSetting } from '../src/repositories/settingRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('settingRepository.findSetting', () => {
  it('queries by tenantId, userId, and key', async () => {
    vi.mocked(prisma.setting.findFirst).mockResolvedValue({ id: 'set-1' } as any);

    const result = await findSetting('tenant-1', 'user-1', 'theme');

    expect(prisma.setting.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'user-1', key: 'theme' },
    });
    expect(result).toEqual({ id: 'set-1' });
  });

  it('supports null tenantId/userId for global settings', async () => {
    vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);

    await findSetting(null, null, 'global-flag');

    expect(prisma.setting.findFirst).toHaveBeenCalledWith({
      where: { tenantId: null, userId: null, key: 'global-flag' },
    });
  });
});

describe('settingRepository.upsertSetting', () => {
  it('updates the existing setting when one is found', async () => {
    vi.mocked(prisma.setting.findFirst).mockResolvedValue({ id: 'set-1' } as any);
    vi.mocked(prisma.setting.update).mockResolvedValue({ id: 'set-1', value: 'dark' } as any);

    const result = await upsertSetting('tenant-1', 'user-1', 'theme', 'dark');

    expect(prisma.setting.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'user-1', key: 'theme' },
    });
    expect(prisma.setting.update).toHaveBeenCalledWith({ where: { id: 'set-1' }, data: { value: 'dark' } });
    expect(prisma.setting.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'set-1', value: 'dark' });
  });

  it('creates a new setting when none exists, marking it global when tenantId and userId are absent', async () => {
    vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.setting.create).mockResolvedValue({ id: 'set-2' } as any);

    const result = await upsertSetting(null, null, 'global-flag', true);

    expect(prisma.setting.create).toHaveBeenCalledWith({
      data: { tenantId: null, userId: null, key: 'global-flag', value: true, isGlobal: true },
    });
    expect(result).toEqual({ id: 'set-2' });
  });

  it('creates a non-global setting when tenantId is present', async () => {
    vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.setting.create).mockResolvedValue({ id: 'set-3' } as any);

    await upsertSetting('tenant-1', null, 'feature-x', false);

    expect(prisma.setting.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', userId: null, key: 'feature-x', value: false, isGlobal: false },
    });
  });

  it('falls back to update on a unique-constraint race (P2002) if a row now exists', async () => {
    vi.mocked(prisma.setting.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'set-race' } as any);

    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    vi.mocked(prisma.setting.create).mockRejectedValue(p2002);
    vi.mocked(prisma.setting.update).mockResolvedValue({ id: 'set-race', value: 'raced' } as any);

    const result = await upsertSetting('tenant-1', 'user-1', 'theme', 'raced');

    expect(prisma.setting.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.setting.update).toHaveBeenCalledWith({ where: { id: 'set-race' }, data: { value: 'raced' } });
    expect(result).toEqual({ id: 'set-race', value: 'raced' });
  });

  it('rethrows non-P2002 errors from create', async () => {
    vi.mocked(prisma.setting.findFirst).mockResolvedValue(null);
    const otherError = new Error('boom');
    vi.mocked(prisma.setting.create).mockRejectedValue(otherError);

    await expect(upsertSetting('tenant-1', 'user-1', 'theme', 'x')).rejects.toThrow('boom');
  });

  it('rethrows P2002 errors when the race lookup still finds nothing', async () => {
    vi.mocked(prisma.setting.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    vi.mocked(prisma.setting.create).mockRejectedValue(p2002);

    await expect(upsertSetting('tenant-1', 'user-1', 'theme', 'x')).rejects.toBe(p2002);
    expect(prisma.setting.update).not.toHaveBeenCalled();
  });
});

describe('settingRepository.deleteSetting', () => {
  it('deletes settings matching tenantId, userId, and key', async () => {
    vi.mocked(prisma.setting.deleteMany).mockResolvedValue({ count: 1 } as any);

    const result = await deleteSetting('tenant-1', 'user-1', 'theme');

    expect(prisma.setting.deleteMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'user-1', key: 'theme' },
    });
    expect(result).toEqual({ count: 1 });
  });
});
