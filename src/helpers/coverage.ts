/**
 * Coverage helpers for automatic child process coverage collection
 *
 * When users test their MCP servers with MCPTestClient, the server runs
 * in a child process. This module automatically propagates coverage
 * environment variables so users get full coverage reports.
 */

/**
 * Check if coverage is enabled in the parent process
 *
 * @returns true if any coverage environment variable is detected
 */
export function shouldEnableCoverage(): boolean {
	return !!(
		process.env.NODE_V8_COVERAGE || // V8 coverage (Vitest default)
		process.env.NYC_CONFIG || // NYC/Istanbul
		process.env.COVERAGE === 'true' // Custom flag
	);
}

/**
 * Get coverage environment variables to propagate to child process
 *
 * @returns Environment variables object to merge with child process env
 *
 * @example
 * ```typescript
 * const env = {
 *   ...getCoverageEnv(),
 *   ...userEnv,
 * };
 * ```
 */
export function getCoverageEnv(): Record<string, string> {
	if (!shouldEnableCoverage()) {
		return {};
	}

	return {
		// Propagate V8 coverage path, or use default
		NODE_V8_COVERAGE: process.env.NODE_V8_COVERAGE || './coverage/tmp',
	};
}
