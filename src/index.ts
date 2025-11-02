/**
 * mcp-dev-kit - Testing & debugging toolkit for MCP servers
 * @module mcp-dev-kit
 */

// Main export: Logger (use side-effect import for auto-patching)
export { createLogger, patchConsole, unpatchConsole } from './logger/index.js';
export type { LoggerOptions, DebugLogger } from './logger/index.js';

// Note: For auto-patching console, use:
// import 'mcp-dev-kit/logger';
