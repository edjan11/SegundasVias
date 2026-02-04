/**
 * Simple logger utility for development
 */

export const logger = {
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  info: (...args: any[]) => console.info('[INFO]', ...args),
  log: (...args: any[]) => console.log('[LOG]', ...args),
};

export default logger;
