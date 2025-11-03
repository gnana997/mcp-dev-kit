#!/usr/bin/env node

/**
 * Test MCP server for integration testing
 * This server uses the logger and verifies it doesn't corrupt stdio
 */

// CRITICAL: Import logger FIRST to auto-patch console
import '../../dist/logger/index.js';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server(
  {
    name: 'test-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
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

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.log('Handling resources/list request');
  console.info('Server has 2 resources available');

  return {
    resources: [
      {
        uri: 'config://app.json',
        name: 'Application Config',
        description: 'Application configuration file',
        mimeType: 'application/json',
      },
      {
        uri: 'file://readme.md',
        name: 'README',
        description: 'Project documentation',
        mimeType: 'text/markdown',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  console.log(`Reading resource: ${uri}`);

  if (uri === 'config://app.json') {
    return {
      contents: [
        {
          uri: 'config://app.json',
          mimeType: 'application/json',
          text: JSON.stringify({ name: 'test-app', version: '1.0.0', debug: true }),
        },
      ],
    };
  }

  if (uri === 'file://readme.md') {
    return {
      contents: [
        {
          uri: 'file://readme.md',
          mimeType: 'text/markdown',
          text: '# Test Project\n\nThis is a test MCP server.',
        },
      ],
    };
  }

  throw new Error(`Resource not found: ${uri}`);
});

// Register prompt handlers
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  console.log('Handling prompts/list request');
  console.info('Server has 2 prompts available');

  return {
    prompts: [
      {
        name: 'greeting',
        description: 'A friendly greeting prompt',
      },
      {
        name: 'code-review',
        description: 'Code review prompt with file argument',
        arguments: [
          {
            name: 'file',
            description: 'File to review',
            required: true,
          },
          {
            name: 'language',
            description: 'Programming language',
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  console.log(`Getting prompt: ${name}`);
  console.debug('Prompt arguments:', args);

  if (name === 'greeting') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Hello! How can I help you today?',
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: 'I am ready to assist you with any questions or tasks you have.',
          },
        },
      ],
    };
  }

  if (name === 'code-review') {
    const file = args.file || 'unknown.js';
    const language = args.language || 'javascript';

    return {
      description: `Code review for ${file}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review this ${language} file: ${file}`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
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
