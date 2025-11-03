#!/usr/bin/env node

/**
 * Example MCP server for demonstrating mcp-dev-kit testing
 *
 * This server implements three simple tools:
 * - echo: Returns the input message
 * - calculate: Performs basic arithmetic operations
 * - format: Formats messages with timestamps
 */

import '../../dist/logger/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * Echo tool - returns the message back
 */
function handleEcho(message) {
  if (!message) {
    throw new Error('Message is required');
  }
  return message;
}

/**
 * Calculate tool - performs arithmetic operations
 */
function handleCalculate(operation, a, b) {
  switch (operation) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero');
      }
      return a / b;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Format output - formats a message with timestamp
 */
function formatOutput(message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ${message}`;
}

/**
 * Validate input - checks if input is valid
 */
function validateInput(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string' && value.length > 0;
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'positive':
      return typeof value === 'number' && value > 0;
    default:
      return false;
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'test-suite-example-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echoes back the message',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to echo',
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'calculate',
        description: 'Performs arithmetic operations',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add', 'subtract', 'multiply', 'divide'],
              description: 'Operation to perform',
            },
            a: {
              type: 'number',
              description: 'First operand',
            },
            b: {
              type: 'number',
              description: 'Second operand',
            },
          },
          required: ['operation', 'a', 'b'],
        },
      },
      {
        name: 'format',
        description: 'Formats a message with timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to format',
            },
          },
          required: ['message'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'echo':
        result = handleEcho(args.message);
        break;

      case 'calculate':
        result = handleCalculate(args.operation, args.a, args.b);
        break;

      case 'format':
        result = formatOutput(args.message);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: String(result),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Test suite example server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
