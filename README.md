# mcp-dev-kit

[![npm version](https://img.shields.io/npm/v/mcp-dev-kit.svg)](https://www.npmjs.com/package/mcp-dev-kit)
[![CI](https://github.com/gnana997/mcp-dev-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/gnana997/mcp-dev-kit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Complete testing and debugging toolkit for Model Context Protocol (MCP) servers**

Build reliable MCP servers with comprehensive testing utilities, intelligent snapshot testing, and stdio-safe debug logging.

## Why mcp-dev-kit?

Developing MCP servers comes with unique challenges:

- ❌ **Testing is hard** - No built-in test utilities for MCP servers
- ❌ **Snapshots break** - Timestamps and IDs change on every run
- ❌ **Logging breaks stdio** - `console.log()` corrupts JSON-RPC communication
- ❌ **Manual assertions** - Repetitive boilerplate for common checks

**mcp-dev-kit solves all of these:**

- ✅ **MCPTestClient** - Full-featured test client for MCP servers
- ✅ **Smart snapshots** - Auto-exclude dynamic fields (timestamps, IDs)
- ✅ **Custom matchers** - Readable assertions for tools, resources, prompts
- ✅ **Safe logging** - Debug without breaking JSON-RPC protocol

## Quick Start

### Installation

```bash
npm install --save-dev mcp-dev-kit vitest
```

### Basic Test Setup

**1. Create `vitest.setup.ts`:**

```typescript
import { installMCPMatchers } from 'mcp-dev-kit/matchers';

installMCPMatchers();
```

**2. Configure `vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

**3. Write tests (`server.test.ts`):**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from 'mcp-dev-kit/client';

describe('My MCP Server', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = new MCPTestClient({
      command: 'node',
      args: ['./my-server.js'],
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should list available tools', async () => {
    const tools = await client.listTools();
    expect(tools).toHaveLength(2);
    expect(tools[0]).toHaveToolProperty('name', 'echo');
  });

  it('should execute tools successfully', async () => {
    const result = await client.callTool('echo', { message: 'hello' });
    await expect(result).toReturnToolResult('hello');
  });

  it('should have stable response structure', async () => {
    const result = await client.callTool('list_files', { path: '/' });
    expect(result).toMatchToolResponseSnapshot();
  });
});
```

**4. Add debug logging to your server:**

```typescript
// At the top of your MCP server file
import 'mcp-dev-kit/logger';

// Now console.log works without breaking JSON-RPC!
console.log('Server started');
console.error('Connection error', error);
```

**5. Run tests:**

```bash
npx vitest
```

## Features

### MCP Test Client

Comprehensive test client for spawning and testing MCP servers via stdio.

```typescript
import { MCPTestClient } from 'mcp-dev-kit/client';

const client = new MCPTestClient({
  command: 'node',
  args: ['./my-server.js'],
  env: { DEBUG: 'true' },
  timeout: 30000,
});

await client.connect();

// Test server capabilities
const serverInfo = client.getServerInfo();
const capabilities = client.getServerCapabilities();

// List and call tools
const tools = await client.listTools();
const result = await client.callTool('my-tool', { param: 'value' });

// List and read resources
const resources = await client.listResources();
const content = await client.readResource('file://config.json');

// List and get prompts
const prompts = await client.listPrompts();
const prompt = await client.getPrompt('greeting', { name: 'Alice' });

// Helper methods for common patterns
const toolResult = await client.expectToolCallSuccess('my-tool', { input: 'test' });
const error = await client.expectToolCallError('bad-tool', {});

await client.disconnect();
```

**Key Features:**
- Automatic process lifecycle management
- Request/response matching with timeouts
- Server notification handling
- Comprehensive error handling
- TypeScript-first with full type safety

### Custom Vitest Matchers

Readable, expressive assertions for MCP-specific testing.

```typescript
import { installMCPMatchers } from 'mcp-dev-kit/matchers';

installMCPMatchers();
```

**Available Matchers:**

```typescript
// Tool assertions
await expect(client).toHaveTool('echo');
const tools = await client.listTools();
expect(tools[0]).toHaveToolProperty('description', 'Echoes back the message');
expect(tools[0]).toMatchToolSchema({
  type: 'object',
  required: ['message']
});

// Resource assertions
await expect(client).toHaveResource('config://app.json');
const resources = await client.listResources();
expect(resources[0]).toHaveProperty('uri', 'config://app.json');

// Prompt assertions
await expect(client).toHavePrompt('greeting');
const prompts = await client.listPrompts();
expect(prompts[0]).toHaveProperty('name', 'greeting');

// Tool result assertions
const result = await client.callTool('echo', { message: 'test' });
await expect(result).toReturnToolResult('test');
await expect(client.callTool('unknown', {})).toThrowToolError();
```

**Benefits:**
- Clear, self-documenting test code
- Better error messages when tests fail
- Reduces boilerplate in test files
- Type-safe with TypeScript

### Snapshot Testing

MCP-aware snapshot testing with intelligent field exclusion.

#### Why Snapshot Testing for MCP?

MCP server responses often contain dynamic data that changes on every run:
- Timestamps (`2024-11-03T10:30:00.000Z`)
- Request IDs (`abc123`)
- Execution times (`42.5ms`)
- Auto-increment IDs, file inodes, git SHAs

Regular snapshot testing would fail on every run. **mcp-dev-kit automatically excludes these fields** while capturing the stable response structure.

#### Quick Example

```typescript
import { installMCPMatchers } from 'mcp-dev-kit/matchers';

installMCPMatchers();

describe('File System Server', () => {
  it('should return consistent file listing structure', async () => {
    const result = await client.callTool('list_files', { path: '/project' });

    // Timestamps, IDs, and dynamic fields automatically excluded!
    expect(result).toMatchToolResponseSnapshot();
  });

  it('should have stable tool definitions', async () => {
    const tools = await client.listTools();

    // Captures tool schemas for regression detection
    expect(tools).toMatchToolListSnapshot();
  });

  it('should snapshot custom data structures', async () => {
    const data = {
      users: [...],
      timestamp: new Date().toISOString(), // Auto-excluded
      requestId: 'abc123',                   // Auto-excluded
    };

    expect(data).toMatchMCPSnapshot();
  });
});
```

#### Available Snapshot Matchers

**`toMatchMCPSnapshot(options?)`** - Generic snapshot matcher for any MCP data
```typescript
expect(serverResponse).toMatchMCPSnapshot();
expect(data).toMatchMCPSnapshot({ exclude: ['user.id', 'files.*.size'] });
```

**`toMatchToolResponseSnapshot(options?)`** - For tool call results
```typescript
const result = await client.callTool('query_database', { query: 'SELECT * FROM orders' });
expect(result).toMatchToolResponseSnapshot();
```

**`toMatchToolListSnapshot(options?)`** - For tool definitions
```typescript
const tools = await client.listTools();
expect(tools).toMatchToolListSnapshot();
```

**`toMatchResourceListSnapshot(options?)`** - For resource listings
```typescript
const resources = await client.listResources();
expect(resources).toMatchResourceListSnapshot();
```

**`toMatchPromptListSnapshot(options?)`** - For prompt definitions
```typescript
const prompts = await client.listPrompts();
expect(prompts).toMatchPromptListSnapshot();
```

#### Smart Defaults

These fields are **automatically excluded** from all snapshots:

- `timestamp`
- `requestId`
- `executionTime`
- `cacheKey`
- `_meta.timestamp`
- `serverInfo.startedAt`
- `serverInfo.uptime`

**Example:**
```typescript
// Original response
{
  "users": [...],
  "timestamp": "2024-11-03T10:30:00.000Z",  // ❌ Excluded
  "requestId": "abc123",                     // ❌ Excluded
  "executionTime": 42.5                      // ❌ Excluded
}

// Snapshot (only stable data)
{
  "users": [...]  // ✅ Captured
}
```

#### Custom Exclusions

Exclude additional fields using glob patterns:

```typescript
// Exclude file system-specific fields
expect(result).toMatchToolResponseSnapshot({
  exclude: ['files.*.size', 'files.*.inode', 'files.*.modified']
});

// Exclude all auto-increment IDs
expect(data).toMatchMCPSnapshot({
  exclude: ['*.id', '*.userId', 'rows.*.orderId']
});

// Exclude nested timestamps with custom names
expect(response).toMatchMCPSnapshot({
  exclude: ['data.users.*.createdAt', 'metadata.generatedAt']
});
```

**Pattern Syntax:**
- `field` - Excludes top-level field
- `nested.field` - Excludes nested field
- `array.*.field` - Excludes field from all array items
- `data.users.*.createdAt` - Excludes `createdAt` from all users in `data.users`

#### Performance

Snapshot testing with property exclusion adds negligible overhead:

| Data Size | Normalization Overhead | Notes |
|-----------|----------------------|-------|
| 10-100 items | < 50 microseconds | Typical MCP responses |
| 1000 items | < 50 microseconds | Large responses |
| 5000 items | < 50 microseconds | Extra-large responses |
| Deep nesting (10+ levels) | ~1-2 milliseconds | Rare in practice |

**Performance Characteristics:**
- **Scales well with data SIZE** - More items ≈ similar overhead
- **Degrades with NESTING DEPTH** - Deeper structures = slower
- **Production-ready** - < 1% overhead for typical MCP responses

**Note on Benchmarks:**
Our benchmarks measure JIT-optimized code after warmup. Real-world "cold start" performance may vary slightly. All measurements exclude snapshot file I/O (handled by Vitest).

**Feedback Welcome!**
I'm actively testing this feature and would love your feedback! If you experience performance issues or have suggestions, please [open an issue on GitHub](https://github.com/gnana997/mcp-dev-kit/issues).

#### Updating Snapshots

When you intentionally change your server's response format:

```bash
# Review what changed
npm test

# Update snapshots after verifying changes are correct
npm test -- -u
```

#### Best Practices

**✅ DO:**
- Snapshot server response structure to catch regressions
- Use smart defaults for common dynamic fields
- Snapshot small-to-medium datasets (10-1000 items)
- Combine snapshots with explicit assertions for critical properties
- Review snapshot diffs before accepting changes
- Split large responses into focused, smaller snapshots

**❌ DON'T:**
- Snapshot without excluding dynamic fields (timestamps, IDs, etc.)
- Create multi-megabyte snapshots (split into smaller tests instead)
- Snapshot implementation details that may change frequently
- Blindly update snapshots with `-u` flag without reviewing
- Use snapshots as a replacement for explicit assertions

**Example: Combined Approach**

```typescript
it('should return valid user list', async () => {
  const result = await client.callTool('list_users', {});
  const parsed = JSON.parse(result.content[0]?.text || '{}');

  // Explicit assertions for critical properties
  expect(parsed.users).toHaveLength(50);
  expect(parsed.users[0]).toHaveProperty('name');
  expect(parsed.users[0]).toHaveProperty('email');

  // Snapshot for structure regression detection
  expect(result).toMatchToolResponseSnapshot();
});
```

See [examples/snapshot-example/](./examples/snapshot-example/) for complete working examples with benchmarks.

### Debug Logging

Safe debug logging that doesn't break JSON-RPC stdio communication.

#### The Problem

MCP servers communicate via JSON-RPC over stdio. Every message must be a single line of JSON on stdout:

```
{"jsonrpc":"2.0","method":"tools/list","params":{...}}\n
```

If you write anything else to stdout (like `console.log()`), it corrupts the stream:

```
Server starting...  ← Breaks protocol!
{"jsonrpc":"2.0","method":"tools/list","params":{...}}\n
```

Result: `SyntaxError: Unexpected token 'S'`

#### The Solution

**mcp-dev-kit redirects all console output to stderr**, keeping stdout clean:
- **stdout** = pure JSON-RPC (protocol)
- **stderr** = all your logs (debugging)

#### Auto-Patch (Recommended)

```typescript
// At the top of your MCP server file
import 'mcp-dev-kit/logger';

// Now console.log works without breaking JSON-RPC!
console.log('Server started', { port: 3000 });
console.info('Configuration loaded');
console.warn('Deprecated feature used');
console.error('Connection failed', error);
```

**Opt-out:**
```bash
MCP_DEV_KIT_NO_AUTO_PATCH=true node server.js
```

#### Manual Logger

For more control, create a custom logger instance:

```typescript
import { createLogger } from 'mcp-dev-kit';

const logger = createLogger({
  timestamps: true,
  colors: true,
  level: 'info', // Only show info and above
  logFile: './server.log', // Optional file output
});

logger.info('Server starting...');
logger.warn('Configuration may need updating');
logger.error('Connection failed', { reason: 'timeout' });

// Cleanup when done
await logger.close();
```

#### Logger Features

- **Auto-patching** - Just import and console.log works
- **Colored output** - Color-coded log levels (auto-detects TTY)
- **Timestamps** - ISO8601 timestamps on all logs
- **Object formatting** - Pretty-print objects with `util.inspect()`
- **File logging** - Optional async file output
- **Cleanup** - Graceful restoration of original console
- **Zero overhead** - Lightweight, uses picocolors (7 KB)

#### Configuration

**Log Levels:**
```typescript
const logger = createLogger({ level: 'warn' });

logger.debug('Not shown');
logger.info('Not shown');
logger.warn('Shown');     // ✓
logger.error('Shown');    // ✓
```

**Colors:**
```typescript
createLogger({ colors: false }); // Force disable
createLogger({ colors: true });  // Force enable
// Auto-detected by default based on process.stderr.isTTY
```

**Timestamps:**
```typescript
createLogger({ timestamps: false }); // Disable
// ISO8601 format: 2024-11-03T12:34:56.789Z
```

**File Logging:**
```typescript
const logger = createLogger({
  logFile: './server.log',
});

logger.info('This goes to both stderr and server.log');

// Flush pending writes
await logger.close();
```

## Testing Guidelines

### Test Structure

Organize your tests by MCP capabilities:

```typescript
describe('My MCP Server', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = new MCPTestClient({ command: 'node', args: ['./server.js'] });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Server Initialization', () => {
    it('should expose correct server info', () => {
      const info = client.getServerInfo();
      expect(info.name).toBe('my-server');
      expect(info.version).toBe('1.0.0');
    });

    it('should declare required capabilities', () => {
      const caps = client.getServerCapabilities();
      expect(caps.tools).toBeDefined();
    });
  });

  describe('Tools', () => {
    it('should list all available tools', async () => {
      const tools = await client.listTools();
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual(['echo', 'calculate', 'search']);
    });

    it('should execute tools successfully', async () => {
      const result = await client.callTool('echo', { message: 'test' });
      expect(result.content[0]?.text).toBe('test');
    });

    it('should handle tool errors gracefully', async () => {
      const error = await client.expectToolCallError('calculate', { invalid: 'params' });
      expect(error.message).toContain('Invalid parameters');
    });

    it('should have stable tool schemas', async () => {
      const tools = await client.listTools();
      expect(tools).toMatchToolListSnapshot();
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      await expect(client).toHaveResource('config://app.json');
    });

    it('should read resource content', async () => {
      const content = await client.readResource('config://app.json');
      expect(content.contents[0]?.text).toContain('version');
    });
  });

  describe('Prompts', () => {
    it('should provide defined prompts', async () => {
      await expect(client).toHavePrompt('greeting');
    });

    it('should render prompts with arguments', async () => {
      const prompt = await client.getPrompt('greeting', { name: 'Alice' });
      expect(prompt.messages[0]?.content.text).toContain('Alice');
    });
  });
});
```

### Testing Best Practices

**✅ DO:**

1. **Test all MCP capabilities** - Tools, resources, prompts
2. **Use descriptive test names** - Clearly state what's being tested
3. **Combine matchers and snapshots** - Explicit assertions + structure validation
4. **Test error cases** - Don't just test happy paths
5. **Clean up resources** - Always disconnect client in `afterAll`
6. **Use timeouts appropriately** - Set reasonable timeouts for slow operations
7. **Test server lifecycle** - Test initialization and shutdown

**❌ DON'T:**

1. **Don't share client state** - Each test suite should have its own client
2. **Don't skip error testing** - Error handling is critical
3. **Don't test implementation details** - Test public API only
4. **Don't create flaky tests** - Avoid timing-dependent assertions
5. **Don't ignore snapshots** - Review snapshot changes carefully
6. **Don't hardcode system-specific paths** - Use relative paths or env vars

### Error Testing

Always test error conditions:

```typescript
it('should validate tool parameters', async () => {
  const error = await client.expectToolCallError('calculate', {
    // Missing required parameter
  });
  expect(error.code).toBe(-32602); // Invalid params
  expect(error.message).toContain('Required parameter');
});

it('should handle resource not found', async () => {
  await expect(
    client.readResource('nonexistent://resource')
  ).rejects.toThrow('Resource not found');
});

it('should reject unknown tools', async () => {
  await expect(
    client.callTool('unknown-tool', {})
  ).rejects.toThrow();
});
```

### Performance Testing

Test response times for critical operations:

```typescript
it('should respond quickly to tool calls', async () => {
  const start = Date.now();
  await client.callTool('quick-operation', {});
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(1000); // < 1 second
});
```

### Integration Testing

Test real-world workflows:

```typescript
it('should handle complete user workflow', async () => {
  // 1. List available tools
  const tools = await client.listTools();
  expect(tools.length).toBeGreaterThan(0);

  // 2. Get resource for context
  const config = await client.readResource('config://app.json');
  const settings = JSON.parse(config.contents[0]?.text || '{}');

  // 3. Execute tool with context
  const result = await client.callTool('process', {
    mode: settings.defaultMode,
  });
  expect(result.content[0]?.text).toBeTruthy();

  // 4. Verify result structure
  expect(result).toMatchToolResponseSnapshot();
});
```

## Examples

See [examples/](./examples/) directory for complete examples:

- **[snapshot-example/](./examples/snapshot-example/)** - Complete snapshot testing with benchmarks
- **[logger/basic-usage.ts](./examples/logger/basic-usage.ts)** - Auto-patch console
- **[logger/manual-setup.ts](./examples/logger/manual-setup.ts)** - Custom logger instance
- **[logger/file-logging.ts](./examples/logger/file-logging.ts)** - Log to file
- **[logger/mcp-server-example.ts](./examples/logger/mcp-server-example.ts)** - Real MCP server

Run examples:

```bash
npm install -g tsx
tsx examples/logger/basic-usage.ts
```

## API Reference

### MCPTestClient

```typescript
class MCPTestClient {
  constructor(options: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    timeout?: number;
  });

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Server info
  getServerInfo(): ServerInfo;
  getServerCapabilities(): ServerCapabilities;

  // Tools
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: unknown): Promise<CallToolResult>;
  expectToolCallSuccess(name: string, args: unknown): Promise<string>;
  expectToolCallError(name: string, args: unknown): Promise<Error>;

  // Resources
  listResources(): Promise<Resource[]>;
  readResource(uri: string): Promise<ReadResourceResult>;

  // Prompts
  listPrompts(): Promise<Prompt[]>;
  getPrompt(name: string, args?: unknown): Promise<GetPromptResult>;
}
```

### Logger

```typescript
interface LoggerOptions {
  enabled?: boolean;        // Enable/disable logger (default: true)
  timestamps?: boolean;     // Show timestamps (default: true)
  colors?: boolean;         // Force colors on/off (default: auto-detect)
  level?: 'debug'|'info'|'warn'|'error'; // Min level (default: 'debug')
  stream?: WritableStream;  // Custom output (default: process.stderr)
  logFile?: string;         // Optional file output
}

function createLogger(options?: LoggerOptions): DebugLogger;
function patchConsole(options?: LoggerOptions): void;
function unpatchConsole(): void;
```

### Matchers

```typescript
// Installation
function installMCPMatchers(): void;

// Tool matchers
expect(client).toHaveTool(name: string);
expect(tool).toHaveToolProperty(property: string, value?: any);
expect(tool).toMatchToolSchema(schema: object);
expect(result).toReturnToolResult(expected: any);
expect(promise).toThrowToolError();

// Resource matchers
expect(client).toHaveResource(uri: string);

// Prompt matchers
expect(client).toHavePrompt(name: string);

// Snapshot matchers
expect(data).toMatchMCPSnapshot(options?: { exclude?: string[] });
expect(result).toMatchToolResponseSnapshot(options?: { exclude?: string[] });
expect(tools).toMatchToolListSnapshot(options?: { exclude?: string[] });
expect(resources).toMatchResourceListSnapshot(options?: { exclude?: string[] });
expect(prompts).toMatchPromptListSnapshot(options?: { exclude?: string[] });
```

## Troubleshooting

### Tests hanging or timing out?

Increase the timeout:

```typescript
const client = new MCPTestClient({
  command: 'node',
  args: ['./server.js'],
  timeout: 60000, // 60 seconds
});
```

### Snapshots failing unexpectedly?

Check if you're excluding enough dynamic fields:

```typescript
expect(result).toMatchToolResponseSnapshot({
  exclude: [
    'timestamp',
    'requestId',
    'files.*.modified',
    'data.*.generatedAt',
  ]
});
```

### Logs not showing?

Check your log level:

```typescript
createLogger({ level: 'debug' }); // Show everything
```

### Colors not working?

Colors only work when stderr is a TTY. Force enable/disable:

```typescript
createLogger({ colors: true });  // Always color
createLogger({ colors: false }); // Never color
```

### Client not connecting?

Verify your server is using stdio transport and responding to initialize:

```typescript
// Server must respond to initialize request
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  return {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: { name: 'my-server', version: '1.0.0' },
  };
});
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (if using TypeScript)
- Vitest >= 1.0.0 (for testing features)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT © [gnana997](https://github.com/gnana997)

## Related Projects

- [@modelcontextprotocol/sdk](https://modelcontextprotocol.io) - Official MCP SDK
- [Model Context Protocol](https://modelcontextprotocol.io) - Protocol specification
- [node-stdio-jsonrpc](https://www.npmjs.com/package/node-stdio-jsonrpc) - JSON-RPC 2.0 over stdio

---

**Built with ❤️ for the MCP community**

Found this useful? [Star it on GitHub](https://github.com/gnana997/mcp-dev-kit) ⭐
