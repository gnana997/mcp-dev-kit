/**
 * Tests for MCP snapshot matchers
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

describe('MCP Snapshot Matchers', () => {
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

  describe('toMatchToolListSnapshot', () => {
    it('should create snapshot of tool list from client', async () => {
      await expect(client).toMatchToolListSnapshot();
    });

    it('should create snapshot of tool array', async () => {
      const tools = await client.listTools();
      expect(tools).toMatchToolListSnapshot();
    });

    it('should exclude custom fields', async () => {
      const tools = await client.listTools();
      expect(tools).toMatchToolListSnapshot({
        exclude: ['description'], // Additionally exclude descriptions
      });
    });

    it('should fail with invalid input', async () => {
      await expect(async () => {
        await expect({ invalid: 'data' }).toMatchToolListSnapshot();
      }).rejects.toThrow(/Expected MCPTestClient or Tool\[\]/);
    });
  });

  describe('toMatchToolResponseSnapshot', () => {
    it('should create snapshot of tool call result', async () => {
      const result = await client.callTool('echo', { message: 'test snapshot' });
      expect(result).toMatchToolResponseSnapshot();
    });

    it('should exclude execution time and cache key by default', async () => {
      // These fields should be auto-excluded even if present
      const result = await client.callTool('add', { a: 5, b: 3 });
      expect(result).toMatchToolResponseSnapshot();
    });

    it('should fail with invalid input', async () => {
      expect(() => {
        expect({ invalid: 'data' }).toMatchToolResponseSnapshot();
      }).toThrow(/Expected ToolCallResult/);
    });
  });

  describe('toMatchMCPSnapshot', () => {
    it('should create generic snapshot', () => {
      const data = {
        foo: 'bar',
        timestamp: '2024-01-01T00:00:00.000Z', // Should be auto-excluded
        nested: {
          value: 123,
        },
      };
      expect(data).toMatchMCPSnapshot();
    });

    it('should exclude specified fields', () => {
      const data = {
        keep: 'this',
        remove: 'this',
        timestamp: 'auto-removed',
      };
      expect(data).toMatchMCPSnapshot({
        exclude: ['remove'],
      });
    });

    it('should handle arrays', () => {
      const data = [
        { id: 1, name: 'first', timestamp: '2024-01-01' },
        { id: 2, name: 'second', timestamp: '2024-01-02' },
      ];
      expect(data).toMatchMCPSnapshot();
    });

    it('should handle nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
              timestamp: 'should-be-removed',
            },
          },
        },
      };
      expect(data).toMatchMCPSnapshot();
    });
  });

  describe('Auto-excluded fields', () => {
    it('should exclude timestamp', () => {
      const data = { value: 'keep', timestamp: 'exclude' };
      expect(data).toMatchMCPSnapshot();
    });

    it('should exclude requestId', () => {
      const data = { value: 'keep', requestId: 12345 };
      expect(data).toMatchMCPSnapshot();
    });

    it('should exclude nested timestamps', () => {
      const data = {
        value: 'keep',
        _meta: {
          timestamp: 'exclude',
          other: 'keep',
        },
      };
      expect(data).toMatchMCPSnapshot();
    });

    it('should exclude serverInfo.startedAt', () => {
      const data = {
        value: 'keep',
        serverInfo: {
          name: 'test',
          startedAt: '2024-01-01',
          uptime: 12345,
        },
      };
      expect(data).toMatchMCPSnapshot();
    });

    it('should exclude executionTime and cacheKey', () => {
      const data = {
        result: 'success',
        executionTime: 123,
        cacheKey: 'abc123',
      };
      expect(data).toMatchMCPSnapshot();
    });
  });

  describe('Integration tests', () => {
    it('should snapshot complete server interaction', async () => {
      // Get all server capabilities
      const tools = await client.listTools();
      const serverInfo = client.getServerInfo();
      const capabilities = client.getServerCapabilities();

      const snapshot = {
        tools: tools.map((t) => ({ name: t.name, description: t.description })),
        serverInfo,
        capabilities,
      };

      expect(snapshot).toMatchMCPSnapshot();
    });

    it('should snapshot multiple tool calls', async () => {
      const results = await Promise.all([
        client.callTool('echo', { message: 'first' }),
        client.callTool('echo', { message: 'second' }),
        client.callTool('add', { a: 1, b: 2 }),
      ]);

      // Snapshot array of results
      expect(results).toMatchMCPSnapshot();
    });

    it('should handle complex nested MCP responses', async () => {
      const tools = await client.listTools();

      // Create complex nested structure
      const complex = {
        timestamp: new Date().toISOString(), // Auto-excluded
        data: {
          tools,
          metadata: {
            requestId: 'abc123', // Auto-excluded
            count: tools.length,
            generatedAt: new Date().toISOString(), // Not auto-excluded (custom field)
          },
        },
      };

      expect(complex).toMatchMCPSnapshot({
        exclude: ['data.metadata.generatedAt'], // Manually exclude custom timestamp field
      });
    });
  });

  describe('Error handling', () => {
    it('should provide helpful error for invalid client', async () => {
      await expect(async () => {
        await expect('not a client').toMatchToolListSnapshot();
      }).rejects.toThrow(/Expected MCPTestClient or Tool\[\]/);
    });

    it('should handle server errors gracefully', async () => {
      // Disconnect client to simulate error
      await client.disconnect();

      await expect(async () => {
        await expect(client).toMatchToolListSnapshot();
      }).rejects.toThrow(/Failed to list tools/);

      // Reconnect for other tests
      await client.connect();
    });
  });
});
