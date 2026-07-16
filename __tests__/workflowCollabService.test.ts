import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/workflowRepository.js', () => ({
  findWorkflowForTenant: vi.fn(),
  findWorkflowById: vi.fn(),
  updateMetadataIfVersion: vi.fn(),
}));

import { findWorkflowForTenant, findWorkflowById, updateMetadataIfVersion } from '../src/repositories/workflowRepository.js';
import { addComment, lockNode, ConflictError } from '../src/services/workflowCollabService.js';
import { NotFoundError } from '../src/services/workflowService.js';

const mockFind = vi.mocked(findWorkflowForTenant);
const mockFindById = vi.mocked(findWorkflowById);
const mockUpdateIfVersion = vi.mocked(updateMetadataIfVersion);

type Workflow = Awaited<ReturnType<typeof findWorkflowForTenant>>;

function workflow(overrides: Partial<NonNullable<Workflow>> = {}): NonNullable<Workflow> {
  return {
    id: 'wf-1',
    tenantId: 'tenant-1',
    userId: null,
    name: 'Flow',
    description: null,
    version: 1,
    status: 'draft',
    nodes: [],
    edges: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  } as NonNullable<Workflow>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workflowCollabService concurrency', () => {
  it('throws NotFoundError when no workflow exists for the tenant', async () => {
    mockFind.mockResolvedValue(null);
    await expect(addComment('tenant-1', 'user-1', 'node-1', 'hi')).rejects.toThrow(NotFoundError);
  });

  it('retries with fresh data when another writer wins the version race, then succeeds', async () => {
    mockFind
      .mockResolvedValueOnce(workflow({ version: 1, metadata: {} }))
      .mockResolvedValueOnce(workflow({ version: 2, metadata: { comments: [{ id: 'other', nodeId: 'n', userId: 'u', text: 't', timestamp: 1, resolved: false }] } }));
    mockUpdateIfVersion
      .mockResolvedValueOnce(0) // first attempt loses the race (version moved under us)
      .mockResolvedValueOnce(1); // retry succeeds against the fresh version
    mockFindById.mockResolvedValue(workflow({ version: 3 }));

    await addComment('tenant-1', 'user-1', 'node-1', 'hello');

    expect(mockUpdateIfVersion).toHaveBeenCalledTimes(2);
    expect(mockUpdateIfVersion).toHaveBeenNthCalledWith(1, 'wf-1', 1, 'user-1', expect.any(Object));
    expect(mockUpdateIfVersion).toHaveBeenNthCalledWith(2, 'wf-1', 2, 'user-1', expect.any(Object));
    // Second attempt's payload must preserve the concurrently-added comment, not silently drop it.
    const secondPayload = mockUpdateIfVersion.mock.calls[1][3] as { comments: Array<{ id: string }> };
    expect(secondPayload.comments.map((c) => c.id)).toEqual(expect.arrayContaining(['other']));
  });

  it('gives up after repeated version conflicts instead of retrying forever', async () => {
    mockFind.mockResolvedValue(workflow({ version: 1 }));
    mockUpdateIfVersion.mockResolvedValue(0);

    await expect(addComment('tenant-1', 'user-1', 'node-1', 'hello')).rejects.toThrow(ConflictError);
  });

  it('rejects locking a node another user holds within the TTL, without touching the DB write', async () => {
    mockFind.mockResolvedValue(
      workflow({ version: 1, metadata: { locks: { 'node-1': { userId: 'other-user', timestamp: Date.now() } } } })
    );

    await expect(lockNode('tenant-1', 'user-1', 'node-1')).rejects.toThrow(ConflictError);
    expect(mockUpdateIfVersion).not.toHaveBeenCalled();
  });

  it('allows the same user to re-lock (heartbeat) a node they already hold', async () => {
    mockFind.mockResolvedValue(
      workflow({ version: 1, metadata: { locks: { 'node-1': { userId: 'user-1', timestamp: Date.now() - 1000 } } } })
    );
    mockUpdateIfVersion.mockResolvedValue(1);
    mockFindById.mockResolvedValue(workflow({ version: 2 }));

    await lockNode('tenant-1', 'user-1', 'node-1');
    expect(mockUpdateIfVersion).toHaveBeenCalledTimes(1);
  });
});
