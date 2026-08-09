import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-unit-tests-12345';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-token-secret-12345';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://devuser:devpassword@localhost:5432/birthvoices?schema=public';

// Fallback in-memory mock para globalThis.__prisma quando o banco Postgres local não estiver rodando
if (!globalThis.__prisma) {
  const matchWhere = (r: any, where: any): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([k, v]) => {
      if (v === undefined) return true;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if ('equals' in v) return r[k] === (v as any).equals;
        if ('in' in v && Array.isArray((v as any).in)) return (v as any).in.includes(r[k]);
        if ('not' in v) return r[k] !== (v as any).not;
      }
      return r[k] === v;
    });
  };

  const rolesMap = new Map<string, any>();

  const createModelMock = (name: string) => {
    const records: any[] = [];
    return {
      findFirst: vi.fn(async ({ where, include }: any = {}) => {
        const item = records.find(r => matchWhere(r, where)) ?? (where ? null : records[records.length - 1] ?? null);
        if (!item) return null;
        const res = { ...item };
        if (include?.memberships) {
          res.memberships = res.memberships || [{ role: rolesMap.get(res.roleId) || { id: 'role-admin', name: 'admin', code: 'admin' } }];
        }
        if (include?.role) {
          res.role = res.role || rolesMap.get(res.roleId) || { id: res.roleId || 'role-admin', name: 'admin', code: 'admin' };
        }
        return res;
      }),
      findUnique: vi.fn(async ({ where, include }: any = {}) => {
        if (!where) return null;
        const item = records.find(r => matchWhere(r, where)) ?? null;
        if (!item) return null;
        const res = { ...item };
        if (include?.memberships) {
          res.memberships = res.memberships || [{ role: rolesMap.get(res.roleId) || { id: 'role-admin', name: 'admin', code: 'admin' } }];
        }
        if (include?.role) {
          res.role = res.role || rolesMap.get(res.roleId) || { id: res.roleId || 'role-admin', name: 'admin', code: 'admin' };
        }
        return res;
      }),
      findMany: vi.fn(async ({ where, include }: any = {}) => {
        let list = where ? records.filter(r => matchWhere(r, where)) : [...records];
        if (include) {
          list = list.map(r => {
            const res = { ...r };
            if (include.memberships) {
              res.memberships = res.memberships || [{ role: rolesMap.get(res.roleId) || { id: 'role-admin', name: 'admin', code: 'admin' } }];
            }
            if (include.role) {
              res.role = res.role || rolesMap.get(res.roleId) || { id: res.roleId || 'role-admin', name: 'admin', code: 'admin' };
            }
            return res;
          });
        }
        return list;
      }),
      create: vi.fn(async ({ data }: any) => {
        const item = {
          id: data.id || `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          ...data,
        };
        if (name === 'role') {
          rolesMap.set(item.id, item);
        }
        records.push(item);
        return item;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        let item = records.find(r => matchWhere(r, where));
        if (!item) {
          item = { id: where?.id || `${name}-1`, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...data };
          records.push(item);
        } else {
          Object.assign(item, data);
        }
        return item;
      }),
      updateMany: vi.fn(async ({ where, data }: any = {}) => {
        let count = 0;
        for (const r of records) {
          if (matchWhere(r, where)) {
            Object.assign(r, data);
            count++;
          }
        }
        return { count };
      }),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        let item = records.find(r => matchWhere(r, where));
        if (item) {
          Object.assign(item, update);
        } else {
          item = { id: create.id || `${name}-${Date.now()}`, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...create };
          records.push(item);
        }
        return item;
      }),
      delete: vi.fn(async ({ where }: any = {}) => {
        const index = records.findIndex(r => matchWhere(r, where));
        const item = index !== -1 ? records.splice(index, 1)[0] : { id: `${name}-deleted` };
        return item;
      }),
      deleteMany: vi.fn(async ({ where }: any = {}) => {
        if (!where) {
          const count = records.length;
          records.length = 0;
          return { count };
        }
        let count = 0;
        for (let i = records.length - 1; i >= 0; i--) {
          if (matchWhere(records[i], where)) {
            records.splice(i, 1);
            count++;
          }
        }
        return { count };
      }),
      count: vi.fn(async ({ where }: any = {}) => {
        if (!where) return records.length;
        return records.filter(r => matchWhere(r, where)).length;
      }),
    };
  };

  (globalThis as any).__prisma = {
    user: createModelMock('user'),
    tenant: createModelMock('tenant'),
    membership: createModelMock('membership'),
    role: createModelMock('role'),
    session: createModelMock('session'),
    metric: createModelMock('metric'),
    agent: createModelMock('agent'),
    workflow: createModelMock('workflow'),
    callLog: createModelMock('callLog'),
    auditLog: createModelMock('auditLog'),
    setting: createModelMock('setting'),
    $connect: vi.fn(async () => {}),
    $disconnect: vi.fn(async () => {}),
  };
}

vi.mock('ioredis', () => {
  return {
    Redis: class {
      incr() { return Promise.resolve(1); }
      expire() { return Promise.resolve(1); }
      on() {}
      status = 'ready';
    }
  };
});

vi.mock('bullmq', () => {
  return {
    Queue: class {
      add() { return Promise.resolve({ id: 'mock-job-id' }); }
      on() {}
    },
    Worker: class {
      on() {}
    }
  };
});
