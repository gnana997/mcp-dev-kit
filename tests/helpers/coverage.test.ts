/**
 * Unit tests for coverage helpers
 */

import { describe, it, expect, afterEach } from 'vitest';
import { shouldEnableCoverage, getCoverageEnv } from '../../src/helpers/coverage.js';

describe('Coverage Helpers', () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		// Restore original environment
		process.env = { ...originalEnv };
	});

	describe('shouldEnableCoverage', () => {
		it('should return true when NODE_V8_COVERAGE is set', () => {
			process.env.NODE_V8_COVERAGE = './coverage';
			expect(shouldEnableCoverage()).toBe(true);
		});

		it('should return true when NYC_CONFIG is set', () => {
			delete process.env.NODE_V8_COVERAGE;
			process.env.NYC_CONFIG = './nyc.config.js';
			expect(shouldEnableCoverage()).toBe(true);
		});

		it('should return true when COVERAGE is "true"', () => {
			delete process.env.NODE_V8_COVERAGE;
			delete process.env.NYC_CONFIG;
			process.env.COVERAGE = 'true';
			expect(shouldEnableCoverage()).toBe(true);
		});

		it('should return false when no coverage env vars are set', () => {
			delete process.env.NODE_V8_COVERAGE;
			delete process.env.NYC_CONFIG;
			delete process.env.COVERAGE;
			expect(shouldEnableCoverage()).toBe(false);
		});

		it('should return false when COVERAGE is not "true"', () => {
			delete process.env.NODE_V8_COVERAGE;
			delete process.env.NYC_CONFIG;
			process.env.COVERAGE = 'false';
			expect(shouldEnableCoverage()).toBe(false);
		});
	});

	describe('getCoverageEnv', () => {
		it('should return NODE_V8_COVERAGE when coverage is enabled', () => {
			process.env.NODE_V8_COVERAGE = './my-coverage';
			const env = getCoverageEnv();
			expect(env).toEqual({ NODE_V8_COVERAGE: './my-coverage' });
		});

		it('should return default path when coverage is enabled but path not set', () => {
			process.env.COVERAGE = 'true';
			delete process.env.NODE_V8_COVERAGE;
			const env = getCoverageEnv();
			expect(env).toEqual({ NODE_V8_COVERAGE: './coverage/tmp' });
		});

		it('should return empty object when coverage is disabled', () => {
			delete process.env.NODE_V8_COVERAGE;
			delete process.env.NYC_CONFIG;
			delete process.env.COVERAGE;
			const env = getCoverageEnv();
			expect(env).toEqual({});
		});

		it('should prioritize NODE_V8_COVERAGE over NYC_CONFIG', () => {
			process.env.NODE_V8_COVERAGE = './v8-coverage';
			process.env.NYC_CONFIG = './nyc.config.js';
			const env = getCoverageEnv();
			expect(env).toEqual({ NODE_V8_COVERAGE: './v8-coverage' });
		});

		it('should use default when NYC_CONFIG is set but NODE_V8_COVERAGE is not', () => {
			delete process.env.NODE_V8_COVERAGE;
			process.env.NYC_CONFIG = './nyc.config.js';
			const env = getCoverageEnv();
			expect(env).toEqual({ NODE_V8_COVERAGE: './coverage/tmp' });
		});
	});
});
