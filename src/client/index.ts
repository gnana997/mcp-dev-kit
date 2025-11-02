/**
 * MCP Test Client
 * Ergonomic test client for writing unit tests for MCP servers
 */

// Main client class
export { MCPTestClient } from './test-client.js';

// Types
export type {
  MCPTestClientConfig,
  Tool,
  ToolCallResult,
  Resource,
  ResourceContent,
  Prompt,
  PromptResult,
  InitializeParams,
  ToolCallOptions,
  TestClientState,
} from './types.js';

// Errors
export {
  MCPTestError,
  MCPTestErrorCode,
  ConnectionError,
  InitializationError,
  ToolNotFoundError,
  ToolCallError,
  ValidationError,
  AssertionError,
  TimeoutError,
  ResourceNotFoundError,
  PromptNotFoundError,
  toMCPTestError,
} from './errors.js';
export type { ErrorContext } from './errors.js';

// Schemas (for advanced usage)
export {
  ToolSchema,
  ToolCallResultSchema,
  ResourceSchema,
  PromptSchema,
  validateWith,
  safeValidate,
} from './schemas.js';

// Helpers
export { shouldEnableCoverage, getCoverageEnv } from '../helpers/index.js';
