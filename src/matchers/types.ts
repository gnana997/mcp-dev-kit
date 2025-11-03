/**
 * Type definitions for custom Vitest matchers
 */

import type { MCPTestClient } from '../client/test-client.js';
import type { Prompt, Resource, Tool, ToolCallResult } from '../client/types.js';

/**
 * Custom matchers for MCP testing
 * Internal interface for the matcher implementations
 */
export interface MCPMatchersInternal {
  toHaveTool(
    received: unknown,
    toolName: string
  ): Promise<{ pass: boolean; message: () => string }>;
  toHaveResource(received: unknown, uri: string): Promise<{ pass: boolean; message: () => string }>;
  toHavePrompt(
    received: unknown,
    promptName: string
  ): Promise<{ pass: boolean; message: () => string }>;
  toReturnToolResult(
    received: unknown,
    expected: unknown
  ): Promise<{ pass: boolean; message: () => string }>;
  toThrowToolError(received: unknown): Promise<{ pass: boolean; message: () => string }>;
  toHaveToolProperty(
    received: unknown,
    property: string,
    value?: unknown
  ): { pass: boolean; message: () => string };
  toMatchToolSchema(
    received: unknown,
    schema: Record<string, unknown>
  ): { pass: boolean; message: () => string };
}

/**
 * Custom matchers for MCP testing (user-facing API)
 */
export interface MCPMatchers<R = unknown> {
  /**
   * Assert that the server has a tool with the given name
   * @param toolName - Name of the tool to check for
   * @example
   * await expect(client).toHaveTool('echo');
   * expect(tools).toHaveTool('calculate');
   */
  toHaveTool(toolName: string): R;

  /**
   * Assert that the server has a resource with the given URI
   * @param uri - URI of the resource to check for
   * @example
   * await expect(client).toHaveResource('config://app.json');
   * expect(resources).toHaveResource('file://readme.md');
   */
  toHaveResource(uri: string): R;

  /**
   * Assert that the server has a prompt with the given name
   * @param promptName - Name of the prompt to check for
   * @example
   * await expect(client).toHavePrompt('greeting');
   * expect(prompts).toHavePrompt('code-review');
   */
  toHavePrompt(promptName: string): R;

  /**
   * Assert that a tool call returns a specific result
   * @param expected - Expected result value
   * @example
   * await expect(client.callTool('echo', { message: 'test' })).toReturnToolResult('test');
   */
  toReturnToolResult(expected: unknown): R;

  /**
   * Assert that a tool call throws an error
   * @example
   * await expect(client.callTool('invalid', {})).toThrowToolError();
   */
  toThrowToolError(): R;

  /**
   * Assert that a tool has a specific property with optional value check
   * @param property - Property name to check
   * @param value - Optional expected value
   * @example
   * expect(tool).toHaveToolProperty('description');
   * expect(tool).toHaveToolProperty('name', 'echo');
   */
  toHaveToolProperty(property: string, value?: unknown): R;

  /**
   * Assert that a tool's input schema matches expected structure
   * @param schema - Expected schema structure (partial match)
   * @example
   * expect(tool).toMatchToolSchema({ type: 'object', required: ['message'] });
   */
  toMatchToolSchema(schema: Record<string, unknown>): R;
}

/**
 * Supported types for matchers
 */
export type MatcherInput =
  | MCPTestClient
  | Tool[]
  | Tool
  | Resource[]
  | Prompt[]
  | Promise<ToolCallResult>
  | ToolCallResult;

// Module augmentation for Vitest - extends expect() with custom matchers
declare module 'vitest' {
  interface Assertion extends MCPMatchers<any> {}
  interface AsymmetricMatchersContaining extends MCPMatchers<any> {}
}
