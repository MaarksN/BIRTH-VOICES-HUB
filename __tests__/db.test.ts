import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { readDb } from '../lib/db';

describe('db.ts tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return DEFAULT_SCHEMA when readFileSync throws an error', () => {
    // Arrange
    const error = new Error('mock error');
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw error;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // We also need to mock existsSync and mkdirSync, writeFileSync from initDatabase inside readDb
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    // Act
    const result = readDb();

    // Assert
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Database read failure, resetting to defaults", error);
    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('workflows');
    expect(result).toHaveProperty('callLogs');
    expect(result).toHaveProperty('brandColors');
    expect(result).toHaveProperty('checklist');
    expect(result).toHaveProperty('auditLogs');
    expect(result).toHaveProperty('settings');
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('sessions');
    expect(Array.isArray(result.users)).toBe(true);
    expect(result.users.length).toBe(0);
  });
});
