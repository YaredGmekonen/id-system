import { env } from '../config/env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentPriority = LEVEL_PRIORITIES[env.LOG_LEVEL as LogLevel] ?? 1;

export const logger = {
  debug(message: string, context: Record<string, any> = {}) {
    if (currentPriority <= LEVEL_PRIORITIES.debug) {
      logOutput('debug', message, context);
    }
  },

  info(message: string, context: Record<string, any> = {}) {
    if (currentPriority <= LEVEL_PRIORITIES.info) {
      logOutput('info', message, context);
    }
  },

  warn(message: string, context: Record<string, any> = {}) {
    if (currentPriority <= LEVEL_PRIORITIES.warn) {
      logOutput('warn', message, context);
    }
  },

  error(message: string, context: Record<string, any> = {}) {
    if (currentPriority <= LEVEL_PRIORITIES.error) {
      logOutput('error', message, context);
    }
  },
};

function logOutput(level: LogLevel, message: string, context: Record<string, any>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...context,
  };

  if (env.NODE_ENV === 'development') {
    const color =
      level === 'error'
        ? '\x1b[31m'
        : level === 'warn'
        ? '\x1b[33m'
        : level === 'info'
        ? '\x1b[36m'
        : '\x1b[90m';
    const reset = '\x1b[0m';
    const ctxStr = Object.keys(context).length ? ` ${JSON.stringify(context)}` : '';
    console.log(`${color}[${entry.timestamp}] [${entry.level}]${reset} ${message}${ctxStr}`);
  } else {
    console.log(JSON.stringify(entry));
  }
}
