#!/usr/bin/env node

/**
 * Test MCP server for integration testing
 * This server uses the logger and verifies it doesn't corrupt stdio
 */

// CRITICAL: Import logger FIRST to auto-patch console
import '../../dist/logger/index.js';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server(
  {
    name: 'test-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register handlers with console.log statements to verify logger works
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // This console.log should go to stderr, not corrupt stdout
  console.log('Handling tools/list request');
  console.info('Server has 2 tools available');

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
        name: 'add',
        description: 'Adds two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.log(`Calling tool: ${name}`);
  console.debug('Tool arguments:', args);

  switch (name) {
    case 'echo': {
      console.info(`Echoing message: ${args.message}`);
      return {
        content: [
          {
            type: 'text',
            text: args.message,
          },
        ],
      };
    }

    case 'add': {
      const result = args.a + args.b;
      console.info(`Adding ${args.a} + ${args.b} = ${result}`);
      return {
        content: [
          {
            type: 'text',
            text: String(result),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Handle errors
server.onerror = (error) => {
  console.error('Server error:', error);
};

// Connect stdio transport
const transport = new StdioServerTransport();

async function main() {
  console.log('Test MCP server starting...');
  console.info('Server capabilities:', server.getCapabilities());

  await server.connect(transport);

  console.log('Test MCP server ready');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
