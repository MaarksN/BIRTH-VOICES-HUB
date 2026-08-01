import { getRequestId } from './requestContext.js';

type LogMeta = Record<string, unknown> | unknown;

function format(level: string, message: string, meta?: LogMeta) {
  const timestamp = new Date().toISOString();
  const requestId = getRequestId();
  const prefix = requestId ? `[${timestamp}] [${level}] [${requestId}]` : `[${timestamp}] [${level}]`;
  return meta !== undefined
    ? [`${prefix} ${message}`, meta] as const
    : [`${prefix} ${message}`] as const;
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    console.debug(...format('DEBUG', message, meta));
  },
  info(message: string, meta?: LogMeta) {
    console.log(...format('INFO', message, meta));
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(...format('WARN', message, meta));
  },
  error(message: string, meta?: LogMeta) {
    console.error(...format('ERROR', message, meta));
  },
};
