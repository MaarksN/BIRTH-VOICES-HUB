import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../server.js';
import * as userRepository from '../src/repositories/userRepository.js';
import * as tenantRepository from '../src/repositories/tenantRepository.js';
import * as roleRepository from '../src/repositories/roleRepository.js';
import bcrypt from 'bcryptjs';

let app: Express;

vi.mock('../src/repositories/userRepository.js', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  createMembership: vi.fn(),
  findMembershipWithRole: vi.fn()
}));

vi.mock('../src/repositories/tenantRepository.js', () => ({
  createTenant: vi.fn()
}));

vi.mock('../src/repositories/roleRepository.js', () => ({
  getOrCreateSystemRole: vi.fn()
}));

vi.mock('../src/repositories/metricRepository.js', () => ({
  createMetric: vi.fn()
}));

beforeAll(async () => {
  app = await appPromise;
});

describe('Authentication API', () => {
  it('should register a new user', async () => {
    vi.mocked(userRepository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(tenantRepository.createTenant).mockResolvedValue({ id: 'tenant-1' } as any);
    vi.mocked(roleRepository.getOrCreateSystemRole).mockResolvedValue({ id: 'role-1' } as any);
    vi.mocked(userRepository.createUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com', passwordHash: 'hash', companyName: 'Test Inc', tenantId: 'tenant-1' } as any);
    vi.mocked(userRepository.createMembership).mockResolvedValue(true as any);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        companyName: 'Test Inc'
      });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email');
  });

  it('should login an existing user', async () => {
    vi.mocked(userRepository.findUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'login@example.com',
      passwordHash: bcrypt.hashSync('password123', 1),
      tenantId: 'tenant-1',
      companyName: 'Test Inc'
    } as any);

    vi.mocked(userRepository.findMembershipWithRole).mockResolvedValue({
      role: { name: 'admin' }
    } as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject invalid passwords', async () => {
    vi.mocked(userRepository.findUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'invalid@example.com',
      passwordHash: bcrypt.hashSync('password123', 1),
      tenantId: 'tenant-1',
      companyName: 'Test Inc'
    } as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciais inválidas.');
  });
});
