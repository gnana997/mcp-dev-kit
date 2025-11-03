/**
 * Vitest setup file for test-suite-example
 * This file is automatically loaded before tests run
 */

import { installMCPMatchers } from './src/matchers/index.js';

// Install custom MCP matchers globally for all tests
installMCPMatchers();
