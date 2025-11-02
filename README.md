# mcp-dev-kit

[![npm version](https://img.shields.io/npm/v/mcp-dev-kit.svg)](https://www.npmjs.com/package/mcp-dev-kit)
[![CI](https://github.com/gnana997/mcp-dev-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/gnana997/mcp-dev-kit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Debug logger for MCP (Model Context Protocol) servers**

## Why mcp-dev-kit?

The biggest pain point when developing MCP servers:
- ❌ `console.log()` breaks stdio communication
- ❌ Can't debug your MCP server normally
- ❌ JSON-RPC gets corrupted by stdout writes

**mcp-dev-kit solves this.**

## Features

✨ **Smart Debug Logger** - Use `console.log()` without breaking JSON-RPC
Automatically patches console methods to write to stderr instead of stdout

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

### Manual Control

```typescript
import { createLogger } from 'mcp-dev-kit';

const logger = createLogger({
  timestamps: true,
  level: 'info'
});

logger.info('Server ready');
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
