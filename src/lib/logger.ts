/**
 * LISAN Intelligence — Centralized Logger
 * 
 * Provides log-level-aware logging that disables debug/info in production.
 * Uses structured logging format for better Vercel log parsing.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: string;
    data?: unknown;
    timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// In production, only show warn and error
const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatLog(entry: LogEntry): string {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const context = entry.context ? `[${entry.context}]` : '';
    const dataStr = entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : '';
    return `${prefix}${context} ${entry.message}${dataStr}`;
}

function log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        level,
        message,
        context,
        data,
        timestamp: new Date().toISOString(),
    };

    const formatted = formatLog(entry);

    switch (level) {
        case 'debug':
        case 'info':
            console.log(formatted);
            break;
        case 'warn':
            console.warn(formatted);
            break;
        case 'error':
            console.error(formatted);
            break;
    }
}

/**
 * Logger utility with context support
 */
export const logger = {
    debug: (message: string, data?: unknown) => log('debug', message, undefined, data),
    info: (message: string, data?: unknown) => log('info', message, undefined, data),
    warn: (message: string, data?: unknown) => log('warn', message, undefined, data),
    error: (message: string, data?: unknown) => log('error', message, undefined, data),

    /**
     * Create a logger with a fixed context prefix
     * Usage: const log = logger.withContext('CronMonitor');
     *        log.debug('Processing signal'); // [DEBUG][CronMonitor] Processing signal
     */
    withContext: (context: string) => ({
        debug: (message: string, data?: unknown) => log('debug', message, context, data),
        info: (message: string, data?: unknown) => log('info', message, context, data),
        warn: (message: string, data?: unknown) => log('warn', message, context, data),
        error: (message: string, data?: unknown) => log('error', message, context, data),
    }),
};

export default logger;
