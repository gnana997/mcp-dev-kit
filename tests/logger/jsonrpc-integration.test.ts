/**
 * Integration tests using node-stdio-jsonrpc
 * Proves the logger works with pure JSON-RPC 2.0 implementations
 *
 * This demonstrates:
 * 1. Logger is protocol-agnostic (not MCP-specific)
 * 2. Works with any JSON-RPC library
 * 3. Interoperability between packages
 */

import { StdioClient } from 'node-stdio-jsonrpc';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

// Track active clients for cleanup
const activeClients: StdioClient[] = [];

async function createClient(): Promise<{
	client: StdioClient;
}> {
	const serverPath = join(
		fileURLToPath(new URL('..', import.meta.url)),
		'fixtures',
		'test-jsonrpc-server.js'
	);

	const client = new StdioClient({
		command: 'node',
		args: [serverPath],
	});

	await client.connect();

	activeClients.push(client);

	return { client };
}

describe('JSON-RPC Integration (node-stdio-jsonrpc)', () => {
	afterEach(async () => {
		// Cleanup all clients
		await Promise.all(
			activeClients.map((client) =>
				client.disconnect().catch(() => {
					/* ignore */
				})
			)
		);
		activeClients.length = 0;
	});

	it('should connect and make requests with StdioClient', async () => {
		const { client } = await createClient();

		const result = await client.request('echo', { message: 'Hello!' });

		expect(result).toEqual({ message: 'Hello!' });
	});

	it('should handle console.log in request handlers', async () => {
		const { client } = await createClient();

		// Handler logs to console - should not break protocol
		const result = await client.request('add', { a: 5, b: 3 });

		expect(result).toEqual({ result: 8 });
	});

	it('should handle requests with logging without breaking protocol', async () => {
		const { client } = await createClient();

		// Make request that logs heavily (verified in stdio-integration tests)
		// If logging corrupted stdout, this would fail
		const result = await client.request('getServerInfo', {}) as any;

		expect(result).toHaveProperty('name');
		expect(result.name).toBe('test-jsonrpc-server');
		expect(result).toHaveProperty('capabilities');
	});

	it('should handle multiple concurrent requests', async () => {
		const { client } = await createClient();

		const results = await Promise.all([
			client.request('add', { a: 1, b: 2 }),
			client.request('multiply', { a: 3, b: 4 }),
			client.request('echo', { message: 'test' }),
			client.request('add', { a: 10, b: 20 }),
		]);

		expect(results[0]).toEqual({ result: 3 });
		expect(results[1]).toEqual({ result: 12 });
		expect(results[2]).toEqual({ message: 'test' });
		expect(results[3]).toEqual({ result: 30 });
	});

	it('should handle complex object parameters and logging', async () => {
		const { client } = await createClient();

		const complexParam = {
			nested: { value: 42 },
			array: [1, 2, 3],
			string: 'test',
		};

		// Handler logs this complex object with console.debug
		const result = await client.request('complexObject', complexParam) as any;

		expect(result).toHaveProperty('nested');
		expect(result.nested).toHaveProperty('array');
		expect(result.nested).toHaveProperty('object');
		expect(result.nested.original).toEqual(complexParam);
	});

	it('should handle errors without corrupting protocol', async () => {
		const { client } = await createClient();

		// Call non-existent method
		await expect(client.request('nonexistent', {})).rejects.toThrow();

		// Should still work after error
		const result = await client.request('echo', { message: 'still works' });
		expect(result).toEqual({ message: 'still works' });
	});

	it('should handle rapid sequential requests', async () => {
		const { client } = await createClient();

		for (let i = 0; i < 20; i++) {
			const result = await client.request('add', { a: i, b: i + 1 });
			expect(result).toEqual({ result: i + i + 1 });
		}
	});

	it('should handle different request types with logging', async () => {
		const { client } = await createClient();

		// Make various requests that trigger different log levels
		const result1 = await client.request('echo', { message: 'test' });
		const result2 = await client.request('add', { a: 1, b: 2 });

		expect(result1).toEqual({ message: 'test' });
		expect(result2).toEqual({ result: 3 });

		// Try invalid method (triggers console.warn and error handling)
		await expect(client.request('invalid', {})).rejects.toThrow();

		// Protocol should still work after error
		const result3 = await client.request('echo', { message: 'still works' });
		expect(result3).toEqual({ message: 'still works' });
	});

	it('should handle server startup and requests correctly', async () => {
		const { client } = await createClient();

		// Server startup involves logging - if it corrupted protocol, connection would fail
		// Make a request to verify protocol works after startup logging
		const result = await client.request('getServerInfo', {}) as any;

		expect(result).toHaveProperty('name');
		expect(result.name).toBe('test-jsonrpc-server');
		expect(result.capabilities).toEqual(['echo', 'add', 'multiply']);
	});

	it('should preserve protocol integrity under heavy logging', async () => {
		const { client } = await createClient();

		// Make many requests to generate lots of logging
		const promises = [];
		for (let i = 0; i < 50; i++) {
			promises.push(
				client.request('add', { a: i, b: i + 1 }),
				client.request('multiply', { a: i, b: 2 }),
				client.request('echo', { message: `msg${i}` })
			);
		}

		const results = await Promise.all(promises);

		// All should succeed
		expect(results.length).toBe(150);

		// Spot check some results
		expect(results[0]).toEqual({ result: 1 }); // 0 + 1
		expect(results[1]).toEqual({ result: 0 }); // 0 * 2
		expect(results[2]).toEqual({ message: 'msg0' });
	});

	it('should work with multiple independent client instances', async () => {
		// Create multiple clients
		const { client: client1 } = await createClient();
		const { client: client2 } = await createClient();
		const { client: client3 } = await createClient();

		// All should work independently
		const results = await Promise.all([
			client1.request('add', { a: 1, b: 1 }),
			client2.request('add', { a: 2, b: 2 }),
			client3.request('add', { a: 3, b: 3 }),
		]);

		expect(results[0]).toEqual({ result: 2 });
		expect(results[1]).toEqual({ result: 4 });
		expect(results[2]).toEqual({ result: 6 });
	});
});
