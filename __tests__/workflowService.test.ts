import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/workflowRepository.js', () => ({
  findWorkflowForTenant: vi.fn(),
  upsertWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
}));

import { findWorkflowForTenant, upsertWorkflow, deleteWorkflow } from '../src/repositories/workflowRepository.js';
import { saveWorkflow, updateWorkflow, removeWorkflow, NotFoundError } from '../src/services/workflowService.js';

const mockFind = vi.mocked(findWorkflowForTenant);
const mockUpsert = vi.mocked(upsertWorkflow);
const mockDelete = vi.mocked(deleteWorkflow);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workflowService.saveWorkflow', () => {
  it('creates a new workflow when none exists for the tenant', async () => {
    mockFind.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({ id: 'wf-1', name: 'New Flow' } as Awaited<ReturnType<typeof upsertWorkflow>>);

    await saveWorkflow('tenant-1', 'user-1', { name: 'New Flow' });
    expect(mockUpsert).toHaveBeenCalledWith('tenant-1', 'user-1', null, { name: 'New Flow' });
  });

  it('updates the existing workflow id when one already exists', async () => {
    mockFind.mockResolvedValue({ id: 'wf-existing', name: 'Old' } as Awaited<ReturnType<typeof findWorkflowForTenant>>);
    mockUpsert.mockResolvedValue({ id: 'wf-existing', name: 'Updated' } as Awaited<ReturnType<typeof upsertWorkflow>>);

    await saveWorkflow('tenant-1', 'user-1', { name: 'Updated' });
    expect(mockUpsert).toHaveBeenCalledWith('tenant-1', 'user-1', 'wf-existing', { name: 'Updated' });
  });
});

describe('workflowService.updateWorkflow', () => {
  it('throws NotFoundError when no workflow exists yet', async () => {
    mockFind.mockResolvedValue(null);

    await expect(updateWorkflow('tenant-1', 'user-1', { name: 'x' })).rejects.toThrow(NotFoundError);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe('workflowService.removeWorkflow', () => {
  it('throws NotFoundError when nothing to delete', async () => {
    mockFind.mockResolvedValue(null);
    await expect(removeWorkflow('tenant-1')).rejects.toThrow(NotFoundError);
  });

  it('deletes the tenant workflow when it exists', async () => {
    mockFind.mockResolvedValue({ id: 'wf-1' } as Awaited<ReturnType<typeof findWorkflowForTenant>>);
    await removeWorkflow('tenant-1');
    expect(mockDelete).toHaveBeenCalledWith('wf-1');
  });
});
