/**
 * Secure Logger Utility
 * Only logs in development mode to prevent information leakage in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors in development, but sanitize in production
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, only log generic error messages without sensitive details
      const sanitized = args.map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }
        if (arg instanceof Error) {
          return arg.message;
        }
        return '[Object]';
      });
      console.error('[Production Error]', ...sanitized);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

export default logger;