/**
 * Integration tests using the official MCP SDK
 * Proves the logger works correctly with @modelcontextprotocol/sdk
 *
 * This demonstrates that developers using the official SDK can safely
 * use console.log() in their MCP servers without breaking the protocol.
 */

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterEach, describe, expect, it } from 'vitest';

// Track active clients for cleanup
const activeClients: Client[] = [];

async function createMCPClient(): Promise<Client> {
  const serverPath = join(
    fileURLToPath(new URL('..', import.meta.url)),
    'fixtures',
    'test-mcp-server.js'
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  activeClients.push(client);

  return client;
}

describe('MCP SDK Integration', () => {
  afterEach(async () => {
    // Cleanup all clients
    await Promise.all(
      activeClients.map((client) =>
        client.close().catch(() => {
          /* ignore */
        })
      )
    );
    activeClients.length = 0;
  });

  it('should successfully connect to MCP server with logger enabled', async () => {
    const client = await createMCPClient();

    // If connection succeeds, logger didn't break the protocol
    expect(client).toBeDefined();
  });

  it('should handle listTools request despite console.log in handler', async () => {
    const client = await createMCPClient();

    // This handler uses console.log - if it corrupted stdio, this would fail
    const result = await client.listTools();

    expect(result).toBeDefined();
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools).toHaveLength(2);

    // Verify tool structure
    expect(result.tools[0]).toHaveProperty('name');
    expect(result.tools[0]).toHaveProperty('description');
    expect(result.tools[0]).toHaveProperty('inputSchema');
  });

  it('should handle callTool with console.log in handler', async () => {
    const client = await createMCPClient();

    // Call tool that does heavy logging (console.log, console.info, console.debug)
    const result = await client.callTool({
      name: 'echo',
      arguments: { message: 'Hello from MCP SDK!' },
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect((result.content as any)[0]).toMatchObject({
      type: 'text',
      text: 'Hello from MCP SDK!',
    });
  });

  it('should handle multiple concurrent requests with logging', async () => {
    const client = await createMCPClient();

    // Make multiple concurrent requests - all handlers log to console
    const results = await Promise.all([
      client.listTools(),
      client.callTool({ name: 'echo', arguments: { message: 'test1' } }),
      client.listTools(),
      client.callTool({ name: 'add', arguments: { a: 5, b: 3 } }),
      client.listTools(),
    ]);

    // All should succeed
    expect(results).toHaveLength(5);
    expect((results[0] as any).tools).toHaveLength(2);
    expect((results[1] as any).content[0].text).toBe('test1');
    expect((results[2] as any).tools).toHaveLength(2);
    expect((results[3] as any).content[0].text).toBe('8');
    expect((results[4] as any).tools).toHaveLength(2);
  });

  it('should handle tool call with complex object arguments and logging', async () => {
    const client = await createMCPClient();

    // Handler logs the arguments object with console.debug
    const result = await client.callTool({
      name: 'add',
      arguments: { a: 42, b: 13 },
    });

    expect((result.content as any)[0].text).toBe('55');
  });

  it('should handle all available tools', async () => {
    const client = await createMCPClient();

    const { tools } = await client.listTools();

    // Test each tool
    for (const tool of tools) {
      if (tool.name === 'echo') {
        const result = await client.callTool({
          name: 'echo',
          arguments: { message: `Testing ${tool.name}` },
        });
        expect((result.content as any)[0].text).toBe(`Testing ${tool.name}`);
      } else if (tool.name === 'add') {
        const result = await client.callTool({
          name: 'add',
          arguments: { a: 10, b: 20 },
        });
        expect((result.content as any)[0].text).toBe('30');
      }
    }
  });

  it('should handle rapid sequential requests with logging', async () => {
    const client = await createMCPClient();

    // Make rapid sequential requests
    for (let i = 0; i < 20; i++) {
      const result = await client.callTool({
        name: 'add',
        arguments: { a: i, b: i + 1 },
      });
      expect((result.content as any)[0].text).toBe(String(i + i + 1));
    }
  });

  it('should handle server initialization with startup logs', async () => {
    // Creating a client triggers server startup which logs to console
    const client = await createMCPClient();

    // If we can successfully list tools, startup logs didn't corrupt the protocol
    const result = await client.listTools();
    expect(result.tools).toHaveLength(2);
  });

  it('should handle tool errors without protocol corruption', async () => {
    const client = await createMCPClient();

    // Call non-existent tool (handler will throw error)
    await expect(
      client.callTool({
        name: 'nonexistent',
        arguments: {},
      })
    ).rejects.toThrow();

    // Protocol should still work after error
    const result = await client.listTools();
    expect(result.tools).toHaveLength(2);
  });

  it('should work with fresh client instances', async () => {
    // Test that each new client works independently
    const client1 = await createMCPClient();
    const result1 = await client1.listTools();
    expect(result1.tools).toHaveLength(2);

    const client2 = await createMCPClient();
    const result2 = await client2.listTools();
    expect(result2.tools).toHaveLength(2);

    const client3 = await createMCPClient();
    const result3 = await client3.listTools();
    expect(result3.tools).toHaveLength(2);
  });
});
