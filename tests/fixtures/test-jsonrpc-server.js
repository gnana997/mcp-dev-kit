#!/usr/bin/env node

/**
 * Simple JSON-RPC 2.0 server for testing (not MCP-specific)
 * Uses the logger to verify it works with pure JSON-RPC implementations
 */

// CRITICAL: Import logger FIRST to auto-patch console
import '../../dist/logger/index.js';

import { createInterface } from 'node:readline';

console.log('JSON-RPC server starting...');

// Create readline interface for line-delimited JSON-RPC
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Simple method handlers
const handlers = {
  echo: (params) => {
    console.log('Handling echo request');
    console.debug('Echo params:', params);
    return { message: params.message };
  },

  add: (params) => {
    console.log(`Adding ${params.a} + ${params.b}`);
    const result = params.a + params.b;
    console.info(`Result: ${result}`);
    return { result };
  },

  multiply: (params) => {
    console.log(`Multiplying ${params.a} * ${params.b}`);
    const result = params.a * params.b;
    return { result };
  },

  getServerInfo: () => {
    console.log('Getting server info');
    return {
      name: 'test-jsonrpc-server',
      version: '1.0.0',
      capabilities: ['echo', 'add', 'multiply'],
    };
  },

  complexObject: (params) => {
    console.log('Handling complex object');
    console.debug('Received complex params:', params);
    return {
      nested: {
        array: [1, 2, 3],
        object: { key: 'value' },
        original: params,
      },
    };
  },
};

// Handle incoming JSON-RPC requests
rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);

    console.debug(`Received request: ${request.method} (id: ${request.id})`);

    // Handle request
    if (request.method && handlers[request.method]) {
      const result = handlers[request.method](request.params || {});

      // Send response
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };

      // CRITICAL: Write to stdout (should be pristine JSON-RPC)
      process.stdout.write(`${JSON.stringify(response)}\n`);

      console.log(`Response sent for ${request.method}`);
    } else {
      // Method not found
      console.warn(`Method not found: ${request.method}`);

      const response = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      };

      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  } catch (error) {
    console.error('Error handling request:', error);

    // Invalid request
    const response = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    };

    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
});

rl.on('close', () => {
  console.log('JSON-RPC server shutting down');
  process.exit(0);
});

console.log('JSON-RPC server ready');
