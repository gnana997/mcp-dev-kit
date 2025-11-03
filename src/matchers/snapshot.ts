/**
 * Snapshot testing matchers for MCP servers
 *
 * Provides Vitest-compatible snapshot testing with MCP-aware smart defaults
 * that automatically exclude common dynamic fields like timestamps and request IDs.
 */

import { expect } from 'vitest';
import type { MCPTestClient } from '../client/test-client.js';
import type { Prompt, Resource, Tool, ToolCallResult } from '../client/types.js';
import type { MCPSnapshotMatchersInternal, MCPSnapshotOptions } from './types.js';

/**
 * Default fields to exclude from MCP snapshots
 * These are typically dynamic and cause flaky tests
 */
const DEFAULT_EXCLUDE_FIELDS = [
  'timestamp',
  'requestId',
  '_meta.timestamp',
  'serverInfo.startedAt',
  'serverInfo.uptime',
  'executionTime',
  'cacheKey',
];

/**
 * Helper: Deeply exclude properties from an object
 */
function excludeProperties(obj: unknown, excludePaths: string[]): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => excludeProperties(item, excludePaths));
  }

  const result: Record<string, unknown> = {};
  const objRecord = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(objRecord)) {
    // Check if this key should be excluded
    const shouldExclude = excludePaths.some((path) => {
      const parts = path.split('.');
      return parts[0] === key || path === key;
    });

    if (!shouldExclude) {
      // Recursively process nested objects
      const nestedPaths = excludePaths
        .filter((p) => p.startsWith(`${key}.`))
        .map((p) => p.substring(key.length + 1));

      result[key] = excludeProperties(value, nestedPaths);
    }
  }

  return result;
}

/**
 * Helper: Normalize MCP response by excluding dynamic fields
 */
function normalizeMCPResponse(value: unknown, options?: MCPSnapshotOptions): unknown {
  const excludeFields = [...DEFAULT_EXCLUDE_FIELDS, ...(options?.exclude || [])];

  return excludeProperties(value, excludeFields);
}

/**
 * Helper: Check if value is an MCPTestClient instance
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
 * Helper: Check if value is a Tool array
 */
function isToolArray(value: unknown): value is Tool[] {
  return (
    Array.isArray(value) &&
    (value.length === 0 ||
      (typeof value[0] === 'object' &&
        value[0] !== null &&
        'name' in value[0] &&
        'inputSchema' in value[0]))
  );
}

/**
 * Helper: Check if value is a Resource array
 */
function isResourceArray(value: unknown): value is Resource[] {
  return (
    Array.isArray(value) &&
    (value.length === 0 || (typeof value[0] === 'object' && value[0] !== null && 'uri' in value[0]))
  );
}

/**
 * Helper: Check if value is a Prompt array
 */
function isPromptArray(value: unknown): value is Prompt[] {
  return (
    Array.isArray(value) &&
    (value.length === 0 ||
      (typeof value[0] === 'object' && value[0] !== null && 'name' in value[0]))
  );
}

/**
 * Helper: Check if value is a ToolCallResult
 */
function isToolCallResult(value: unknown): value is ToolCallResult {
  return (
    value !== null &&
    typeof value === 'object' &&
    'content' in value &&
    Array.isArray((value as ToolCallResult).content)
  );
}

/**
 * Snapshot matchers for MCP testing
 */
export const mcpSnapshotMatchers: MCPSnapshotMatchersInternal = {
  /**
   * Generic MCP snapshot matcher with smart defaults
   */
  toMatchMCPSnapshot(received: unknown, options?: MCPSnapshotOptions) {
    const normalized = normalizeMCPResponse(received, options);
    expect(normalized).toMatchSnapshot();
    return { pass: true, message: () => '' };
  },

  /**
   * Snapshot matcher for tool lists
   */
  async toMatchToolListSnapshot(received: unknown, options?: MCPSnapshotOptions) {
    let tools: Tool[];

    // Handle MCPTestClient
    if (isMCPTestClient(received)) {
      try {
        tools = await received.listTools();
      } catch (error) {
        return {
          pass: false,
          message: () =>
            `Failed to list tools: ${error instanceof Error ? error.message : String(error)}`,
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
          `Expected MCPTestClient or Tool[], but received ${typeof received}. Use 'await expect(client).toMatchToolListSnapshot()' or 'expect(tools).toMatchToolListSnapshot()'`,
      };
    }

    const normalized = normalizeMCPResponse(tools, options);
    expect(normalized).toMatchSnapshot();
    return { pass: true, message: () => '' };
  },

  /**
   * Snapshot matcher for tool call responses
   */
  toMatchToolResponseSnapshot(received: unknown, options?: MCPSnapshotOptions) {
    if (!isToolCallResult(received)) {
      return {
        pass: false,
        message: () =>
          `Expected ToolCallResult, but received ${typeof received}. Use 'expect(await client.callTool(...)).toMatchToolResponseSnapshot()'`,
      };
    }

    const normalized = normalizeMCPResponse(received, options);
    expect(normalized).toMatchSnapshot();
    return { pass: true, message: () => '' };
  },

  /**
   * Snapshot matcher for resource lists
   */
  async toMatchResourceListSnapshot(received: unknown, options?: MCPSnapshotOptions) {
    let resources: Resource[];

    // Handle MCPTestClient
    if (isMCPTestClient(received)) {
      try {
        resources = await received.listResources();
      } catch (error) {
        return {
          pass: false,
          message: () =>
            `Failed to list resources: ${error instanceof Error ? error.message : String(error)}`,
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
          `Expected MCPTestClient or Resource[], but received ${typeof received}. Use 'await expect(client).toMatchResourceListSnapshot()' or 'expect(resources).toMatchResourceListSnapshot()'`,
      };
    }

    const normalized = normalizeMCPResponse(resources, options);
    expect(normalized).toMatchSnapshot();
    return { pass: true, message: () => '' };
  },

  /**
   * Snapshot matcher for prompt lists
   */
  async toMatchPromptListSnapshot(received: unknown, options?: MCPSnapshotOptions) {
    let prompts: Prompt[];

    // Handle MCPTestClient
    if (isMCPTestClient(received)) {
      try {
        prompts = await received.listPrompts();
      } catch (error) {
        return {
          pass: false,
          message: () =>
            `Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`,
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
          `Expected MCPTestClient or Prompt[], but received ${typeof received}. Use 'await expect(client).toMatchPromptListSnapshot()' or 'expect(prompts).toMatchPromptListSnapshot()'`,
      };
    }

    const normalized = normalizeMCPResponse(prompts, options);
    expect(normalized).toMatchSnapshot();
    return { pass: true, message: () => '' };
  },
};
