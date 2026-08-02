function format(level: string, message: string): string {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    console.debug(format('DEBUG', message), meta ?? '');
  },
  info(message: string, meta?: unknown) {
    console.log(format('INFO', message), meta ?? '');
  },
  warn(message: string, meta?: unknown) {
    console.warn(format('WARN', message), meta ?? '');
  },
  error(message: string, meta?: unknown) {
    console.error(format('ERROR', message), meta ?? '');
  },
};
