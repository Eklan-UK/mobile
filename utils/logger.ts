/**
 * Production-safe logger utility
 * Only logs in development mode
 * Safely serializes objects to prevent Metro bundler crashes
 */

const isDev = __DEV__;

/**
 * Safely serialize data for logging (handles FormData, circular refs, functions, etc.)
 */
function safeStringify(data: any): string {
  if (data === null || data === undefined) {
    return String(data);
  }
  
  // Handle Error objects specially
  if (data instanceof Error) {
    return JSON.stringify({
      name: data.name,
      message: data.message,
      stack: data.stack,
    }, null, 2);
  }
  
  // Check if it's FormData
  if (
    data instanceof FormData ||
    (data && typeof data === 'object' && '_parts' in data) ||
    (data?.constructor?.name === 'FormData')
  ) {
    return '[FormData]';
  }
  
  // Check if it's a function
  if (typeof data === 'function') {
    return '[Function]';
  }
  
  // Try to stringify, catch circular reference errors
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    // Handle circular references
    try {
      const seen = new WeakSet();
      return JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        if (typeof value === 'function') {
          return '[Function]';
        }
        return value;
      }, 2);
    } catch {
      return '[Non-serializable object]';
    }
  }
}

/**
 * Safely format arguments for logging
 */
function safeFormatArgs(args: any[]): any[] {
  return args.map(arg => {
    if (arg instanceof Error) {
      return safeStringify(arg);
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        JSON.stringify(arg);
        return arg;
      } catch {
        return safeStringify(arg);
      }
    }
    return arg;
  });
}

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...safeFormatArgs(args));
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...safeFormatArgs(args));
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    // But safely serialize them to prevent Metro crashes
    console.error(...safeFormatArgs(args));
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...safeFormatArgs(args));
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...safeFormatArgs(args));
    }
  },
};










