# Examples

This directory contains usage examples for mcp-dev-kit.

## Running Examples

All examples are written in TypeScript. You can run them with tsx:

```bash
# Install tsx globally (if you haven't already)
npm install -g tsx

# Run an example
tsx examples/logger/basic-usage.ts
```

## Examples

### 1. Basic Usage (`basic-usage.ts`)
The simplest way to use the logger. Just import it and console.log works!

```bash
tsx examples/logger/basic-usage.ts
```

### 2. Manual Setup (`manual-setup.ts`)
Create a custom logger instance with specific configuration.

```bash
tsx examples/logger/manual-setup.ts
```

### 3. File Logging (`file-logging.ts`)
Log to both console and a file simultaneously.

```bash
tsx examples/logger/file-logging.ts
```

### 4. MCP Server Integration (`mcp-server-example.ts`)
Real-world example showing how to use the logger in an MCP server.

**Note:** This example requires `@modelcontextprotocol/sdk` to be installed:

```bash
npm install @modelcontextprotocol/sdk
tsx examples/logger/mcp-server-example.ts
```

## Key Points

- **Auto-patch**: Import `'mcp-dev-kit/logger'` to automatically patch console
- **Manual**: Use `createLogger()` for custom configuration
- **All output goes to stderr**: Ensures MCP stdio communication isn't corrupted
- **Colors auto-detect**: Colors are only used when stderr is a TTY
- **File logging**: Optional, non-blocking, batched writes
- **Cleanup**: Call `logger.close()` or `unpatchConsole()` when done
