/**
 * MCP Test Client
 * Ergonomic client for writing unit tests for MCP servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { getCoverageEnv } from '../helpers/coverage.js';
import {
  AssertionError,
  ConnectionError,
  InitializationError,
  ToolCallError,
  ToolNotFoundError,
  toMCPTestError,
} from './errors.js';
import type {
  MCPTestClientConfig,
  Prompt,
  PromptResult,
  Resource,
  ResourceContent,
  TestClientState,
  Tool,
  ToolCallOptions,
  ToolCallResult,
} from './types.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  timeout: 5000,
  clientInfo: {
    name: 'mcp-test-client',
    version: '0.1.0',
  },
  capabilities: {},
  enableCoverage: true,
};

/**
 * MCPTestClient - Ergonomic test client for MCP servers
 *
 * @example
 * ```typescript
 * const client = new MCPTestClient({
 *   command: 'node',
 *   args: ['./my-server.js']
 * });
 *
 * await client.connect();
 * const tools = await client.listTools();
 * const result = await client.callTool('calculate', { a: 5, b: 3 });
 * await client.disconnect();
 * ```
 */
export class MCPTestClient {
  private config: MCPTestClientConfig & typeof DEFAULT_CONFIG;
  private state: TestClientState = {
    client: null,
    transport: null,
    initialized: false,
    serverInfo: null,
    serverCapabilities: null,
  };

  constructor(config: MCPTestClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      clientInfo: { ...DEFAULT_CONFIG.clientInfo, ...config.clientInfo },
      capabilities: { ...DEFAULT_CONFIG.capabilities, ...config.capabilities },
      // Merge coverage env if enabled (default: true)
      env: {
        ...(config.enableCoverage !== false ? getCoverageEnv() : {}),
        ...config.env, // User's env overrides coverage env
      },
    };
  }

  /**
   * Connect to the MCP server and complete initialization handshake
   */
  async connect(): Promise<void> {
    if (this.state.client) {
      throw new ConnectionError('Already connected to server');
    }

    try {
      // Create transport
      const transportParams: { command: string; args: string[]; env?: Record<string, string> } = {
        command: this.config.command,
        args: this.config.args,
        ...(this.config.env && { env: this.config.env }),
      };
      this.state.transport = new StdioClientTransport(transportParams);

      // Create client
      this.state.client = new Client(this.config.clientInfo, {
        capabilities: this.config.capabilities,
      });

      // Connect (this automatically performs the initialization handshake)
      await this.state.client.connect(this.state.transport);

      // Extract server info and capabilities from the connected client
      const serverVersion = this.state.client.getServerVersion();
      this.state.serverCapabilities = this.state.client.getServerCapabilities() || null;
      this.state.serverInfo = {
        name: serverVersion?.name || 'unknown',
        version: serverVersion?.version || 'unknown',
      };
      this.state.initialized = true;
    } catch (error) {
      // Cleanup on failure
      await this.cleanup();

      if (error instanceof ConnectionError || error instanceof InitializationError) {
        throw error;
      }

      throw new ConnectionError('Failed to connect to server', {
        command: this.config.command,
        args: this.config.args,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * List available tools from the server
   */
  async listTools(): Promise<Tool[]> {
    this.ensureConnected();

    try {
      const result = await this.state.client!.listTools();
      return result.tools as Tool[];
    } catch (error) {
      throw toMCPTestError(error, 'Failed to list tools');
    }
  }

  /**
   * Call a tool on the server
   */
  async callTool<T = unknown>(
    name: string,
    params?: unknown,
    _options?: ToolCallOptions
  ): Promise<ToolCallResult<T>> {
    this.ensureConnected();

    try {
      const result = await this.state.client!.callTool({
        name,
        arguments: (params as Record<string, unknown>) || {},
      });

      // Check if tool returned error
      if (result.isError) {
        throw new ToolCallError(name, 'Tool returned an error', {
          result,
        });
      }

      return result as ToolCallResult<T>;
    } catch (error) {
      if (error instanceof ToolCallError) {
        throw error;
      }

      throw new ToolCallError(name, 'Tool call failed', {
        params,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * List available resources from the server
   */
  async listResources(): Promise<Resource[]> {
    this.ensureConnected();

    try {
      const result = await this.state.client!.listResources();
      return result.resources as Resource[];
    } catch (error) {
      throw toMCPTestError(error, 'Failed to list resources');
    }
  }

  /**
   * Read a resource from the server
   */
  async readResource(uri: string): Promise<ResourceContent> {
    this.ensureConnected();

    try {
      const result = await this.state.client!.readResource({ uri });
      return result as ResourceContent;
    } catch (error) {
      throw toMCPTestError(error, `Failed to read resource: ${uri}`);
    }
  }

  /**
   * List available prompts from the server
   */
  async listPrompts(): Promise<Prompt[]> {
    this.ensureConnected();

    try {
      const result = await this.state.client!.listPrompts();
      return result.prompts as Prompt[];
    } catch (error) {
      throw toMCPTestError(error, 'Failed to list prompts');
    }
  }

  /**
   * Get a prompt from the server
   */
  async getPrompt(name: string, params?: Record<string, string>): Promise<PromptResult> {
    this.ensureConnected();

    try {
      const result = await this.state.client!.getPrompt({
        name,
        arguments: params || ({} as Record<string, string>),
      });
      return result as PromptResult;
    } catch (error) {
      throw toMCPTestError(error, `Failed to get prompt: ${name}`);
    }
  }

  /**
   * Test helper: Expect a tool with given name exists
   * Throws if tool not found
   */
  async expectToolExists(name: string): Promise<Tool> {
    const tools = await this.listTools();
    const tool = tools.find((t) => t.name === name);

    if (!tool) {
      throw new ToolNotFoundError(
        name,
        tools.map((t) => t.name)
      );
    }

    return tool;
  }

  /**
   * Test helper: Expect a tool call to succeed
   * Throws if tool call fails
   */
  async expectToolCallSuccess<T = unknown>(
    name: string,
    params?: unknown,
    options?: ToolCallOptions
  ): Promise<T> {
    const result = await this.callTool<T>(name, params, options);

    if (result.isError) {
      throw new AssertionError(`Expected tool '${name}' to succeed, but it returned an error`, {
        toolName: name,
        params,
        result,
      });
    }

    // Return the content for convenience
    if (result.content.length === 1 && result.content[0]?.type === 'text') {
      // Try to parse as JSON if it looks like JSON
      const text = result.content[0]?.text ?? '';
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          return JSON.parse(text) as T;
        } catch {
          // Not JSON, return as-is
        }
      }
      return text as T;
    }

    return result as T;
  }

  /**
   * Test helper: Expect a tool call to fail
   * Throws if tool call succeeds
   */
  async expectToolCallError(name: string, params?: unknown): Promise<Error> {
    try {
      const result = await this.callTool(name, params);

      if (result.isError) {
        // Success - tool returned error
        return new Error('Tool returned error as expected');
      }

      throw new AssertionError(`Expected tool '${name}' to fail, but it succeeded`, {
        toolName: name,
        params,
        result,
      });
    } catch (error) {
      // If it's our AssertionError, re-throw it
      if (error instanceof AssertionError) {
        throw error;
      }
      // Success - tool threw error
      return error as Error;
    }
  }

  /**
   * Get server information
   */
  getServerInfo() {
    return this.state.serverInfo;
  }

  /**
   * Get server capabilities
   */
  getServerCapabilities() {
    return this.state.serverCapabilities;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.state.client !== null && this.state.initialized;
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Internal: Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.state.client || !this.state.initialized) {
      throw new ConnectionError('Not connected to server. Call connect() first.');
    }
  }

  /**
   * Internal: Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.state.client) {
        await this.state.client.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      this.state.client = null;
      this.state.transport = null;
      this.state.initialized = false;
      this.state.serverInfo = null;
      this.state.serverCapabilities = null;
    }
  }
}
