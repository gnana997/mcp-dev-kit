/**
 * Integration tests for MCPTestClient with real MCP server
 * Uses tests/fixtures/test-mcp-server.js
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MCPTestClient } from '../src/client/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MCPTestClient Integration Tests', () => {
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

  describe('Connection Lifecycle', () => {
    it('should connect and initialize successfully', () => {
      expect(client.isConnected()).toBe(true);
      expect(client.getServerInfo()).toBeDefined();
    });

    it('should retrieve server info', () => {
      const info = client.getServerInfo();
      expect(info?.name).toBe('test-server');
      expect(info?.version).toBe('1.0.0');
    });

    it('should have server capabilities', () => {
      const capabilities = client.getServerCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities?.tools).toBeDefined();
    });
  });

  describe('Tools - listTools()', () => {
    it('should list available tools', async () => {
      const tools = await client.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual(['echo', 'add']);
    });

    it('should return tools with descriptions', async () => {
      const tools = await client.listTools();
      expect(tools[0]?.description).toBe('Echoes back the message');
      expect(tools[1]?.description).toBe('Adds two numbers');
    });

    it('should return tools with input schemas', async () => {
      const tools = await client.listTools();
      expect(tools[0]?.inputSchema).toBeDefined();
      expect(tools[0]?.inputSchema.type).toBe('object');
      expect(tools[0]?.inputSchema.properties).toBeDefined();
      expect(tools[0]?.inputSchema.required).toEqual(['message']);
    });
  });

  describe('Tools - callTool()', () => {
    it('should call echo tool successfully', async () => {
      const result = await client.callTool('echo', { message: 'Hello' });
      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toBe('Hello');
    });

    it('should call add tool successfully', async () => {
      const result = await client.callTool('add', { a: 5, b: 3 });
      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.text).toBe('8');
    });

    it('should handle different numeric values in add', async () => {
      const result1 = await client.callTool('add', { a: 10, b: 20 });
      expect(result1.content[0]?.text).toBe('30');

      const result2 = await client.callTool('add', { a: -5, b: 15 });
      expect(result2.content[0]?.text).toBe('10');

      const result3 = await client.callTool('add', { a: 0.5, b: 0.3 });
      expect(result3.content[0]?.text).toBe('0.8');
    });

    it('should throw error for unknown tool', async () => {
      await expect(client.callTool('unknown', {})).rejects.toThrow();
    });

    it('should handle echo with empty message', async () => {
      const result = await client.callTool('echo', { message: '' });
      expect(result.content[0]?.text).toBe('');
    });

    it('should handle echo with special characters', async () => {
      const specialMsg = 'Hello! @#$ %^& *() 你好 🎉';
      const result = await client.callTool('echo', { message: specialMsg });
      expect(result.content[0]?.text).toBe(specialMsg);
    });
  });

  describe('Test Helpers - expectToolExists()', () => {
    it('should find existing tool', async () => {
      const tool = await client.expectToolExists('echo');
      expect(tool.name).toBe('echo');
      expect(tool.description).toBe('Echoes back the message');
    });

    it('should find add tool', async () => {
      const tool = await client.expectToolExists('add');
      expect(tool.name).toBe('add');
    });

    it('should throw for missing tool', async () => {
      await expect(client.expectToolExists('nonexistent')).rejects.toThrow(
        "Tool 'nonexistent' not found"
      );
    });

    it('should include available tools in error message', async () => {
      try {
        await client.expectToolExists('missing');
        expect.fail('Should have thrown');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toContain('echo');
        expect(err.message).toContain('add');
      }
    });
  });

  describe('Test Helpers - expectToolCallSuccess()', () => {
    it('should return parsed result for echo', async () => {
      const result = await client.expectToolCallSuccess('echo', { message: 'test' });
      expect(result).toBe('test');
    });

    it('should return parsed result for add', async () => {
      const result = await client.expectToolCallSuccess('add', { a: 10, b: 20 });
      expect(result).toBe('30');
    });

    it('should parse JSON if result is JSON', async () => {
      // Note: Our test server returns plain text, not JSON
      // But the helper should handle JSON if it were returned
      const result = await client.expectToolCallSuccess('echo', { message: '{"key":"value"}' });
      // This should be parsed as JSON
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON array', async () => {
      const result = await client.expectToolCallSuccess('echo', { message: '[1,2,3]' });
      expect(result).toEqual([1, 2, 3]);
    });

    it('should return text as-is if not JSON', async () => {
      const result = await client.expectToolCallSuccess('echo', { message: 'plain text' });
      expect(result).toBe('plain text');
    });
  });

  describe('Test Helpers - expectToolCallError()', () => {
    it('should succeed when tool throws error', async () => {
      const error = await client.expectToolCallError('unknown', {});
      expect(error).toBeInstanceOf(Error);
    });

    it('should throw AssertionError if tool succeeds', async () => {
      await expect(client.expectToolCallError('echo', { message: 'test' })).rejects.toThrow(
        "Expected tool 'echo' to fail, but it succeeded"
      );
    });
  });

  describe('Resources - listResources()', () => {
    it('should list available resources', async () => {
      const resources = await client.listResources();
      expect(resources).toHaveLength(2);
      expect(resources.map((r) => r.uri)).toEqual(['config://app.json', 'file://readme.md']);
    });

    it('should return resources with metadata', async () => {
      const resources = await client.listResources();
      expect(resources[0]?.name).toBe('Application Config');
      expect(resources[0]?.description).toBe('Application configuration file');
      expect(resources[0]?.mimeType).toBe('application/json');
    });
  });

  describe('Resources - readResource()', () => {
    it('should read JSON resource', async () => {
      const result = await client.readResource('config://app.json');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]?.mimeType).toBe('application/json');
      expect(result.contents[0]?.text).toContain('test-app');
    });

    it('should read text resource', async () => {
      const result = await client.readResource('file://readme.md');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]?.mimeType).toBe('text/markdown');
      expect(result.contents[0]?.text).toContain('# Test Project');
    });

    it('should throw error for non-existent resource', async () => {
      await expect(client.readResource('file://missing.txt')).rejects.toThrow();
    });
  });

  describe('Prompts - listPrompts()', () => {
    it('should list available prompts', async () => {
      const prompts = await client.listPrompts();
      expect(prompts).toHaveLength(2);
      expect(prompts.map((p) => p.name)).toEqual(['greeting', 'code-review']);
    });

    it('should return prompts with descriptions', async () => {
      const prompts = await client.listPrompts();
      expect(prompts[0]?.description).toBe('A friendly greeting prompt');
      expect(prompts[1]?.description).toBe('Code review prompt with file argument');
    });

    it('should return prompts with arguments', async () => {
      const prompts = await client.listPrompts();
      expect(prompts[1]?.arguments).toHaveLength(2);
      expect(prompts[1]?.arguments?.[0]?.name).toBe('file');
      expect(prompts[1]?.arguments?.[0]?.required).toBe(true);
    });
  });

  describe('Prompts - getPrompt()', () => {
    it('should get simple prompt without arguments', async () => {
      const result = await client.getPrompt('greeting');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]?.role).toBe('user');
      expect(result.messages[1]?.role).toBe('assistant');
    });

    it('should get prompt with arguments', async () => {
      const result = await client.getPrompt('code-review', {
        file: 'app.ts',
        language: 'typescript',
      });
      expect(result.description).toBe('Code review for app.ts');
      expect(result.messages[0]?.content.text).toContain('typescript');
      expect(result.messages[0]?.content.text).toContain('app.ts');
    });

    it('should get prompt with default argument values', async () => {
      const result = await client.getPrompt('code-review', { file: 'test.js' });
      expect(result.messages[0]?.content.text).toContain('javascript');
    });

    it('should throw error for unknown prompt', async () => {
      await expect(client.getPrompt('unknown')).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw ConnectionError for invalid command', async () => {
      const badClient = new MCPTestClient({
        command: 'nonexistent-command',
        args: [],
      });

      await expect(badClient.connect()).rejects.toThrow('Failed to connect to server');
    });

    it('should cleanup on connection failure', async () => {
      const badClient = new MCPTestClient({
        command: 'nonexistent',
        args: [],
      });

      try {
        await badClient.connect();
      } catch {
        // Expected to fail
      }

      expect(badClient.isConnected()).toBe(false);
    });

    it('should throw if calling methods before connect', async () => {
      const disconnectedClient = new MCPTestClient({
        command: 'node',
        args: [serverPath],
      });

      await expect(disconnectedClient.listTools()).rejects.toThrow(
        'Not connected to server. Call connect() first.'
      );
    });

    it('should throw if calling callTool before connect', async () => {
      const disconnectedClient = new MCPTestClient({
        command: 'node',
        args: [serverPath],
      });

      await expect(disconnectedClient.callTool('test', {})).rejects.toThrow(
        'Not connected to server'
      );
    });

    it('should throw if calling listResources before connect', async () => {
      const disconnectedClient = new MCPTestClient({
        command: 'node',
        args: [serverPath],
      });

      await expect(disconnectedClient.listResources()).rejects.toThrow('Not connected to server');
    });

    it('should throw if calling listPrompts before connect', async () => {
      const disconnectedClient = new MCPTestClient({
        command: 'node',
        args: [serverPath],
      });

      await expect(disconnectedClient.listPrompts()).rejects.toThrow('Not connected to server');
    });

    it('should throw if attempting to connect twice', async () => {
      const testClient = new MCPTestClient({
        command: 'node',
        args: [serverPath],
      });

      await testClient.connect();
      await expect(testClient.connect()).rejects.toThrow('Already connected to server');
      await testClient.disconnect();
    });
  });

  describe('Multiple Clients', () => {
    it('should support multiple concurrent clients', async () => {
      const client1 = new MCPTestClient({ command: 'node', args: [serverPath] });
      const client2 = new MCPTestClient({ command: 'node', args: [serverPath] });

      await Promise.all([client1.connect(), client2.connect()]);

      const [result1, result2] = await Promise.all([
        client1.callTool('echo', { message: 'Client 1' }),
        client2.callTool('echo', { message: 'Client 2' }),
      ]);

      expect(result1.content[0]?.text).toBe('Client 1');
      expect(result2.content[0]?.text).toBe('Client 2');

      await Promise.all([client1.disconnect(), client2.disconnect()]);
    });
  });
});
