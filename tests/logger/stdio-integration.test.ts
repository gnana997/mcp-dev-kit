/**
 * Integration tests with real MCP server
 * Verifies logger doesn't corrupt JSON-RPC stdio communication
 *
 * This test harness spawns the MCP server process manually with full control
 * over stdin/stdout/stderr to verify:
 * 1. stdout contains ONLY valid JSON-RPC messages (no corruption)
 * 2. stderr contains all formatted log output
 * 3. The server handles requests correctly while logging
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import type { ChildProcess } from 'node:child_process';

/**
 * Custom test harness for MCP server with stdio control
 */
class MCPServerTestHarness extends EventEmitter {
	private process: ChildProcess;
	private stdoutBuffer = '';
	private stderrBuffer = '';
	private stderrLines: string[] = [];
	private stdoutLines: string[] = [];
	private requestId = 1;

	constructor(serverPath: string) {
		super();

		this.process = spawn('node', [serverPath], {
			stdio: ['pipe', 'pipe', 'pipe'],
			env: { ...process.env, NODE_ENV: 'test' },
		});

		// Capture stdout (should be JSON-RPC only)
		this.process.stdout?.on('data', (chunk: Buffer) => {
			this.stdoutBuffer += chunk.toString();
			const lines = this.stdoutBuffer.split('\n');
			this.stdoutBuffer = lines.pop() || '';

			for (const line of lines) {
				if (line.trim()) {
					this.stdoutLines.push(line);
					this.emit('stdout-line', line);
				}
			}
		});

		// Capture stderr (should be formatted logs)
		this.process.stderr?.on('data', (chunk: Buffer) => {
			this.stderrBuffer += chunk.toString();
			const lines = this.stderrBuffer.split('\n');
			this.stderrBuffer = lines.pop() || '';

			for (const line of lines) {
				if (line.trim()) {
					this.stderrLines.push(line);
					this.emit('stderr-line', line);
				}
			}
		});

		this.process.on('error', (error) => {
			this.emit('error', error);
		});
	}

	/**
	 * Send JSON-RPC request and wait for response
	 */
	async request(method: string, params?: unknown): Promise<unknown> {
		const id = this.requestId++;
		const request = {
			jsonrpc: '2.0',
			id,
			method,
			params: params || {},
		};

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.off('stdout-line', handler);
				reject(new Error(`Request timeout for ${method}`));
			}, 5000);

			const handler = (line: string) => {
				try {
					const response = JSON.parse(line);
					if (response.id === id) {
						clearTimeout(timeout);
						this.off('stdout-line', handler);

						if (response.error) {
							reject(new Error(`JSON-RPC Error: ${response.error.message}`));
						} else {
							resolve(response.result);
						}
					}
				} catch (err) {
					// This is critical - if we can't parse JSON, stdout is corrupted!
					clearTimeout(timeout);
					this.off('stdout-line', handler);
					reject(new Error(`STDOUT CORRUPTION: Invalid JSON on stdout: ${line}`));
				}
			};

			this.on('stdout-line', handler);

			// Send request
			this.process.stdin?.write(`${JSON.stringify(request)}\n`);
		});
	}

	/**
	 * Get all stdout lines (should be valid JSON-RPC only)
	 */
	getStdoutLines(): string[] {
		return [...this.stdoutLines];
	}

	/**
	 * Get all stderr lines (formatted log output)
	 */
	getStderrLines(): string[] {
		return [...this.stderrLines];
	}

	/**
	 * Get stderr output as string
	 */
	getStderrOutput(): string {
		return this.stderrLines.join('\n');
	}

	/**
	 * Wait for server to be ready
	 */
	async waitForReady(): Promise<void> {
		return new Promise((resolve) => {
			const handler = (line: string) => {
				if (line.includes('Test MCP server ready')) {
					this.off('stderr-line', handler);
					resolve();
				}
			};

			this.on('stderr-line', handler);

			// Timeout after 5 seconds
			setTimeout(() => {
				this.off('stderr-line', handler);
				resolve(); // Continue anyway
			}, 5000);
		});
	}

	/**
	 * Close the server
	 */
	async close(): Promise<void> {
		return new Promise((resolve) => {
			this.process.on('exit', () => resolve());
			this.process.kill();

			// Force kill after 1 second
			setTimeout(() => {
				this.process.kill('SIGKILL');
				resolve();
			}, 1000);
		});
	}
}

// Track active harnesses for cleanup
const activeHarnesses: MCPServerTestHarness[] = [];

function createTestHarness(): MCPServerTestHarness {
	const serverPath = join(
		fileURLToPath(new URL('..', import.meta.url)),
		'fixtures',
		'test-mcp-server.js'
	);
	const harness = new MCPServerTestHarness(serverPath);
	activeHarnesses.push(harness);
	return harness;
}

describe('MCP Integration - Stdio Verification', () => {
	afterEach(async () => {
		// Cleanup all harnesses
		await Promise.all(activeHarnesses.map((h) => h.close()));
		activeHarnesses.length = 0;
	});

	it('should only output valid JSON-RPC on stdout', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		// Send request
		await harness.request('tools/list');

		// Verify ALL stdout lines are valid JSON-RPC
		const stdoutLines = harness.getStdoutLines();

		expect(stdoutLines.length).toBeGreaterThan(0);

		for (const line of stdoutLines) {
			// Should parse as valid JSON
			const parsed = JSON.parse(line);

			// Should be JSON-RPC 2.0
			expect(parsed.jsonrpc).toBe('2.0');

			// Should have either result or error
			expect(parsed.result !== undefined || parsed.error !== undefined).toBe(true);
		}
	});

	it('should write all console.log output to stderr', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		// Clear stderr from startup
		const initialStderr = harness.getStderrOutput();

		// Send request that triggers logging
		await harness.request('tools/list');

		// Wait a bit for logs to arrive
		await new Promise((resolve) => setTimeout(resolve, 100));

		const stderr = harness.getStderrOutput();

		// Should have new stderr output
		expect(stderr.length).toBeGreaterThan(initialStderr.length);

		// Should contain log level markers
		expect(stderr).toContain('[INFO]');

		// Should contain the actual log messages from handler
		expect(stderr).toMatch(/Handling tools\/list request|Server has 2 tools/);
	});

	it('should format stderr with timestamps', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		await harness.request('tools/list');
		await new Promise((resolve) => setTimeout(resolve, 100));

		const stderr = harness.getStderrOutput();

		// Should have ISO8601 timestamps
		expect(stderr).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
	});

	it('should handle multiple concurrent requests without stdio corruption', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		// Send multiple concurrent requests
		const results = await Promise.all([
			harness.request('tools/list'),
			harness.request('tools/list'),
			harness.request('tools/list'),
		]);

		// All should succeed
		for (const result of results) {
			expect(result).toHaveProperty('tools');
			expect(Array.isArray((result as any).tools)).toBe(true);
		}

		// Verify stdout is still clean
		const stdoutLines = harness.getStdoutLines();
		for (const line of stdoutLines) {
			// Should all be valid JSON
			expect(() => JSON.parse(line)).not.toThrow();
		}
	});

	it('should handle tool calls with parameters and logging', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		const result = await harness.request('tools/call', {
			name: 'echo',
			arguments: { message: 'Hello, MCP!' },
		});

		expect(result).toHaveProperty('content');
		expect(Array.isArray((result as any).content)).toBe(true);
		expect((result as any).content[0].type).toBe('text');
		expect((result as any).content[0].text).toBe('Hello, MCP!');

		// Verify stderr has the logging
		await new Promise((resolve) => setTimeout(resolve, 100));
		const stderr = harness.getStderrOutput();

		expect(stderr).toContain('[INFO]');
		expect(stderr).toMatch(/Calling tool: echo|Echoing message/);
	});

	it('should handle complex logging with objects and arrays', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		// This triggers logging with objects
		await harness.request('tools/call', {
			name: 'add',
			arguments: { a: 5, b: 3 },
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		const stderr = harness.getStderrOutput();

		// Should have debug logs with arguments object
		expect(stderr).toContain('[DEBUG]');
		expect(stderr).toMatch(/Tool arguments|{ a: 5, b: 3 }/);

		// Should have info log with calculation
		expect(stderr).toMatch(/Adding 5 \+ 3 = 8/);
	});

	it('should never leak ANSI color codes to stdout', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		await harness.request('tools/list');

		const stdoutLines = harness.getStdoutLines();

		for (const line of stdoutLines) {
			// Should NOT contain ANSI escape codes
			expect(line).not.toMatch(/\x1b\[\d+m/);
		}
	});

	it('should show different log levels with different markers', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		// Call tool that triggers multiple log levels
		await harness.request('tools/call', {
			name: 'echo',
			arguments: { message: 'test' },
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		const stderr = harness.getStderrOutput();

		// Should have INFO level
		expect(stderr).toContain('[INFO]');

		// Should have DEBUG level
		expect(stderr).toContain('[DEBUG]');
	});

	it('should handle server startup logs correctly', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		const stderr = harness.getStderrOutput();

		// Should have startup messages
		expect(stderr).toContain('Test MCP server starting');
		expect(stderr).toContain('Test MCP server ready');

		// Should have timestamps on startup logs
		expect(stderr).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

		// Stdout should NOT have any of this
		const stdoutLines = harness.getStdoutLines();
		const stdout = stdoutLines.join('\n');

		expect(stdout).not.toContain('Test MCP server starting');
		expect(stdout).not.toContain('Test MCP server ready');
	});

	it('should preserve JSON-RPC protocol integrity under heavy logging', async () => {
		const harness = createTestHarness();
		await harness.waitForReady();

		// Make many requests to generate lots of logging
		const promises = [];
		for (let i = 0; i < 10; i++) {
			promises.push(
				harness.request('tools/call', {
					name: 'add',
					arguments: { a: i, b: i + 1 },
				})
			);
		}

		const results = await Promise.all(promises);

		// All should succeed
		expect(results.length).toBe(10);

		// Verify every stdout line is still valid JSON-RPC
		const stdoutLines = harness.getStdoutLines();

		for (const line of stdoutLines) {
			const parsed = JSON.parse(line); // Should not throw
			expect(parsed.jsonrpc).toBe('2.0');
		}

		// Should have lots of stderr output
		const stderrLines = harness.getStderrLines();
		expect(stderrLines.length).toBeGreaterThan(20); // Lots of logging happened
	});
});
