# mcp-dev-kit

[![npm version](https://img.shields.io/npm/v/mcp-dev-kit.svg)](https://www.npmjs.com/package/mcp-dev-kit)
[![CI](https://github.com/gnana997/mcp-dev-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/gnana997/mcp-dev-kit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Complete testing & debugging toolkit for MCP (Model Context Protocol) servers**

## Why mcp-dev-kit?

Developing MCP servers is hard because:
- ❌ `console.log()` breaks stdio communication
- ❌ Manual testing with MCP Inspector is slow
- ❌ No automated unit testing solution
- ❌ Rebuilding servers kills your flow

**mcp-dev-kit solves all of these problems.**

## Features

✨ **Smart Debug Logger** - Use `console.log()` without breaking JSON-RPC
🧪 **Test Client** - Write unit tests for MCP servers
🔥 **Hot Reload** - Auto-restart server on file changes
✅ **Test Matchers** - Custom assertions for MCP responses

## Quick Start

```bash
npm install mcp-dev-kit
```

### Debug Logging (Solves the console.log problem)

```typescript
import 'mcp-dev-kit/logger';

// Now this works without corrupting JSON-RPC!
console.log('Server started', { port: 3000 });
```

### Unit Testing

```typescript
import { MCPTestClient } from 'mcp-dev-kit';

const client = new MCPTestClient({
  command: 'node',
  args: ['./build/server.js']
});

await client.connect();

const result = await client.callTool('calculate', {
  operation: 'add',
  a: 5,
  b: 3
});

expect(result.content[0].text).toBe('8');
```

### Hot Reload Development

```bash
npx mcp-dev-kit dev ./src/server.ts

# Server auto-restarts on file changes
```

## Installation

```bash
npm install mcp-dev-kit --save-dev
```

## Documentation

- [Quick Start Guide](./docs/quick-start.md)
- [API Reference](./docs/api.md)
- [Examples](./examples/)

## Requirements

- Node.js 18 or higher
- TypeScript 5.x (recommended)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT © [gnana997](https://github.com/gnana997)

---

Built with ❤️ using [node-stdio-jsonrpc](https://www.npmjs.com/package/node-stdio-jsonrpc)
