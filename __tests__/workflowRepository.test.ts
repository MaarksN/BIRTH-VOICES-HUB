import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    workflow: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import {
  findWorkflowForTenant,
  upsertWorkflow,
  deleteWorkflow,
  findWorkflowById,
  updateMetadataIfVersion,
} from '../src/repositories/workflowRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('workflowRepository.findWorkflowForTenant', () => {
  it('queries by tenant, excludes soft-deleted rows, orders by updatedAt desc', async () => {
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue({ id: 'wf1' } as any);

    const result = await findWorkflowForTenant('tenant-1');

    expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    expect(result).toEqual({ id: 'wf1' });
  });
});

describe('workflowRepository.upsertWorkflow', () => {
  it('updates the existing workflow by id when existingId is provided, passing only defined fields', async () => {
    vi.mocked(prisma.workflow.update).mockResolvedValue({ id: 'wf1', name: 'Updated' } as any);

    const result = await upsertWorkflow('tenant-1', 'user-1', 'wf1', {
      name: 'Updated',
      nodes: [{ id: 'n1' }],
      edges: [],
      metadata: { note: 'x' },
      version: 3,
    });

    expect(prisma.workflow.update).toHaveBeenCalledWith({
      where: { id: 'wf1' },
      data: {
        name: 'Updated',
        nodes: [{ id: 'n1' }],
        edges: [],
        metadata: { note: 'x' },
        version: 3,
        updatedBy: 'user-1',
      },
    });
    expect(prisma.workflow.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'wf1', name: 'Updated' });
  });

  it('coalesces omitted update fields to undefined, leaving them untouched by prisma', async () => {
    vi.mocked(prisma.workflow.update).mockResolvedValue({ id: 'wf1' } as any);

    await upsertWorkflow('tenant-1', 'user-1', 'wf1', {});

    expect(prisma.workflow.update).toHaveBeenCalledWith({
      where: { id: 'wf1' },
      data: {
        name: undefined,
        nodes: undefined,
        edges: undefined,
        metadata: undefined,
        version: undefined,
        updatedBy: 'user-1',
      },
    });
  });

  it('creates a new workflow with defaults when existingId is null', async () => {
    vi.mocked(prisma.workflow.create).mockResolvedValue({ id: 'wf-new' } as any);

    const result = await upsertWorkflow('tenant-1', 'user-1', null, {});

    expect(prisma.workflow.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        name: 'Default Workflow',
        nodes: [],
        edges: [],
        metadata: {},
        version: 1,
      },
    });
    expect(prisma.workflow.update).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'wf-new' });
  });

  it('creates a new workflow using provided fields when existingId is null', async () => {
    vi.mocked(prisma.workflow.create).mockResolvedValue({ id: 'wf-new2' } as any);

    await upsertWorkflow('tenant-1', 'user-1', null, {
      name: 'Custom',
      nodes: [{ id: 'n1' }],
      edges: [{ id: 'e1' }],
      metadata: { k: 'v' },
      version: 5,
    });

    expect(prisma.workflow.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        name: 'Custom',
        nodes: [{ id: 'n1' }],
        edges: [{ id: 'e1' }],
        metadata: { k: 'v' },
        version: 5,
      },
    });
  });
});

describe('workflowRepository.deleteWorkflow', () => {
  it('soft-deletes the workflow by setting deletedAt', async () => {
    vi.mocked(prisma.workflow.update).mockResolvedValue({ id: 'wf1' } as any);
    const before = Date.now();

    const result = await deleteWorkflow('wf1');

    expect(prisma.workflow.update).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.workflow.update).mock.calls[0][0] as any;
    expect(call.where).toEqual({ id: 'wf1' });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
    expect(call.data.deletedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result).toEqual({ id: 'wf1' });
  });
});

describe('workflowRepository.findWorkflowById', () => {
  it('queries by id via findUnique', async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue({ id: 'wf1' } as any);

    const result = await findWorkflowById('wf1');

    expect(prisma.workflow.findUnique).toHaveBeenCalledWith({ where: { id: 'wf1' } });
    expect(result).toEqual({ id: 'wf1' });
  });
});

describe('workflowRepository.updateMetadataIfVersion', () => {
  it('applies the metadata update scoped by id and expected version, increments version, and returns the affected count', async () => {
    vi.mocked(prisma.workflow.updateMany).mockResolvedValue({ count: 1 } as any);

    const result = await updateMetadataIfVersion('wf1', 3, 'user-1', { locked: true });

    expect(prisma.workflow.updateMany).toHaveBeenCalledWith({
      where: { id: 'wf1', version: 3 },
      data: {
        metadata: { locked: true },
        version: { increment: 1 },
        updatedBy: 'user-1',
      },
    });
    expect(result).toBe(1);
  });

  it('returns 0 when the version does not match (lost-update race)', async () => {
    vi.mocked(prisma.workflow.updateMany).mockResolvedValue({ count: 0 } as any);

    const result = await updateMetadataIfVersion('wf1', 99, 'user-1', {});

    expect(result).toBe(0);
  });
});
