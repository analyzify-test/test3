/**
 * Logging utility for application-wide logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private prefix: string;
  private level: LogLevel;

  constructor(prefix: string = '', level: LogLevel = 'info') {
    this.prefix = prefix;
    this.level = level;
  }

  /**
   * Logs a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Logs an info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, { ...context, error: error?.message });
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    console.log(`${timestamp} ${level.toUpperCase()} ${prefix}${message}${contextStr}`);
  }

  /**
   * Creates a child logger with a new prefix
   */
  child(prefix: string): Logger {
    return new Logger(`${this.prefix}:${prefix}`, this.level);
  }
}

/**
 * Default application logger instance
 */
export const defaultLogger = new Logger('app');
