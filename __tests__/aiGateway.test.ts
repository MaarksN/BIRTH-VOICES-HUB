import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit } from '../lib/aiGateway';

describe('aiGateway checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('allows requests up to the specified limit', () => {
    const key = 'user1';

    // First request should be allowed
    expect(checkRateLimit(key, 2, 60000)).toBe(true);

    // Second request should be allowed (reaches limit)
    expect(checkRateLimit(key, 2, 60000)).toBe(true);
  });

  it('rejects requests exceeding the specified limit', () => {
    const key = 'user2';

    // Fill up to the limit
    expect(checkRateLimit(key, 2, 60000)).toBe(true);
    expect(checkRateLimit(key, 2, 60000)).toBe(true);

    // Third request should be rejected
    expect(checkRateLimit(key, 2, 60000)).toBe(false);
  });

  it('resets the rate limit counter after the window expires', () => {
    const key = 'user3';

    // Fill up to the limit
    expect(checkRateLimit(key, 2, 60000)).toBe(true);
    expect(checkRateLimit(key, 2, 60000)).toBe(true);
    expect(checkRateLimit(key, 2, 60000)).toBe(false);

    // Fast-forward time past window (60000ms + 1ms)
    vi.advanceTimersByTime(60001);

    // The counter should be reset now, so next request is allowed
    expect(checkRateLimit(key, 2, 60000)).toBe(true);
  });

  it('tracks independent rate limits for different keys', () => {
    const userA = 'userA';
    const userB = 'userB';

    // User A hits the limit
    expect(checkRateLimit(userA, 1, 60000)).toBe(true);
    expect(checkRateLimit(userA, 1, 60000)).toBe(false);

    // User B should still be able to make requests
    expect(checkRateLimit(userB, 1, 60000)).toBe(true);
  });

  it('does not reset early if the time advanced is less than window', () => {
    const key = 'user4';

    expect(checkRateLimit(key, 1, 60000)).toBe(true);
    expect(checkRateLimit(key, 1, 60000)).toBe(false); // At limit

    // Advance by half the window
    vi.advanceTimersByTime(30000);

    // Still should be rejected since window hasn't passed
    expect(checkRateLimit(key, 1, 60000)).toBe(false);
  });
});
