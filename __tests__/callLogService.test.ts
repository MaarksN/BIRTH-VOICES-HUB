import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/callLogRepository.js', () => ({
  listCallLogsForTenant: vi.fn(),
  createCallLog: vi.fn(),
  findCallLogForTenant: vi.fn(),
  updateCallLog: vi.fn(),
  deleteCallLog: vi.fn(),
}));

import { findCallLogForTenant, updateCallLog as updateCallLogRepo, deleteCallLog as deleteCallLogRepo } from '../src/repositories/callLogRepository.js';
import { updateCallLog, deleteCallLog, NotFoundError } from '../src/services/callLogService.js';

const mockFind = vi.mocked(findCallLogForTenant);
const mockUpdate = vi.mocked(updateCallLogRepo);
const mockDelete = vi.mocked(deleteCallLogRepo);

type CallLogRow = Awaited<ReturnType<typeof findCallLogForTenant>>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('callLogService.updateCallLog', () => {
  it('throws NotFoundError when the log does not belong to the tenant', async () => {
    mockFind.mockResolvedValue(null);
    await expect(updateCallLog('log-1', 'tenant-1', { status: 'Concluído' })).rejects.toThrow(NotFoundError);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates when the log belongs to the tenant', async () => {
    mockFind.mockResolvedValue({ id: 'log-1' } as CallLogRow);
    await updateCallLog('log-1', 'tenant-1', { status: 'Concluído' });
    expect(mockUpdate).toHaveBeenCalledWith('log-1', { status: 'Concluído' });
  });
});

describe('callLogService.deleteCallLog', () => {
  it('throws NotFoundError for a cross-tenant delete attempt', async () => {
    mockFind.mockResolvedValue(null);
    await expect(deleteCallLog('log-1', 'tenant-1')).rejects.toThrow(NotFoundError);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
