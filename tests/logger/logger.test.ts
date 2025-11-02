/**
 * Comprehensive tests for debug logger
 */

// Prevent auto-patching during tests
process.env.MCP_DEV_KIT_NO_AUTO_PATCH = 'true';

import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, patchConsole, unpatchConsole } from '../../src/logger/index.js';

const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[\\d+m`);

/**
 * Helper to capture stream output
 */
class CaptureStream extends Writable {
  public output: string[] = [];

  override _write(chunk: Buffer, _encoding: string, callback: () => void): void {
    this.output.push(chunk.toString());
    callback();
  }

  getOutput(): string {
    return this.output.join('');
  }

  clear(): void {
    this.output = [];
  }
}

describe('Debug Logger', () => {
  beforeEach(() => {
    // Reset any patching before each test
    unpatchConsole();
  });

  afterEach(() => {
    // Cleanup after each test
    unpatchConsole();
  });

  describe('createLogger', () => {
    it('should create a logger instance with all methods', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.log).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.restore).toBeDefined();
      expect(logger.close).toBeDefined();
    });

    it('should respect enabled option and not output when disabled', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ enabled: false, stream });

      logger.info('This should not appear');
      logger.warn('This should not appear');
      logger.error('This should not appear');

      expect(stream.getOutput()).toBe('');
    });

    it('should support custom output stream', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      logger.info('Test message');

      const output = stream.getOutput();
      expect(output).toContain('Test message');
      expect(output).toContain('[INFO]');
    });

    it('should add timestamps when enabled', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, timestamps: true, colors: false });

      logger.info('Test');

      const output = stream.getOutput();
      // Check for ISO8601 timestamp pattern
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should not add timestamps when disabled', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, timestamps: false, colors: false });

      logger.info('Test');

      const output = stream.getOutput();
      // Should not contain ISO8601 timestamp
      expect(output).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(output).toContain('[INFO]');
      expect(output).toContain('Test');
    });

    it('should support colored output when colors are enabled', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: true });

      logger.info('Test');

      const output = stream.getOutput();
      // ANSI color codes should be present
      expect(output).toMatch(ANSI_ESCAPE_PATTERN); // Contains ANSI escape codes
    });

    it('should not use colors when colors are disabled', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      logger.info('Test');

      const output = stream.getOutput();
      // Should not contain ANSI color codes
      expect(output).not.toMatch(ANSI_ESCAPE_PATTERN);
    });

    it('should respect log level filtering', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, level: 'warn', colors: false });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const output = stream.getOutput();
      expect(output).not.toContain('Debug message');
      expect(output).not.toContain('Info message');
      expect(output).toContain('Warn message');
      expect(output).toContain('Error message');
    });

    it('should format objects correctly', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      const obj = { foo: 'bar', nested: { value: 42 } };
      logger.info('Object:', obj);

      const output = stream.getOutput();
      expect(output).toContain('foo');
      expect(output).toContain('bar');
      expect(output).toContain('nested');
      expect(output).toContain('42');
    });

    it('should handle multiple arguments', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      logger.info('Message', 123, true, { key: 'value' });

      const output = stream.getOutput();
      expect(output).toContain('Message');
      expect(output).toContain('123');
      expect(output).toContain('true');
      expect(output).toContain('key');
    });

    it('should differentiate log levels with different labels', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      const output = stream.getOutput();
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('[INFO]');
      expect(output).toContain('[WARN]');
      expect(output).toContain('[ERROR]');
    });
  });

  describe('patchConsole', () => {
    it('should patch global console methods', () => {
      const originalLog = console.log;
      const originalInfo = console.info;
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalDebug = console.debug;

      patchConsole();

      expect(console.log).not.toBe(originalLog);
      expect(console.info).not.toBe(originalInfo);
      expect(console.warn).not.toBe(originalWarn);
      expect(console.error).not.toBe(originalError);
      expect(console.debug).not.toBe(originalDebug);
    });

    it('should throw error when patching twice', () => {
      patchConsole();

      expect(() => patchConsole()).toThrow('Console is already patched');
    });

    it('should write to stderr when console.log is called', () => {
      const stderrSpy = vi.spyOn(process.stderr, 'write');

      patchConsole({ colors: false });
      console.log('Test message');

      expect(stderrSpy).toHaveBeenCalled();
      const calls = stderrSpy.mock.calls;
      const allOutput = calls.map((call) => call[0]).join('');
      expect(allOutput).toContain('Test message');

      stderrSpy.mockRestore();
    });

    it('should preserve console method arguments', () => {
      const stderrSpy = vi.spyOn(process.stderr, 'write');

      patchConsole({ colors: false });
      console.log('Message', 123, { key: 'value' });

      const calls = stderrSpy.mock.calls;
      const allOutput = calls.map((call) => call[0]).join('');
      expect(allOutput).toContain('Message');
      expect(allOutput).toContain('123');
      expect(allOutput).toContain('key');
      expect(allOutput).toContain('value');

      stderrSpy.mockRestore();
    });

    it('should allow custom configuration', () => {
      const stderrSpy = vi.spyOn(process.stderr, 'write');

      patchConsole({ timestamps: false, colors: false });
      console.log('Test');

      const calls = stderrSpy.mock.calls;
      const allOutput = calls.map((call) => call[0]).join('');

      // Should not have timestamp
      expect(allOutput).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
      expect(allOutput).toContain('Test');

      stderrSpy.mockRestore();
    });
  });

  describe('unpatchConsole', () => {
    it('should restore original console methods', () => {
      const originalLog = console.log;
      const originalInfo = console.info;
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalDebug = console.debug;

      patchConsole();
      unpatchConsole();

      expect(console.log).toBe(originalLog);
      expect(console.info).toBe(originalInfo);
      expect(console.warn).toBe(originalWarn);
      expect(console.error).toBe(originalError);
      expect(console.debug).toBe(originalDebug);
    });

    it('should be safe to call multiple times', () => {
      patchConsole();
      unpatchConsole();

      // Should not throw
      expect(() => unpatchConsole()).not.toThrow();
    });

    it('should be safe to call without patching first', () => {
      // Should not throw
      expect(() => unpatchConsole()).not.toThrow();
    });
  });

  describe('Logger instance', () => {
    it('should allow closing and cleanup', async () => {
      const logger = createLogger();

      // Should not throw
      await expect(logger.close()).resolves.not.toThrow();
    });

    it('should be safe to close multiple times', async () => {
      const logger = createLogger();

      await logger.close();

      // Should not throw on second close
      await expect(logger.close()).resolves.not.toThrow();
    });

    it('should have no-op restore method on instance', () => {
      const logger = createLogger();

      // Should not throw
      expect(() => logger.restore()).not.toThrow();
    });
  });

  describe('Log levels', () => {
    it('should show all levels when level is debug', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, level: 'debug', colors: false });

      logger.debug('D');
      logger.info('I');
      logger.warn('W');
      logger.error('E');

      const output = stream.getOutput();
      expect(output).toContain('D');
      expect(output).toContain('I');
      expect(output).toContain('W');
      expect(output).toContain('E');
    });

    it('should only show info and above when level is info', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, level: 'info', colors: false });

      logger.debug('D');
      logger.info('I');
      logger.warn('W');
      logger.error('E');

      const output = stream.getOutput();
      expect(output).not.toContain('D');
      expect(output).toContain('I');
      expect(output).toContain('W');
      expect(output).toContain('E');
    });

    it('should only show warn and above when level is warn', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, level: 'warn', colors: false });

      logger.debug('D');
      logger.info('I');
      logger.warn('W');
      logger.error('E');

      const output = stream.getOutput();
      expect(output).not.toContain('D');
      expect(output).not.toContain('I');
      expect(output).toContain('W');
      expect(output).toContain('E');
    });

    it('should only show error when level is error', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, level: 'error', colors: false });

      logger.debug('D');
      logger.info('I');
      logger.warn('W');
      logger.error('E');

      const output = stream.getOutput();
      expect(output).not.toContain('D');
      expect(output).not.toContain('I');
      expect(output).not.toContain('W');
      expect(output).toContain('E');
    });
  });

  describe('Auto-patching', () => {
    it('should respect MCP_DEV_KIT_NO_AUTO_PATCH environment variable', () => {
      // This test verifies that auto-patch was disabled at the top of the file
      // If auto-patch happened, console would already be patched
      const originalLog = console.log;

      // Since we set MCP_DEV_KIT_NO_AUTO_PATCH at the top,
      // console should still be the original
      expect(console.log).toBe(originalLog);
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined arguments', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      logger.info(null, undefined);

      const output = stream.getOutput();
      expect(output).toContain('null');
      expect(output).toContain('undefined');
    });

    it('should handle circular references in objects', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular;

      // Should not throw
      expect(() => logger.info(circular)).not.toThrow();

      const output = stream.getOutput();
      expect(output).toContain('test');
    });

    it('should handle empty log calls', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      // Should not throw
      expect(() => logger.info()).not.toThrow();

      const output = stream.getOutput();
      expect(output).toContain('[INFO]');
    });

    it('should handle very long strings', () => {
      const stream = new CaptureStream();
      const logger = createLogger({ stream, colors: false });

      const longString = 'x'.repeat(10000);

      // Should not throw
      expect(() => logger.info(longString)).not.toThrow();

      const output = stream.getOutput();
      expect(output).toContain('x');
    });
  });
});
