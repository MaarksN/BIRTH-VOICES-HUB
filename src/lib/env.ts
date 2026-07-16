export function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (url) return url;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL não está configurado. Defina esta variável de ambiente antes de iniciar o servidor em produção.');
  }
  return 'redis://localhost:6379';
}
