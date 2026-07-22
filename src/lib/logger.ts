type LogMeta = Record<string, unknown> | unknown;

function format(level: string, message: string, meta?: LogMeta) {
  const timestamp = new Date().toISOString();
  return meta !== undefined
    ? [`[${timestamp}] [${level}] ${message}`, meta] as const
    : [`[${timestamp}] [${level}] ${message}`] as const;
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
