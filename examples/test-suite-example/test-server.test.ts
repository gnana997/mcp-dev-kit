/**
 * Test Suite Example - Demonstrating mcp-dev-kit Testing Features
 *
 * This file showcases:
 * - MCPTestClient for easy server testing
 * - Custom Vitest matchers for expressive assertions
 * - Best practices for testing MCP servers
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MCPTestClient } from '../../src/client/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MCP Server Test Suite Example', () => {
  const serverPath = path.join(__dirname, 'test-server.js');
  let client: MCPTestClient;

  beforeAll(async () => {
    client = new MCPTestClient({
      command: 'node',
      args: [serverPath],
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  // ============================================================================
  // PART 1: Custom Matchers - The Star Feature! ⭐
  // ============================================================================
  describe('✨ Custom Vitest Matchers', () => {
    describe('toHaveTool matcher', () => {
      it('should check if server has a tool', async () => {
        // Beautiful, expressive syntax!
        await expect(client).toHaveTool('echo');
        await expect(client).toHaveTool('calculate');
        await expect(client).toHaveTool('format');
      });

      it('should fail when tool does not exist', async () => {
        await expect(expect(client).toHaveTool('nonexistent')).rejects.toThrow();
      });
    });

    describe('toReturnToolResult matcher', () => {
      it('should assert tool returns expected result', async () => {
        // Clean, readable test assertions
        await expect(client.callTool('echo', { message: 'hello' })).toReturnToolResult('hello');

        await expect(
          client.callTool('calculate', { operation: 'add', a: 5, b: 3 })
        ).toReturnToolResult('8');
      });
    });

    describe('toThrowToolError matcher', () => {
      it('should assert tool throws an error', async () => {
        // Test error cases elegantly
        await expect(
          client.callTool('calculate', { operation: 'divide', a: 10, b: 0 })
        ).toThrowToolError();

        await expect(client.callTool('echo', { message: '' })).toThrowToolError();
      });
    });

    describe('toMatchToolSchema matcher', () => {
      it('should validate tool input schema', async () => {
        const tools = await client.listTools();
        const echoTool = tools.find((t) => t.name === 'echo');

        // Validate tool schemas with ease
        expect(echoTool).toMatchToolSchema({
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'Message to echo',
            },
          },
        });
      });

      it('should validate calculate tool schema', async () => {
        const tools = await client.listTools();
        const calcTool = tools.find((t) => t.name === 'calculate');

        expect(calcTool).toMatchToolSchema({
          type: 'object',
          required: ['operation', 'a', 'b'],
        });
      });
    });
  });

  // ============================================================================
  // PART 2: Standard Testing Patterns
  // ============================================================================
  describe('Server Initialization', () => {
    it('should connect successfully', () => {
      expect(client.isConnected()).toBe(true);
    });

    it('should have correct server info', () => {
      const info = client.getServerInfo();
      expect(info?.name).toBe('test-suite-example-server');
      expect(info?.version).toBe('1.0.0');
    });

    it('should have tools capability', () => {
      const capabilities = client.getServerCapabilities();
      expect(capabilities?.tools).toBeDefined();
    });
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const tools = await client.listTools();
      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual(['echo', 'calculate', 'format']);
    });

    it('should provide tool descriptions', async () => {
      const tools = await client.listTools();

      const echoTool = tools.find((t) => t.name === 'echo');
      expect(echoTool?.description).toBe('Echoes back the message');

      const calcTool = tools.find((t) => t.name === 'calculate');
      expect(calcTool?.description).toBe('Performs arithmetic operations');

      const formatTool = tools.find((t) => t.name === 'format');
      expect(formatTool?.description).toBe('Formats a message with timestamp');
    });
  });

  describe('Echo Tool', () => {
    it('should echo simple messages', async () => {
      const result = await client.expectToolCallSuccess<string>('echo', { message: 'hello' });
      expect(result).toBe('hello');
    });

    it('should echo complex messages with special characters', async () => {
      const message = 'Hello, World! 🌍 ✨';
      const result = await client.expectToolCallSuccess<string>('echo', { message });
      expect(result).toBe(message);
    });

    it('should fail without message parameter', async () => {
      const error = await client.expectToolCallError('echo', {});
      expect(error).toBeDefined();
      expect(error.message).toContain('Message is required');
    });

    it('should fail with empty message', async () => {
      const error = await client.expectToolCallError('echo', { message: '' });
      expect(error).toBeDefined();
    });
  });

  describe('Calculate Tool', () => {
    describe('Addition', () => {
      it('should add positive numbers', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'add',
          a: 5,
          b: 3,
        });
        expect(result).toBe('8');
      });

      it('should add negative numbers', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'add',
          a: -5,
          b: -3,
        });
        expect(result).toBe('-8');
      });

      it('should handle decimal addition', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'add',
          a: 1.5,
          b: 2.3,
        });
        expect(result).toBe('3.8');
      });
    });

    describe('Subtraction', () => {
      it('should subtract numbers', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'subtract',
          a: 10,
          b: 3,
        });
        expect(result).toBe('7');
      });

      it('should handle negative results', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'subtract',
          a: 3,
          b: 10,
        });
        expect(result).toBe('-7');
      });
    });

    describe('Multiplication', () => {
      it('should multiply numbers', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'multiply',
          a: 4,
          b: 5,
        });
        expect(result).toBe('20');
      });

      it('should handle zero multiplication', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'multiply',
          a: 5,
          b: 0,
        });
        expect(result).toBe('0');
      });
    });

    describe('Division', () => {
      it('should divide numbers', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'divide',
          a: 10,
          b: 2,
        });
        expect(result).toBe('5');
      });

      it('should handle decimal division', async () => {
        const result = await client.expectToolCallSuccess<string>('calculate', {
          operation: 'divide',
          a: 7,
          b: 2,
        });
        expect(result).toBe('3.5');
      });

      it('should fail on division by zero', async () => {
        const error = await client.expectToolCallError('calculate', {
          operation: 'divide',
          a: 10,
          b: 0,
        });
        expect(error.message).toContain('Division by zero');
      });
    });

    describe('Error Handling', () => {
      it('should fail with unknown operation', async () => {
        const error = await client.expectToolCallError('calculate', {
          operation: 'modulo',
          a: 10,
          b: 3,
        });
        expect(error.message).toContain('Unknown operation');
      });
    });
  });

  describe('Format Tool', () => {
    it('should format message with ISO timestamp', async () => {
      const result = await client.expectToolCallSuccess<string>('format', { message: 'test' });
      // Validates ISO 8601 timestamp format
      expect(result).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] test$/);
    });

    it('should handle empty messages', async () => {
      const result = await client.expectToolCallSuccess<string>('format', { message: '' });
      expect(result).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] $/);
    });

    it('should preserve special characters', async () => {
      const result = await client.expectToolCallSuccess<string>('format', {
        message: 'Hello 🌍 World!',
      });
      expect(result).toContain('Hello 🌍 World!');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle calls to unknown tools', async () => {
      const error = await client.expectToolCallError('nonexistent-tool', {});
      expect(error.message).toContain('Unknown tool');
    });
  });
});
