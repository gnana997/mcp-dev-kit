/**
 * MCP Server integration example
 *
 * Shows how to use the logger in a real MCP server.
 */

// IMPORTANT: Import logger FIRST to auto-patch console
import 'mcp-dev-kit/logger';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Now console.log is safe to use in your MCP server!
console.log('MCP Server initializing...');

const server = new Server(
  {
    name: 'example-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Debug logging works without breaking stdio
console.log('Registering handlers...');

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log('Client requested tools list');

  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo back a message',
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.log('Tool called:', request.params.name);
  console.log('Arguments:', request.params.arguments);

  if (request.params.name === 'echo') {
    const message = String(request.params.arguments?.message || '');
    return {
      content: [
        {
          type: 'text',
          text: `Echo: ${message}`,
        },
      ],
    };
  }

  throw new Error('Unknown tool');
});

// Start the server
async function main() {
  console.log('Starting MCP server on stdio...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log('Server connected and ready!');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
