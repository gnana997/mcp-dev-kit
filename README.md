# mcp-dev-kit

[![npm version](https://img.shields.io/npm/v/mcp-dev-kit.svg)](https://www.npmjs.com/package/mcp-dev-kit)
[![CI](https://github.com/gnana997/mcp-dev-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/gnana997/mcp-dev-kit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Debug logger for MCP (Model Context Protocol) servers - write `console.log()` without breaking stdio**

## Why mcp-dev-kit?

The biggest pain point when developing MCP servers:
- ❌ `console.log()` breaks stdio communication
- ❌ Can't debug your MCP server normally
- ❌ JSON-RPC messages get corrupted by stdout writes
- ❌ Server crashes with cryptic `SyntaxError: Unexpected token` errors

**mcp-dev-kit solves this by redirecting all console output to stderr.**

## Features

✨ **Auto-patching** - Just import and console.log works
🎨 **Colored output** - Color-coded log levels (auto-detects TTY)
⏱️ **Timestamps** - ISO8601 timestamps on all logs
📝 **Object formatting** - Pretty-print objects with `util.inspect()`
📁 **File logging** - Optional async file output
🧹 **Cleanup** - Graceful restoration of original console
⚡ **Zero overhead** - Lightweight, uses picocolors (7 KB)

## Quick Start

### Installation

```bash
npm install mcp-dev-kit --save-dev
```

### Option 1: Auto-Patch (Recommended)

```typescript
// At the top of your MCP server file
import 'mcp-dev-kit/logger';

// Now console.log works without breaking JSON-RPC!
console.log('Server started', { port: 3000 });
console.info('Configuration loaded');
console.warn('Deprecated feature used');
console.error('Connection failed', error);
```

### Option 2: Manual Logger

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

## How It Works

MCP servers communicate via JSON-RPC over stdio. Every message must be a single line of JSON on stdout:

```
{"jsonrpc":"2.0","method":"tools/list","params":{...}}\n
```

If you write anything else to stdout (like `console.log()`), it corrupts the stream:

```
Server starting...
{"jsonrpc":"2.0","method":"tools/list","params":{...}}\n
```

Result: `SyntaxError: Unexpected token 'S'` ❌

**mcp-dev-kit fixes this** by redirecting all console methods to stderr:
- ✅ stdout = pure JSON-RPC (protocol)
- ✅ stderr = all your logs (debugging)

## API Reference

### `import 'mcp-dev-kit/logger'`

Auto-patches console on import. All console methods redirect to stderr with formatting.

**Opt-out:**
```bash
MCP_DEV_KIT_NO_AUTO_PATCH=true node server.js
```

### `createLogger(options?)`

Creates a logger instance with custom configuration.

```typescript
interface LoggerOptions {
  enabled?: boolean;        // Enable/disable logger (default: true)
  timestamps?: boolean;     // Show timestamps (default: true)
  colors?: boolean;         // Force colors on/off (default: auto-detect)
  level?: 'debug'|'info'|'warn'|'error'; // Min level (default: 'debug')
  stream?: WritableStream;  // Custom output (default: process.stderr)
  logFile?: string;         // Optional file output
}
```

**Returns:** `DebugLogger`
- Methods: `debug()`, `info()`, `log()`, `warn()`, `error()`
- Cleanup: `restore()`, `close()`

### `patchConsole(options?)`

Manually patch global console methods.

```typescript
import { patchConsole } from 'mcp-dev-kit';

patchConsole({ timestamps: false, colors: false });

console.log('This goes to stderr');
```

### `unpatchConsole()`

Restore original console methods.

```typescript
import { unpatchConsole } from 'mcp-dev-kit';

unpatchConsole();

console.log('Back to normal stdout');
```

## Configuration

### Log Levels

Levels in order of severity:
1. `debug` - Detailed debugging information
2. `info` - General informational messages
3. `warn` - Warning messages
4. `error` - Error messages

Set minimum level to filter output:

```typescript
const logger = createLogger({ level: 'warn' });

logger.debug('Not shown');
logger.info('Not shown');
logger.warn('Shown');     // ✓
logger.error('Shown');    // ✓
```

### Colors

Colors are auto-detected based on `process.stderr.isTTY`:
- **TTY (terminal)**: Colors enabled
- **Pipe (file/redirect)**: Colors disabled

Override with `colors` option:

```typescript
createLogger({ colors: false }); // Force disable
createLogger({ colors: true });  // Force enable
```

Color scheme:
- 🔵 `[INFO]` - Cyan
- 🟡 `[WARN]` - Yellow
- 🔴 `[ERROR]` - Red
- ⚫ `[DEBUG]` - Gray

### Timestamps

ISO8601 format: `2024-11-02T12:34:56.789Z`

```typescript
createLogger({ timestamps: false }); // Disable
```

### File Logging

Optional async file output (non-blocking, batched writes):

```typescript
const logger = createLogger({
  logFile: './server.log',
});

logger.info('This goes to both stderr and server.log');

// Make sure to close to flush pending writes
await logger.close();
```

## Testing MCP Servers

### MCPTestClient

`mcp-dev-kit` includes a powerful test client for writing tests for your MCP servers:

```typescript
import { MCPTestClient } from 'mcp-dev-kit/client';
import { describe, it, expect } from 'vitest';

describe('My MCP Server', () => {
  const client = new MCPTestClient({
    command: 'node',
    args: ['./my-server.js'],
  });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should list available tools', async () => {
    const tools = await client.listTools();
    expect(tools).toHaveLength(2);
    expect(tools.map(t => t.name)).toEqual(['echo', 'calculate']);
  });

  it('should call tools successfully', async () => {
    const result = await client.callTool('echo', { message: 'hello' });
    expect(result.content[0]?.text).toBe('hello');
  });
});
```

### Custom Vitest Matchers

Make your tests more readable with MCP-specific matchers:

```typescript
import { installMCPMatchers } from 'mcp-dev-kit/matchers';
import { expect } from 'vitest';

// Install matchers once (e.g., in vitest.setup.ts)
installMCPMatchers();

describe('My MCP Server', () => {
  // Check if server has specific tools
  await expect(client).toHaveTool('echo');
  await expect(client).toHaveResource('config://app.json');
  await expect(client).toHavePrompt('greeting');

  // Test tool results
  await expect(client.callTool('echo', { message: 'test' }))
    .toReturnToolResult('test');

  // Expect errors
  await expect(client.callTool('unknown', {}))
    .toThrowToolError();

  // Check tool properties
  const tools = await client.listTools();
  const echoTool = tools[0];
  expect(echoTool).toHaveToolProperty('description', 'Echoes back the message');
  expect(echoTool).toMatchToolSchema({ type: 'object', required: ['message'] });
});
```

**Available Matchers:**
- `toHaveTool(name)` - Assert server has a tool
- `toHaveResource(uri)` - Assert server has a resource
- `toHavePrompt(name)` - Assert server has a prompt
- `toReturnToolResult(expected)` - Assert tool returns specific result
- `toThrowToolError()` - Assert tool call throws error
- `toHaveToolProperty(property, value?)` - Assert tool has property
- `toMatchToolSchema(schema)` - Assert tool input schema matches

## Examples

See [examples/](./examples/) directory for complete examples:

- **[basic-usage.ts](./examples/logger/basic-usage.ts)** - Auto-patch console
- **[manual-setup.ts](./examples/logger/manual-setup.ts)** - Custom logger instance
- **[file-logging.ts](./examples/logger/file-logging.ts)** - Log to file
- **[mcp-server-example.ts](./examples/logger/mcp-server-example.ts)** - Real MCP server

Run examples:

```bash
npm install -g tsx
tsx examples/logger/basic-usage.ts
```

## Troubleshooting

### Logs not showing?

Check your log level:

```typescript
createLogger({ level: 'debug' }); // Show everything
```

### Colors not working?

Colors only work when stderr is a TTY (terminal). They're automatically disabled when piping:

```bash
node server.js | tee output.log  # No colors (piped)
node server.js                   # Colors (TTY)
```

Force enable/disable:

```typescript
createLogger({ colors: true });  // Always color
createLogger({ colors: false }); // Never color
```

### Double-patch error?

```
Error: Console is already patched. Call unpatchConsole() first.
```

You're calling `patchConsole()` twice. Either:
1. Remove duplicate imports of `'mcp-dev-kit/logger'`
2. Call `unpatchConsole()` before patching again
3. Set `MCP_DEV_KIT_NO_AUTO_PATCH=true` to disable auto-patch

### File logging not working?

Make sure to call `close()` to flush pending writes:

```typescript
const logger = createLogger({ logFile: './server.log' });
logger.info('Message');

// Important: flush before exit
await logger.close();
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (if using TypeScript)

## Performance

- **Minimal overhead**: Uses lightweight picocolors (7 KB)
- **Async file writes**: Non-blocking, batched I/O
- **Lazy evaluation**: Log formatting only when needed
- **Auto-detection**: Colors only when TTY (no wasted formatting)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT © [gnana997](https://github.com/gnana997)

## Related

- [node-stdio-jsonrpc](https://www.npmjs.com/package/node-stdio-jsonrpc) - JSON-RPC 2.0 over stdio
- [@modelcontextprotocol/sdk](https://modelcontextprotocol.io) - Official MCP SDK
- [Model Context Protocol](https://modelcontextprotocol.io) - Protocol specification
