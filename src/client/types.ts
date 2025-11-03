/**
 * TypeScript type definitions for MCP Test Client
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  ClientCapabilities,
  Implementation,
  ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Configuration for MCPTestClient
 */
export interface MCPTestClientConfig {
  /**
   * Command to execute (e.g., 'node', 'python')
   */
  command: string;

  /**
   * Arguments to pass to the command (e.g., ['./server.js'])
   */
  args: string[];

  /**
   * Client information sent during initialization
   */
  clientInfo?: Implementation;

  /**
   * Client capabilities to declare
   */
  capabilities?: ClientCapabilities;

  /**
   * Timeout in milliseconds for operations (default: 5000)
   */
  timeout?: number;

  /**
   * Environment variables for the server process
   */
  env?: Record<string, string>;
}

/**
 * MCP Tool definition
 */
export interface Tool {
  name: string;
  description?: string | undefined;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown> | undefined;
    required?: string[] | undefined;
    [key: string]: unknown;
  };
}

/**
 * Tool call result
 */
export interface ToolCallResult<T = unknown> {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
  // Allow generic type for strongly-typed results
  _parsed?: T;
}

/**
 * MCP Resource definition
 */
export interface Resource {
  uri: string;
  name: string;
  description?: string | undefined;
  mimeType?: string | undefined;
  [key: string]: unknown;
}

/**
 * Resource content
 */
export interface ResourceContent {
  contents: Array<{
    uri: string;
    mimeType?: string | undefined;
    text?: string | undefined;
    blob?: string | undefined;
  }>;
}

/**
 * MCP Prompt definition
 */
export interface Prompt {
  name: string;
  description?: string | undefined;
  arguments?:
    | Array<{
        name: string;
        description?: string | undefined;
        required?: boolean | undefined;
      }>
    | undefined;
}

/**
 * Prompt result
 */
export interface PromptResult {
  description?: string | undefined;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: string;
      text?: string | undefined;
      [key: string]: unknown;
    };
  }>;
}

/**
 * Internal state of the test client
 */
export interface TestClientState {
  client: Client | null;
  transport: StdioClientTransport | null;
  initialized: boolean;
  serverInfo: Implementation | null;
  serverCapabilities: ServerCapabilities | null;
}

/**
 * Initialization parameters
 */
export interface InitializeParams {
  protocolVersion?: string;
  capabilities?: ClientCapabilities;
  clientInfo?: Implementation;
}

/**
 * Options for expectToolCallSuccess
 */
export interface ToolCallOptions {
  /**
   * Timeout for this specific call
   */
  timeout?: number;

  /**
   * Whether to parse the result
   */
  parseResult?: boolean;
}

/**
 * Test assertion result
 */
export interface AssertionResult<T = unknown> {
  success: boolean;
  value?: T;
  error?: Error;
}
