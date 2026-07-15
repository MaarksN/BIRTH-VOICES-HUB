import { describe, it, expect, beforeAll } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../src/lib/auth-tokens.js';

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret';
});

describe('Password hashing', () => {
  it('hashes a password and verifies it correctly', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
    expect(verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('returns false for an empty stored hash instead of throwing', () => {
    expect(verifyPassword('anything', '')).toBe(false);
  });
});

describe('Access tokens', () => {
  const payload = { id: 'user-1', email: 'user@example.com', role: 'admin', tenantId: 'tenant-1' };

  it('round-trips a valid token', () => {
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    expect(decoded).toEqual(payload);
  });

  it('rejects a tampered token', () => {
    const token = generateToken(payload);
    const tampered = token.slice(0, -2) + 'xx';
    expect(verifyToken(tampered)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(verifyToken('not-a-real-token')).toBeNull();
  });

  it('rejects an empty token', () => {
    expect(verifyToken('')).toBeNull();
  });

  it('does not accept a refresh token as an access token', () => {
    const refreshToken = generateRefreshToken({ id: 'user-1' });
    // Different secret/shape entirely — verifying it as an access token must fail closed.
    expect(verifyToken(refreshToken)).toBeNull();
  });
});

describe('Refresh tokens', () => {
  it('round-trips a valid refresh token', () => {
    const token = generateRefreshToken({ id: 'user-1' });
    expect(verifyRefreshToken(token)).toEqual({ id: 'user-1' });
  });

  it('rejects a tampered refresh token', () => {
    const token = generateRefreshToken({ id: 'user-1' });
    const tampered = token.slice(0, -2) + 'zz';
    expect(verifyRefreshToken(tampered)).toBeNull();
  });
});

describe('Secret configuration', () => {
  it('throws instead of silently signing when JWT_SECRET is unset', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(() => generateToken({ id: 'x', email: 'x@example.com', role: 'user', tenantId: 't' })).toThrow();
    } finally {
      process.env.JWT_SECRET = original;
    }
  });
});
