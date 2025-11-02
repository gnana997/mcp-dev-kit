/**
 * Tests for error classes and error handling
 */

import { describe, it, expect } from 'vitest';
import {
	MCPTestError,
	ConnectionError,
	InitializationError,
	ValidationError,
	ToolNotFoundError,
	ToolCallError,
	AssertionError,
	toMCPTestError,
	MCPTestErrorCode,
} from '../src/client/errors.js';

describe('Error Classes', () => {
	describe('MCPTestError', () => {
		it('should create basic error with message and code', () => {
			const error = new MCPTestError('Test error', MCPTestErrorCode.CONNECTION_FAILED);
			expect(error.message).toBe('Test error');
			expect(error.code).toBe(MCPTestErrorCode.CONNECTION_FAILED);
			expect(error.name).toBe('MCPTestError');
		});

		it('should include context in error', () => {
			const error = new MCPTestError('Test error', MCPTestErrorCode.VALIDATION_FAILED, {
				method: 'testMethod',
				params: { foo: 'bar' },
			});
			expect(error.context.method).toBe('testMethod');
			expect(error.context.params).toEqual({ foo: 'bar' });
		});

		it('should format error with suggestion', () => {
			const error = new MCPTestError('Test error', MCPTestErrorCode.VALIDATION_FAILED, {
				suggestion: 'Try this instead',
			});
			expect(error.context.suggestion).toBe('Try this instead');
		});
	});

	describe('ConnectionError', () => {
		it('should create connection error with default message', () => {
			const error = new ConnectionError('Failed to connect');
			expect(error.message).toBe('Failed to connect');
			expect(error.code).toBe(MCPTestErrorCode.CONNECTION_FAILED);
			expect(error.name).toBe('ConnectionError');
		});

		it('should include connection context', () => {
			const error = new ConnectionError('Connection timeout', {
				command: 'node',
				args: ['server.js'],
			});
			expect(error.context.command).toBe('node');
			expect(error.context.args).toEqual(['server.js']);
		});
	});

	describe('InitializationError', () => {
		it('should create initialization error', () => {
			const error = new InitializationError('Init failed');
			expect(error.message).toBe('Init failed');
			expect(error.code).toBe(MCPTestErrorCode.INITIALIZATION_FAILED);
			expect(error.name).toBe('InitializationError');
		});

		it('should include original error in context', () => {
			const error = new InitializationError('Init failed', {
				originalError: 'Timeout',
			});
			expect(error.context.originalError).toBe('Timeout');
		});
	});

	describe('ValidationError', () => {
		it('should create validation error', () => {
			const error = new ValidationError('Invalid data', {});
			expect(error.message).toContain('Invalid data');
			expect(error.code).toBe(MCPTestErrorCode.VALIDATION_FAILED);
			expect(error.name).toBe('ValidationError');
		});

		it('should include validation details', () => {
			const error = new ValidationError('Schema mismatch', {
				expected: 'string',
				actual: 'number',
			});
			expect(error.context.expected).toBe('string');
			expect(error.context.actual).toBe('number');
		});
	});

	describe('ToolNotFoundError', () => {
		it('should create tool not found error with available tools', () => {
			const error = new ToolNotFoundError('missing', ['echo', 'add']);
			expect(error.message).toContain('missing');
			expect(error.message).toContain('echo, add');
			expect(error.code).toBe(MCPTestErrorCode.TOOL_NOT_FOUND);
			expect(error.name).toBe('ToolNotFoundError');
		});

		it('should handle empty available tools list', () => {
			const error = new ToolNotFoundError('test', []);
			expect(error.message).toContain('none');
		});

		it('should include tool context', () => {
			const error = new ToolNotFoundError('test', ['echo']);
			expect(error.context.toolName).toBe('test');
			expect(error.context.availableTools).toEqual(['echo']);
		});
	});

	describe('ToolCallError', () => {
		it('should create tool call error', () => {
			const error = new ToolCallError('echo', 'Call failed');
			expect(error.message).toContain('echo');
			expect(error.message).toContain('Call failed');
			expect(error.code).toBe(MCPTestErrorCode.TOOL_CALL_FAILED);
			expect(error.name).toBe('ToolCallError');
		});

		it('should include tool call context', () => {
			const error = new ToolCallError('echo', 'Invalid params', {
				params: { message: 'test' },
			});
			expect(error.context.toolName).toBe('echo');
			expect(error.context.params).toEqual({ message: 'test' });
		});
	});

	describe('AssertionError', () => {
		it('should create assertion error', () => {
			const error = new AssertionError('Expected true, got false');
			expect(error.message).toContain('Expected true, got false');
			expect(error.code).toBe(MCPTestErrorCode.ASSERTION_FAILED);
			expect(error.name).toBe('AssertionError');
		});

		it('should include assertion context', () => {
			const error = new AssertionError('Mismatch', {
				expected: 'foo',
				actual: 'bar',
			});
			expect(error.context.expected).toBe('foo');
			expect(error.context.actual).toBe('bar');
		});
	});

	describe('toMCPTestError', () => {
		it('should return MCPTestError as-is', () => {
			const original = new ConnectionError('Test');
			const converted = toMCPTestError(original);
			expect(converted).toBe(original);
		});

		it('should convert Error to MCPTestError', () => {
			const original = new Error('Generic error');
			const converted = toMCPTestError(original);
			expect(converted).toBeInstanceOf(MCPTestError);
			expect(converted.message).toBe('Generic error');
			expect(converted.context.originalError).toBe('Error');
		});

		it('should convert string to MCPTestError with default message', () => {
			const converted = toMCPTestError('String error');
			expect(converted).toBeInstanceOf(MCPTestError);
			expect(converted.message).toBe('Unknown error'); // Uses default message
			expect(converted.context.originalError).toBe('String error');
		});

		it('should use custom default message', () => {
			const converted = toMCPTestError({ weird: 'object' }, 'Custom default');
			expect(converted.message).toBe('Custom default');
		});

		it('should handle unknown error types', () => {
			const converted = toMCPTestError({ weird: 'object' });
			expect(converted).toBeInstanceOf(MCPTestError);
		});
	});
});
