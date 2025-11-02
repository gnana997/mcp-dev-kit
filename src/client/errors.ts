/**
 * Custom error classes for MCP Test Client
 * Provides actionable error messages with context
 */

/**
 * Error codes for MCP Test Client errors
 */
export enum MCPTestErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_CALL_FAILED = 'TOOL_CALL_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  ASSERTION_FAILED = 'ASSERTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  NOT_CONNECTED = 'NOT_CONNECTED',
  ALREADY_CONNECTED = 'ALREADY_CONNECTED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PROMPT_NOT_FOUND = 'PROMPT_NOT_FOUND',
}

/**
 * Error context information
 */
export interface ErrorContext {
  method?: string;
  params?: unknown;
  response?: unknown;
  expected?: unknown;
  actual?: unknown;
  suggestion?: string;
  serverInfo?: {
    name?: string;
    version?: string;
  };
  [key: string]: unknown;
}

/**
 * Base error class for MCP Test Client
 */
export class MCPTestError extends Error {
  constructor(
    message: string,
    public readonly code: MCPTestErrorCode,
    public readonly context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'MCPTestError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPTestError);
    }
  }

  /**
   * Returns a detailed error message with context
   */
  override toString(): string {
    const parts = [`${this.name} [${this.code}]: ${this.message}`];

    if (Object.keys(this.context).length > 0) {
      parts.push('\nContext:');
      parts.push(JSON.stringify(this.context, null, 2));
    }

    if (this.context.suggestion) {
      parts.push(`\nSuggestion: ${this.context.suggestion}`);
    }

    return parts.join('\n');
  }

  /**
   * Converts error to JSON for logging/reporting
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Connection-related error
 */
export class ConnectionError extends MCPTestError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, MCPTestErrorCode.CONNECTION_FAILED, {
      ...context,
      suggestion:
        context.suggestion ||
        'Check that the server command and arguments are correct, and the server starts without errors.',
    });
    this.name = 'ConnectionError';
  }
}

/**
 * Initialization-related error
 */
export class InitializationError extends MCPTestError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, MCPTestErrorCode.INITIALIZATION_FAILED, {
      ...context,
      suggestion:
        context.suggestion ||
        'Verify the server supports MCP protocol and responds to initialize requests correctly.',
    });
    this.name = 'InitializationError';
  }
}

/**
 * Tool-related errors
 */
export class ToolNotFoundError extends MCPTestError {
  constructor(toolName: string, availableTools: string[] = [], context: ErrorContext = {}) {
    const availableToolsList =
      availableTools.length > 0 ? availableTools.join(', ') : 'none';
    const contextWithSuggestion: ErrorContext = {
      ...context,
      toolName,
      availableTools,
    };
    if (context.suggestion) {
      contextWithSuggestion.suggestion = context.suggestion;
    }
    super(
      `Tool '${toolName}' not found. Available tools: ${availableToolsList}`,
      MCPTestErrorCode.TOOL_NOT_FOUND,
      contextWithSuggestion
    );
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Tool call execution error
 */
export class ToolCallError extends MCPTestError {
  constructor(toolName: string, message: string, context: ErrorContext = {}) {
    super(`Tool '${toolName}' call failed: ${message}`, MCPTestErrorCode.TOOL_CALL_FAILED, {
      ...context,
      toolName,
      suggestion:
        context.suggestion ||
        'Check the tool parameters match the expected schema and the server handles the tool correctly.',
    });
    this.name = 'ToolCallError';
  }
}

/**
 * Validation error with detailed path information
 */
export class ValidationError extends MCPTestError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`Validation failed: ${message}`, MCPTestErrorCode.VALIDATION_FAILED, context);
    this.name = 'ValidationError';
  }
}

/**
 * Assertion error for test helpers
 */
export class AssertionError extends MCPTestError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`Assertion failed: ${message}`, MCPTestErrorCode.ASSERTION_FAILED, context);
    this.name = 'AssertionError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends MCPTestError {
  constructor(operation: string, timeout: number, context: ErrorContext = {}) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, MCPTestErrorCode.TIMEOUT, {
      ...context,
      operation,
      timeout,
      suggestion:
        context.suggestion ||
        'Try increasing the timeout value or check if the server is responding.',
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Resource not found error
 */
export class ResourceNotFoundError extends MCPTestError {
  constructor(uri: string, context: ErrorContext = {}) {
    super(`Resource '${uri}' not found`, MCPTestErrorCode.RESOURCE_NOT_FOUND, {
      ...context,
      uri,
      suggestion:
        context.suggestion || 'Check that the resource URI is correct and the resource exists.',
    });
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Prompt not found error
 */
export class PromptNotFoundError extends MCPTestError {
  constructor(promptName: string, availablePrompts: string[] = [], context: ErrorContext = {}) {
    super(`Prompt '${promptName}' not found`, MCPTestErrorCode.PROMPT_NOT_FOUND, {
      ...context,
      promptName,
      availablePrompts,
      suggestion:
        context.suggestion ||
        `Available prompts: ${availablePrompts.length > 0 ? availablePrompts.join(', ') : 'none'}`,
    });
    this.name = 'PromptNotFoundError';
  }
}

/**
 * Helper to create error from unknown error type
 */
export function toMCPTestError(error: unknown, defaultMessage = 'Unknown error'): MCPTestError {
  if (error instanceof MCPTestError) {
    return error;
  }

  if (error instanceof Error) {
    return new MCPTestError(error.message, MCPTestErrorCode.ASSERTION_FAILED, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new MCPTestError(defaultMessage, MCPTestErrorCode.ASSERTION_FAILED, {
    originalError: String(error),
  });
}
