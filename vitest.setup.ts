import { vi } from 'vitest';

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
