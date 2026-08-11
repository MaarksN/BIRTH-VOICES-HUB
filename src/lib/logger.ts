import pino from 'pino';
import { getRequestId } from './requestContext.js';

type LogMeta = Record<string, unknown> | unknown;

// Field-name-based redaction for known secret-bearing keys. This catches secrets passed as
// structured metadata (e.g. `logger.error('...', { apiKey })`) or embedded one level deep in an
// object (e.g. a provider's raw response echoed back for debugging). It does not scan arbitrary
// string values for secret-shaped content — call sites must still avoid interpolating raw
// credentials into the message string itself.
const SECRET_FIELD_NAMES = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'apiKey',
  'api_key',
  'apikey',
  'secret',
  'clientSecret',
  'client_secret',
  'authorization',
  'Authorization',
  'jwtSecret',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'WEBHOOK_SIGNING_SECRET',
  'TWILIO_AUTH_TOKEN',
  'BLAND_API_KEY',
  'ELEVENLABS_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'S3_SECRET_KEY',
  'S3_ACCESS_KEY',
  'OIDC_CLIENT_SECRET',
];

const redactPaths = SECRET_FIELD_NAMES.flatMap((name) => [name, `*.${name}`]);

const base = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  base: undefined, // omit pid/hostname noise; Cloud Run already attaches that context
});

function normalizeMeta(meta: LogMeta): Record<string, unknown> | undefined {
  if (meta === undefined) return undefined;
  if (meta instanceof Error) {
    return { err: meta };
  }
  if (typeof meta === 'object' && meta !== null) {
    return meta as Record<string, unknown>;
  }
  return { detail: meta };
}

function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: LogMeta) {
  const requestId = getRequestId();
  const normalized = normalizeMeta(meta);
  const payload = {
    ...(requestId ? { requestId } : {}),
    ...(normalized || {}),
  };
  base[level](payload, message);
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    log('debug', message, meta);
  },
  info(message: string, meta?: LogMeta) {
    log('info', message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    log('warn', message, meta);
  },
  error(message: string, meta?: LogMeta) {
    log('error', message, meta);
  },
};
