/**
 * Tests for custom Vitest matchers
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MCPTestClient } from '../src/client/index.js';
import { installMCPMatchers } from '../src/matchers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Install custom matchers
installMCPMatchers();

describe('Custom MCP Matchers', () => {
  const serverPath = path.join(__dirname, 'fixtures', 'test-mcp-server.js');
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

  describe('toHaveTool', () => {
    describe('with MCPTestClient', () => {
      it('should pass when tool exists', async () => {
        await expect(client).toHaveTool('echo');
        await expect(client).toHaveTool('add');
      });

      it('should fail when tool does not exist', async () => {
        await expect(async () => {
          await expect(client).toHaveTool('nonexistent');
        }).rejects.toThrow(/available tools are/);
      });

      it('should show available tools in error message', async () => {
        try {
          await expect(client).toHaveTool('missing');
          expect.fail('Should have thrown');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('echo');
          expect(err.message).toContain('add');
        }
      });
    });

    describe('with Tool array', () => {
      it('should pass when tool exists in array', async () => {
        const tools = await client.listTools();
        expect(tools).toHaveTool('echo');
        expect(tools).toHaveTool('add');
      });

      it('should fail when tool not in array', async () => {
        const tools = await client.listTools();
        try {
          await expect(tools).toHaveTool('missing');
          expect.fail('Should have failed');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('available tools are');
        }
      });

      it('should handle empty array', async () => {
        try {
          await expect([]).toHaveTool('test');
          expect.fail('Should have failed');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('available tools are: none');
        }
      });
    });

    describe('with invalid input', () => {
      it('should fail with helpful error for invalid type', async () => {
        await expect(async () => {
          await expect('invalid' as never).toHaveTool('test');
        }).rejects.toThrow(/Expected MCPTestClient or Tool\[\]/);
      });
    });
  });

  describe('toHaveResource', () => {
    describe('with MCPTestClient', () => {
      it('should pass when resource exists', async () => {
        await expect(client).toHaveResource('config://app.json');
        await expect(client).toHaveResource('file://readme.md');
      });

      it('should fail when resource does not exist', async () => {
        await expect(async () => {
          await expect(client).toHaveResource('file://missing.txt');
        }).rejects.toThrow(/available resources are/);
      });

      it('should show available resources in error message', async () => {
        try {
          await expect(client).toHaveResource('missing://resource');
          expect.fail('Should have thrown');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('config://app.json');
          expect(err.message).toContain('file://readme.md');
        }
      });
    });

    describe('with Resource array', () => {
      it('should pass when resource exists in array', async () => {
        const resources = await client.listResources();
        expect(resources).toHaveResource('config://app.json');
        expect(resources).toHaveResource('file://readme.md');
      });

      it('should fail when resource not in array', async () => {
        const resources = await client.listResources();
        try {
          await expect(resources).toHaveResource('missing://resource');
          expect.fail('Should have failed');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('available resources are');
        }
      });

      it('should handle empty array', async () => {
        try {
          await expect([]).toHaveResource('test://resource');
          expect.fail('Should have failed');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('available resources are: none');
        }
      });
    });
  });

  describe('toHavePrompt', () => {
    describe('with MCPTestClient', () => {
      it('should pass when prompt exists', async () => {
        await expect(client).toHavePrompt('greeting');
        await expect(client).toHavePrompt('code-review');
      });

      it('should fail when prompt does not exist', async () => {
        await expect(async () => {
          await expect(client).toHavePrompt('missing');
        }).rejects.toThrow(/available prompts are/);
      });

      it('should show available prompts in error message', async () => {
        try {
          await expect(client).toHavePrompt('nonexistent');
          expect.fail('Should have thrown');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('greeting');
          expect(err.message).toContain('code-review');
        }
      });
    });

    describe('with Prompt array', () => {
      it('should pass when prompt exists in array', async () => {
        const prompts = await client.listPrompts();
        expect(prompts).toHavePrompt('greeting');
        expect(prompts).toHavePrompt('code-review');
      });

      it('should fail when prompt not in array', async () => {
        const prompts = await client.listPrompts();
        try {
          await expect(prompts).toHavePrompt('missing');
          expect.fail('Should have failed');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('available prompts are');
        }
      });

      it('should handle empty array', async () => {
        try {
          await expect([]).toHavePrompt('test');
          expect.fail('Should have failed');
        } catch (error) {
          const err = error as Error;
          expect(err.message).toContain('available prompts are: none');
        }
      });
    });
  });

  describe('toReturnToolResult', () => {
    it('should pass when result matches (string)', async () => {
      await expect(client.callTool('echo', { message: 'test' })).toReturnToolResult('test');
    });

    it('should pass when result matches (number)', async () => {
      await expect(client.callTool('add', { a: 5, b: 3 })).toReturnToolResult('8');
    });

    it('should parse JSON results', async () => {
      await expect(client.callTool('echo', { message: '{"key":"value"}' })).toReturnToolResult({
        key: 'value',
      });
    });

    it('should parse JSON arrays', async () => {
      await expect(client.callTool('echo', { message: '[1,2,3]' })).toReturnToolResult([1, 2, 3]);
    });

    it('should fail when result does not match', async () => {
      await expect(async () => {
        await expect(client.callTool('echo', { message: 'test' })).toReturnToolResult('wrong');
      }).rejects.toThrow(/Expected tool call to return/);
    });

    it('should handle tool errors', async () => {
      await expect(async () => {
        await expect(client.callTool('unknown', {})).toReturnToolResult('anything');
      }).rejects.toThrow();
    });

    it('should work with ToolCallResult directly', async () => {
      const result = await client.callTool('echo', { message: 'direct' });
      expect(result).toReturnToolResult('direct');
    });
  });

  describe('toThrowToolError', () => {
    it('should pass when tool throws error', async () => {
      await expect(client.callTool('unknown', {})).toThrowToolError();
    });

    it('should fail when tool succeeds', async () => {
      await expect(async () => {
        await expect(client.callTool('echo', { message: 'test' })).toThrowToolError();
      }).rejects.toThrow(/Expected tool call to throw error/);
    });

    it('should require a Promise', async () => {
      await expect(async () => {
        await expect('not a promise' as never).toThrowToolError();
      }).rejects.toThrow(/Expected Promise from tool call/);
    });
  });

  describe('toHaveToolProperty', () => {
    it('should pass when property exists', async () => {
      const tools = await client.listTools();
      const echoTool = tools[0];
      expect(echoTool).toHaveToolProperty('name');
      expect(echoTool).toHaveToolProperty('description');
      expect(echoTool).toHaveToolProperty('inputSchema');
    });

    it('should pass when property exists with matching value', async () => {
      const tools = await client.listTools();
      const echoTool = tools[0];
      expect(echoTool).toHaveToolProperty('name', 'echo');
      expect(echoTool).toHaveToolProperty('description', 'Echoes back the message');
    });

    it('should fail when property does not exist', async () => {
      const tools = await client.listTools();
      const echoTool = tools[0];
      await expect(async () => {
        expect(echoTool).toHaveToolProperty('nonexistent');
      }).rejects.toThrow(/Expected tool to have property/);
    });

    it('should fail when property value does not match', async () => {
      const tools = await client.listTools();
      const echoTool = tools[0];
      await expect(async () => {
        expect(echoTool).toHaveToolProperty('name', 'wrong');
      }).rejects.toThrow(/Expected tool.name to equal/);
    });

    it('should require Tool object', async () => {
      await expect(async () => {
        expect('not a tool' as never).toHaveToolProperty('name');
      }).rejects.toThrow(/Expected Tool object/);
    });
  });

  describe('toMatchToolSchema', () => {
    it('should pass when schema matches partially', async () => {
      const tools = await client.listTools();
      const echoTool = tools[0];
      expect(echoTool).toMatchToolSchema({ type: 'object' });
      expect(echoTool).toMatchToolSchema({ required: ['message'] });
    });

    it('should pass when schema matches fully', async () => {
      const tools = await client.listTools();
      const echoTool = tools[0];
      expect(echoTool).toMatchToolSchema({
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message to echo',
          },
        },
        required: ['message'],
      });
    });

    it('should fail when schema does not match', async () => {
      const tools = await client.listTools();
      const echoTool = tools[0];
      await expect(async () => {
        expect(echoTool).toMatchToolSchema({ type: 'array' });
      }).rejects.toThrow(/found mismatches/);
    });

    it('should show mismatches in error message', async () => {
      const tools = await client.listTools();
      const echoTool = tools[0];
      try {
        expect(echoTool).toMatchToolSchema({
          type: 'array',
          required: ['wrong'],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toContain('type:');
        expect(err.message).toContain('required:');
      }
    });

    it('should require Tool object', async () => {
      await expect(async () => {
        expect('not a tool' as never).toMatchToolSchema({ type: 'object' });
      }).rejects.toThrow(/Expected Tool object/);
    });
  });

  describe('Integration - Real world usage', () => {
    it('should work with typical test workflow', async () => {
      // Check server has expected tools
      await expect(client).toHaveTool('echo');
      await expect(client).toHaveTool('add');

      // Check tool properties
      const tools = await client.listTools();
      const echoTool = tools.find((t) => t.name === 'echo')!;
      expect(echoTool).toHaveToolProperty('description', 'Echoes back the message');
      expect(echoTool).toMatchToolSchema({ type: 'object', required: ['message'] });

      // Test tool calls
      await expect(client.callTool('echo', { message: 'hello' })).toReturnToolResult('hello');
      await expect(client.callTool('add', { a: 10, b: 20 })).toReturnToolResult('30');

      // Test error cases
      await expect(client.callTool('unknown', {})).toThrowToolError();
    });

    it('should work with resources', async () => {
      await expect(client).toHaveResource('config://app.json');
      await expect(client).toHaveResource('file://readme.md');

      const resources = await client.listResources();
      expect(resources).toHaveLength(2);
      expect(resources).toHaveResource('config://app.json');
    });

    it('should work with prompts', async () => {
      await expect(client).toHavePrompt('greeting');
      await expect(client).toHavePrompt('code-review');

      const prompts = await client.listPrompts();
      expect(prompts).toHaveLength(2);
      expect(prompts).toHavePrompt('greeting');
    });
  });
});
