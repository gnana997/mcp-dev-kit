/**
 * Example test demonstrating the <10 line usage goal for MCPTestClient
 * This shows how easy it is to write tests for MCP servers
 */

import { describe, it, expect } from 'vitest';
import { MCPTestClient } from '../src/client/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MCPTestClient - Example Usage', () => {
	const serverPath = path.join(__dirname, 'fixtures', 'test-mcp-server.js');

	// Example 1: Complete test in 8 lines
	it('should test an MCP server tool in under 10 lines', async () => {
		const client = new MCPTestClient({
			command: 'node',
			args: [serverPath],
		});

		await client.connect();
		await client.expectToolExists('echo');
		const result = await client.expectToolCallSuccess('echo', { message: 'Hello, MCP!' });
		expect(result).toBe('Hello, MCP!');
		await client.disconnect();
	});

	// Example 2: Testing tool discovery
	it('should discover available tools', async () => {
		const client = new MCPTestClient({
			command: 'node',
			args: [serverPath],
		});

		await client.connect();
		const tools = await client.listTools();
		expect(tools).toHaveLength(2);
		expect(tools[0]?.name).toBe('echo');
		await client.disconnect();
	});

	// Example 3: Testing error handling
	it('should handle tool errors gracefully', async () => {
		const client = new MCPTestClient({
			command: 'node',
			args: [serverPath],
		});

		await client.connect();
		await expect(client.expectToolExists('nonexistent')).rejects.toThrow(
			"Tool 'nonexistent' not found"
		);
		await client.disconnect();
	});
});
