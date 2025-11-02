/**
 * Smart Debug Logger for stdio MCP servers
 *
 * Patches console methods to use stderr, preventing corruption of JSON-RPC
 * communication over stdin/stdout.
 *
 * @example
 * ```typescript
 * // Auto-patch mode (import at the top of your MCP server)
 * import 'mcp-dev-kit/logger';
 *
 * // Now console.log works without breaking JSON-RPC!
 * console.log('Server started', { port: 3000 });
 * ```
 *
 * @module mcp-dev-kit/logger
 */

import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { inspect } from 'node:util';
import picocolors from 'picocolors';

/**
 * Log levels in order of severity
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Options for configuring the debug logger
 */
export interface LoggerOptions {
  /**
   * Enable/disable the logger (default: true)
   */
  enabled?: boolean;

  /**
   * Add timestamps to log messages (default: true)
   */
  timestamps?: boolean;

  /**
   * Use colored output (default: auto-detect from stderr.isTTY)
   */
  colors?: boolean;

  /**
   * Minimum log level to output
   * @default 'debug'
   */
  level?: LogLevel;

  /**
   * Custom output stream (default: process.stderr)
   */
  stream?: NodeJS.WritableStream;

  /**
   * Optional log file path for persistent logging
   */
  logFile?: string;
}

/**
 * Logger instance that writes to stderr
 */
export interface DebugLogger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;

  /**
   * Restore original console methods
   */
  restore(): void;

  /**
   * Close file handles and cleanup
   */
  close(): Promise<void>;
}

/**
 * Internal logger implementation
 */
class Logger implements DebugLogger {
  private options: {
    enabled: boolean;
    timestamps: boolean;
    colors: boolean;
    level: LogLevel;
    stream: NodeJS.WritableStream;
    logFile: string | undefined;
  };
  private colors: ReturnType<typeof picocolors.createColors>;
  private fileHandle: FileHandle | undefined;
  private writeQueue: string[] = [];
  private isWriting = false;
  private isClosed = false;

  constructor(options: LoggerOptions = {}) {
    const enableColors = options.colors ?? Boolean(process.stderr.isTTY);

    this.options = {
      enabled: options.enabled ?? true,
      timestamps: options.timestamps ?? true,
      colors: enableColors,
      level: options.level ?? 'debug',
      stream: options.stream ?? process.stderr,
      logFile: options.logFile,
    };

    this.colors = picocolors.createColors(enableColors);

    // Initialize file logging if requested
    if (this.options.logFile) {
      this.initFileLogging().catch(() => {
        // Silently ignore file logging errors
      });
    }
  }

  private async initFileLogging(): Promise<void> {
    if (!this.options.logFile || this.isClosed) return;

    try {
      this.fileHandle = await open(this.options.logFile, 'a');
    } catch {
      // Ignore errors - logging shouldn't crash the app
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.options.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.level];
  }

  private formatLevel(level: LogLevel): string {
    const colorMap = {
      debug: this.colors.gray,
      info: this.colors.cyan,
      warn: this.colors.yellow,
      error: this.colors.red,
    };

    const color = colorMap[level];
    return color(`[${level.toUpperCase()}]`);
  }

  private formatArgs(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object' && arg !== null) {
          return inspect(arg, {
            depth: 2,
            colors: this.options.stream === process.stderr && Boolean(process.stderr.isTTY),
          });
        }
        return String(arg);
      })
      .join(' ');
  }

  private formatMessage(level: LogLevel, args: unknown[]): string {
    const parts: string[] = [];

    // Add level
    parts.push(this.formatLevel(level));

    // Add timestamp
    if (this.options.timestamps) {
      const timestamp = new Date().toISOString();
      parts.push(this.colors.dim(timestamp));
    }

    // Add message
    parts.push(this.formatArgs(args));

    return parts.join(' ');
  }

  private handleLog(level: LogLevel, args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const message = this.formatMessage(level, args);

    // Write to stream (stderr)
    this.options.stream.write(`${message}\n`);

    // Queue for file logging (async, non-blocking)
    if (this.fileHandle && !this.isClosed) {
      this.queueFileWrite(`${message}\n`);
    }
  }

  private queueFileWrite(message: string): void {
    this.writeQueue.push(message);

    if (!this.isWriting) {
      this.flushFileWrites().catch(() => {
        // Silently ignore file write errors
      });
    }
  }

  private async flushFileWrites(): Promise<void> {
    if (this.writeQueue.length === 0 || !this.fileHandle || this.isClosed) return;

    this.isWriting = true;

    try {
      // Batch write up to 100 messages
      const batch = this.writeQueue.splice(0, 100);
      await this.fileHandle.write(batch.join(''));
    } catch {
      // Silently ignore errors - logging shouldn't crash the app
    } finally {
      this.isWriting = false;

      // Continue flushing if there are more messages
      if (this.writeQueue.length > 0) {
        await this.flushFileWrites();
      }
    }
  }

  debug(...args: unknown[]): void {
    this.handleLog('debug', args);
  }

  info(...args: unknown[]): void {
    this.handleLog('info', args);
  }

  log(...args: unknown[]): void {
    this.handleLog('info', args);
  }

  warn(...args: unknown[]): void {
    this.handleLog('warn', args);
  }

  error(...args: unknown[]): void {
    this.handleLog('error', args);
  }

  restore(): void {
    // This is a no-op for instance loggers
    // Only global patching needs restoration
  }

  async close(): Promise<void> {
    if (this.isClosed) return;

    this.isClosed = true;

    // Flush pending writes
    if (this.fileHandle) {
      await this.flushFileWrites();
      await this.fileHandle.close();
    }
    this.fileHandle = undefined;
  }
}

/**
 * Create a new debug logger instance
 *
 * @param options - Logger configuration options
 * @returns A configured debug logger instance
 *
 * @example
 * ```typescript
 * import { createLogger } from 'mcp-dev-kit/logger';
 *
 * const logger = createLogger({
 *   timestamps: true,
 *   level: 'info',
 *   logFile: './server.log'
 * });
 *
 * logger.info('Server ready');
 * ```
 */
export function createLogger(options?: LoggerOptions): DebugLogger {
  return new Logger(options);
}

// Global state for console patching
let isPatched = false;
let globalLogger: Logger | undefined;
const originalMethods = new Map<string, (...args: unknown[]) => void>();

/**
 * Patch global console methods to use stderr
 *
 * This is called automatically when importing 'mcp-dev-kit/logger'
 *
 * @param options - Logger configuration options
 *
 * @example
 * ```typescript
 * import { patchConsole } from 'mcp-dev-kit/logger';
 *
 * // Manually patch console
 * patchConsole({ timestamps: false, colors: false });
 * ```
 */
export function patchConsole(options?: LoggerOptions): void {
  if (isPatched) {
    throw new Error('Console is already patched. Call unpatchConsole() first.');
  }

  // Store original methods
  originalMethods.set('log', console.log);
  originalMethods.set('info', console.info);
  originalMethods.set('warn', console.warn);
  originalMethods.set('error', console.error);
  originalMethods.set('debug', console.debug);

  // Create global logger
  globalLogger = new Logger(options);

  // Patch all console methods to use the logger
  console.log = (...args: unknown[]) => globalLogger?.info(...args);
  console.info = (...args: unknown[]) => globalLogger?.info(...args);
  console.warn = (...args: unknown[]) => globalLogger?.warn(...args);
  console.error = (...args: unknown[]) => globalLogger?.error(...args);
  console.debug = (...args: unknown[]) => globalLogger?.debug(...args);

  isPatched = true;

  // Register cleanup handlers
  registerCleanupHandlers();
}

/**
 * Restore original console methods
 *
 * @example
 * ```typescript
 * import { unpatchConsole } from 'mcp-dev-kit/logger';
 *
 * // Restore original console behavior
 * unpatchConsole();
 * ```
 */
export function unpatchConsole(): void {
  if (!isPatched) {
    return; // Already restored or never patched
  }

  // Restore original methods
  originalMethods.forEach((original, method) => {
    (console as unknown as Record<string, (...args: unknown[]) => void>)[method] = original;
  });

  // Cleanup
  originalMethods.clear();
  isPatched = false;

  // Close file handle if any
  if (globalLogger) {
    globalLogger.close().catch(() => {
      // Silently ignore errors
    });
    globalLogger = undefined;
  }
}

/**
 * Register cleanup handlers for graceful shutdown
 */
function registerCleanupHandlers(): void {
  let cleanupRegistered = false;

  if (cleanupRegistered) return;
  cleanupRegistered = true;

  const cleanup = async (signal?: string) => {
    if (globalLogger) {
      await globalLogger.close();
    }

    // Only exit if we received a signal
    if (signal) {
      process.exit(signal === 'SIGTERM' ? 0 : 1);
    }
  };

  // Handle process termination signals
  process.once('SIGINT', () => cleanup('SIGINT'));
  process.once('SIGTERM', () => cleanup('SIGTERM'));
  process.once('exit', () => cleanup());
}

// Auto-patch console when this module is imported
if (typeof process !== 'undefined' && process.env.MCP_DEV_KIT_NO_AUTO_PATCH !== 'true') {
  try {
    patchConsole();
  } catch {
    // Silently ignore if already patched
  }
}
