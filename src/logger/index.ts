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
   * Use colored output (default: true)
   */
  colors?: boolean;

  /**
   * Minimum log level to output
   * @default 'debug'
   */
  level?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Custom output stream (default: process.stderr)
   */
  stream?: NodeJS.WritableStream;
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
 *   level: 'info'
 * });
 *
 * logger.info('Server ready');
 * ```
 */
export function createLogger(_options?: LoggerOptions): DebugLogger {
  // TODO: Implement logger creation
  throw new Error('Not implemented');
}

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
 * patchConsole({ timestamps: false });
 * ```
 */
export function patchConsole(_options?: LoggerOptions): void {
  // TODO: Implement console patching
  throw new Error('Not implemented');
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
  // TODO: Implement console restoration
  throw new Error('Not implemented');
}

// Auto-patch console when this module is imported
if (typeof process !== 'undefined' && process.env.MCP_DEV_KIT_NO_AUTO_PATCH !== 'true') {
  patchConsole();
}
