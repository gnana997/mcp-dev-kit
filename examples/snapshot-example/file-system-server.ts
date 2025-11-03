/**
 * Realistic File System MCP Server for Snapshot Testing Examples
 *
 * This server simulates a file system with:
 * - File listings with metadata
 * - Directory traversal
 * - File search
 * - Realistic timestamps and IDs that should be excluded from snapshots
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// File metadata interface
interface FileMetadata {
  name: string;
  path: string;
  size: number;
  modified: string; // ISO timestamp - should be excluded
  created: string; // ISO timestamp - should be excluded
  type: 'file' | 'directory';
  permissions: string;
  inode: number; // Should be excluded (changes across systems)
}

// Generate realistic file data (deterministic for consistent snapshots)
function generateFiles(count: number, basePath = '/project'): FileMetadata[] {
  const files: FileMetadata[] = [];
  // Use fixed timestamp for deterministic snapshots
  const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime();

  const fileTypes = ['ts', 'js', 'json', 'md', 'css', 'html', 'png', 'jpg'];
  const directories = ['src', 'tests', 'docs', 'public', 'assets', 'lib', 'utils'];

  for (let i = 0; i < count; i++) {
    const isDirectory = i % 10 === 0;
    const dir = directories[i % directories.length];
    const ext = fileTypes[i % fileTypes.length];
    const name = isDirectory ? `${dir}-${Math.floor(i / 10)}` : `file-${i}.${ext}`;

    files.push({
      name,
      path: `${basePath}/${dir}/${name}`,
      size: (i * 1234) % 100000, // Deterministic size based on index
      modified: new Date(baseTime - i * 3600000).toISOString(), // Each file 1 hour apart
      created: new Date(baseTime - i * 86400000).toISOString(), // Each file 1 day apart
      type: isDirectory ? 'directory' : 'file',
      permissions: isDirectory ? 'drwxr-xr-x' : '-rw-r--r--',
      inode: 1000000 + i,
    });
  }

  return files;
}

// Database query result simulation
interface QueryResult {
  query: string;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  executionTime: number; // milliseconds - should be excluded
  timestamp: string; // Should be excluded
}

function generateQueryResult(rowCount: number): QueryResult {
  const rows = [];
  const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime();

  for (let i = 0; i < rowCount; i++) {
    rows.push({
      id: 10000 + i, // Auto-increment ID - should be excluded
      customer_name: `Customer ${i}`,
      email: `customer${i}@example.com`,
      order_total: ((i * 123) % 10000) / 100, // Deterministic total
      order_date: new Date(baseTime - i * 86400000).toISOString(), // Each order 1 day apart
      status: ['pending', 'shipped', 'delivered'][i % 3],
    });
  }

  return {
    query: 'SELECT * FROM orders WHERE order_date > $1',
    rows,
    rowCount: rows.length,
    executionTime: 42.5, // Fixed execution time
    timestamp: '2024-01-01T00:00:00.000Z',
  };
}

// GitHub repository simulation
interface GitHubRepo {
  id: string;
  name: string;
  description: string;
  created_at: string; // Should be excluded
  updated_at: string; // Should be excluded
  stars: number;
  forks: number;
  files: Array<{
    path: string;
    size: number;
    sha: string; // Git SHA - should be excluded
  }>;
  commits: Array<{
    sha: string; // Should be excluded
    message: string;
    author: string;
    date: string; // Should be excluded
  }>;
}

function generateGitHubRepo(fileCount: number, commitCount: number): GitHubRepo {
  const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime();

  const files = [];
  for (let i = 0; i < fileCount; i++) {
    files.push({
      path: `src/components/Component${i}.tsx`,
      size: (i * 456) % 5000, // Deterministic size
      sha: `sha-file-${i.toString(36)}`,
    });
  }

  const commits = [];
  for (let i = 0; i < commitCount; i++) {
    commits.push({
      sha: `sha-commit-${i.toString(36)}`,
      message: `feat: add feature ${i}`,
      author: `developer${i % 5}`,
      date: new Date(baseTime - i * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return {
    id: 'R_abc123def456',
    name: 'awesome-project',
    description: 'An awesome project',
    created_at: new Date(baseTime - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: '2024-01-01T00:00:00.000Z',
    stars: 567,
    forks: 89,
    files,
    commits,
  };
}

// Create MCP server
const server = new Server(
  {
    name: 'snapshot-example-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_files',
        description: 'List files in a directory with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path',
              default: '/project',
            },
            count: {
              type: 'number',
              description: 'Number of files to generate',
              default: 100,
            },
          },
        },
      },
      {
        name: 'query_database',
        description: 'Execute database query and return results',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query',
            },
            rowCount: {
              type: 'number',
              description: 'Number of rows to return',
              default: 100,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_github_repo',
        description: 'Get GitHub repository information',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            fileCount: {
              type: 'number',
              description: 'Number of files to include',
              default: 100,
            },
            commitCount: {
              type: 'number',
              description: 'Number of commits to include',
              default: 50,
            },
          },
          required: ['owner', 'repo'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'list_files') {
    const schema = z.object({
      path: z.string().default('/project'),
      count: z.number().default(100),
    });

    const parsed = schema.parse(args);
    const files = generateFiles(parsed.count, parsed.path);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              path: parsed.path,
              files,
              totalSize: files.reduce((sum, f) => sum + f.size, 0),
              fileCount: files.length,
              timestamp: '2024-01-01T00:00:00.000Z', // Fixed timestamp for deterministic snapshots
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === 'query_database') {
    const schema = z.object({
      query: z.string(),
      rowCount: z.number().default(100),
    });

    const parsed = schema.parse(args);
    const result = generateQueryResult(parsed.rowCount);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  if (name === 'get_github_repo') {
    const schema = z.object({
      owner: z.string(),
      repo: z.string(),
      fileCount: z.number().default(100),
      commitCount: z.number().default(50),
    });

    const parsed = schema.parse(args);
    const repo = generateGitHubRepo(parsed.fileCount, parsed.commitCount);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(repo, null, 2),
        },
      ],
    };
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Snapshot Example MCP Server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
