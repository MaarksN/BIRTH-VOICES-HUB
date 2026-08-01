export function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (url) return url;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL não está configurado. Defina esta variável de ambiente antes de iniciar o servidor em produção.');
  }
  return 'redis://localhost:6379';
}

// Plain-object connection options (host/port/password/...) rather than a live ioredis
// instance, so BullMQ can construct its own connection internally using its bundled
// ioredis version instead of ours — the two versions' Redis classes are structurally
// incompatible for TypeScript despite being wire-compatible.
export function getRedisConnectionOptions(): { host: string; port: number; username?: string; password?: string; tls?: Record<string, never> } {
  const parsed = new URL(getRedisUrl());
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}
