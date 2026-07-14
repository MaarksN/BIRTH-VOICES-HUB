import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { appPromise } from '../server.js';
import { readDb } from '../src/repositories/db.js';

let app: any;

beforeAll(async () => {
  app = await appPromise;
});

describe('Authentication API', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test' + Date.now() + '@example.com',
        password: 'password123',
        companyName: 'Test Inc'
      });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email');
  });

  it('should login an existing user', async () => {
    const email = 'login' + Date.now() + '@example.com';
    const password = 'password123';
    
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        companyName: 'Test Inc'
      });

    // Then login
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject invalid passwords', async () => {
    const email = 'invalid' + Date.now() + '@example.com';
    
    await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'password123',
        companyName: 'Test Inc'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciais inválidas.');
  });
});
