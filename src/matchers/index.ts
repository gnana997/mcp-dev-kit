/**
 * Custom Vitest matchers for MCP testing
 */

import { expect } from 'vitest';
import type { MCPTestClient } from '../client/test-client.js';
import type { Prompt, Resource, Tool, ToolCallResult } from '../client/types.js';
import type { MCPMatchersInternal } from './types.js';

/**
 * Check if value is an MCPTestClient instance
 */
function isMCPTestClient(value: unknown): value is MCPTestClient {
  return (
    value !== null &&
    typeof value === 'object' &&
    'listTools' in value &&
    'callTool' in value &&
    'isConnected' in value
  );
}

/**
 * Check if value is a Tool object
 */
function isTool(value: unknown): value is Tool {
  return value !== null && typeof value === 'object' && 'name' in value && 'inputSchema' in value;
}

/**
 * Check if value is an array of Tools
 */
function isToolArray(value: unknown): value is Tool[] {
  return Array.isArray(value) && (value.length === 0 || isTool(value[0]));
}

/**
 * Check if value is a Resource object
 */
function isResource(value: unknown): value is Resource {
  return value !== null && typeof value === 'object' && 'uri' in value;
}

/**
 * Check if value is an array of Resources
 */
function isResourceArray(value: unknown): value is Resource[] {
  return Array.isArray(value) && (value.length === 0 || isResource(value[0]));
}

/**
 * Check if value is a Prompt object
 */
function isPrompt(value: unknown): value is Prompt {
  return value !== null && typeof value === 'object' && 'name' in value;
}

/**
 * Check if value is an array of Prompts
 */
function isPromptArray(value: unknown): value is Prompt[] {
  return Array.isArray(value) && (value.length === 0 || isPrompt(value[0]));
}

/**
 * Check if value is a ToolCallResult
 */
function isToolCallResult(value: unknown): value is ToolCallResult {
  return value !== null && typeof value === 'object' && 'content' in value;
}

/**
 * Helper: Resolve received value to ToolCallResult
 */
async function resolveToolCallResult(received: unknown): Promise<{
  success: boolean;
  result?: ToolCallResult;
  error?: string;
}> {
  // Handle Promise<ToolCallResult>
  if (received instanceof Promise) {
    try {
      return { success: true, result: await received };
    } catch (error) {
      return {
        success: false,
        error: `Expected tool call to return result, but it threw an error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Handle ToolCallResult directly
  if (isToolCallResult(received)) {
    return { success: true, result: received };
  }

  // Invalid input
  return {
    success: false,
    error: `Expected Promise<ToolCallResult> or ToolCallResult, but received ${typeof received}. Use 'await expect(client.callTool(...)).toReturnToolResult(...)'`,
  };
}

/**
 * Helper: Extract actual value from ToolCallResult for comparison
 */
function extractActualValue(result: ToolCallResult): unknown {
  // If single text content, try to parse it
  if (result.content.length === 1 && result.content[0]?.type === 'text') {
    const text = result.content[0]?.text ?? '';

    // Try parsing as JSON if it looks like JSON
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }

    return text;
  }

  // Return full result for other cases
  return result;
}

/**
 * Custom matchers for MCP testing
 */
export const mcpMatchers: MCPMatchersInternal = {
  /**
   * Assert that the server has a tool with the given name
   */
  async toHaveTool(received: unknown, toolName: string) {
    let tools: Tool[];

    // Handle MCPTestClient
    if (isMCPTestClient(received)) {
      try {
        tools = await received.listTools();
      } catch (error) {
        return {
          pass: false,
          message: () =>
            `Expected server to have tool '${toolName}', but failed to list tools: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
    // Handle Tool array
    else if (isToolArray(received)) {
      tools = received;
    }
    // Invalid input
    else {
      return {
        pass: false,
        message: () =>
          `Expected MCPTestClient or Tool[], but received ${typeof received}. Use 'await expect(client).toHaveTool(...)' or 'expect(tools).toHaveTool(...)'`,
      };
    }

    const hasTool = tools.some((tool) => tool.name === toolName);
    const availableTools = tools.map((t) => t.name).join(', ') || 'none';

    return {
      pass: hasTool,
      message: () =>
        hasTool
          ? `Expected server not to have tool '${toolName}', but it does`
          : `Expected server to have tool '${toolName}', but available tools are: ${availableTools}`,
    };
  },

  /**
   * Assert that the server has a resource with the given URI
   */
  async toHaveResource(received: unknown, uri: string) {
    let resources: Resource[];

    // Handle MCPTestClient
    if (isMCPTestClient(received)) {
      try {
        resources = await received.listResources();
      } catch (error) {
        return {
          pass: false,
          message: () =>
            `Expected server to have resource '${uri}', but failed to list resources: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
    // Handle Resource array
    else if (isResourceArray(received)) {
      resources = received;
    }
    // Invalid input
    else {
      return {
        pass: false,
        message: () =>
          `Expected MCPTestClient or Resource[], but received ${typeof received}. Use 'await expect(client).toHaveResource(...)' or 'expect(resources).toHaveResource(...)'`,
      };
    }

    const hasResource = resources.some((resource) => resource.uri === uri);
    const availableResources = resources.map((r) => r.uri).join(', ') || 'none';

    return {
      pass: hasResource,
      message: () =>
        hasResource
          ? `Expected server not to have resource '${uri}', but it does`
          : `Expected server to have resource '${uri}', but available resources are: ${availableResources}`,
    };
  },

  /**
   * Assert that the server has a prompt with the given name
   */
  async toHavePrompt(received: unknown, promptName: string) {
    let prompts: Prompt[];

    // Handle MCPTestClient
    if (isMCPTestClient(received)) {
      try {
        prompts = await received.listPrompts();
      } catch (error) {
        return {
          pass: false,
          message: () =>
            `Expected server to have prompt '${promptName}', but failed to list prompts: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
    // Handle Prompt array
    else if (isPromptArray(received)) {
      prompts = received;
    }
    // Invalid input
    else {
      return {
        pass: false,
        message: () =>
          `Expected MCPTestClient or Prompt[], but received ${typeof received}. Use 'await expect(client).toHavePrompt(...)' or 'expect(prompts).toHavePrompt(...)'`,
      };
    }

    const hasPrompt = prompts.some((prompt) => prompt.name === promptName);
    const availablePrompts = prompts.map((p) => p.name).join(', ') || 'none';

    return {
      pass: hasPrompt,
      message: () =>
        hasPrompt
          ? `Expected server not to have prompt '${promptName}', but it does`
          : `Expected server to have prompt '${promptName}', but available prompts are: ${availablePrompts}`,
    };
  },

  /**
   * Assert that a tool call returns a specific result
   */
  async toReturnToolResult(received: unknown, expected: unknown) {
    // Resolve to ToolCallResult
    const resolved = await resolveToolCallResult(received);
    if (!resolved.success) {
      return {
        pass: false,
        message: () => resolved.error || 'Failed to resolve result',
      };
    }

    const result = resolved.result!;

    // Check if result is an error
    if (result.isError) {
      return {
        pass: false,
        message: () => 'Expected tool call to succeed with result, but it returned an error',
      };
    }

    // Extract actual value for comparison
    const actualValue = extractActualValue(result);

    // Deep equality check
    const pass = JSON.stringify(actualValue) === JSON.stringify(expected);

    return {
      pass,
      message: () =>
        pass
          ? `Expected tool call not to return ${JSON.stringify(expected)}, but it did`
          : `Expected tool call to return ${JSON.stringify(expected)}, but received ${JSON.stringify(actualValue)}`,
    };
  },

  /**
   * Assert that a tool call throws an error
   */
  async toThrowToolError(received: unknown) {
    // Must be a Promise
    if (!(received instanceof Promise)) {
      return {
        pass: false,
        message: () =>
          `Expected Promise from tool call, but received ${typeof received}. Use 'await expect(client.callTool(...)).toThrowToolError()'`,
      };
    }

    let didThrow = false;
    let result: ToolCallResult | undefined;

    try {
      result = await received;
    } catch (error) {
      didThrow = true;
    }

    // If it threw, that's a pass
    if (didThrow) {
      return {
        pass: true,
        message: () => 'Expected tool call not to throw error, but it did',
      };
    }

    // If result has isError flag, that's also a pass
    if (result && isToolCallResult(result) && result.isError) {
      return {
        pass: true,
        message: () => 'Expected tool call not to return error, but it did',
      };
    }

    return {
      pass: false,
      message: () => 'Expected tool call to throw error or return isError=true, but it succeeded',
    };
  },

  /**
   * Assert that a tool has a specific property with optional value check
   */
  toHaveToolProperty(received: unknown, property: string, value?: unknown) {
    if (!isTool(received)) {
      return {
        pass: false,
        message: () =>
          `Expected Tool object, but received ${typeof received}. Use 'expect(tool).toHaveToolProperty(...)'`,
      };
    }

    const hasProperty = property in received;

    if (!hasProperty) {
      return {
        pass: false,
        message: () => `Expected tool to have property '${property}', but it doesn't`,
      };
    }

    // If value is provided, check it matches
    if (value !== undefined) {
      const actualValue = (received as unknown as Record<string, unknown>)[property];
      const matches = JSON.stringify(actualValue) === JSON.stringify(value);

      return {
        pass: matches,
        message: () =>
          matches
            ? `Expected tool.${property} not to equal ${JSON.stringify(value)}, but it does`
            : `Expected tool.${property} to equal ${JSON.stringify(value)}, but received ${JSON.stringify(actualValue)}`,
      };
    }

    return {
      pass: true,
      message: () => `Expected tool not to have property '${property}', but it does`,
    };
  },

  /**
   * Assert that a tool's input schema matches expected structure
   */
  toMatchToolSchema(received: unknown, schema: Record<string, unknown>) {
    if (!isTool(received)) {
      return {
        pass: false,
        message: () =>
          `Expected Tool object, but received ${typeof received}. Use 'expect(tool).toMatchToolSchema(...)'`,
      };
    }

    const toolSchema = received.inputSchema;

    // Check each expected property
    const mismatches: string[] = [];
    for (const [key, expectedValue] of Object.entries(schema)) {
      const actualValue = (toolSchema as Record<string, unknown>)[key];

      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        mismatches.push(
          `  - ${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
        );
      }
    }

    const pass = mismatches.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `Expected tool schema not to match ${JSON.stringify(schema)}, but it does`
          : `Expected tool schema to match ${JSON.stringify(schema)}, but found mismatches:\n${mismatches.join('\n')}`,
    };
  },
};

/**
 * Install custom matchers into Vitest
 * Call this in your test setup file or at the top of test files
 *
 * @example
 * ```typescript
 * // In vitest.setup.ts or test file
 * import { installMCPMatchers } from 'mcp-dev-kit/matchers';
 * installMCPMatchers();
 * ```
 */
export function installMCPMatchers(): void {
  expect.extend(mcpMatchers as any);
}

// Export types
export type { MCPMatchers } from './types.js';
