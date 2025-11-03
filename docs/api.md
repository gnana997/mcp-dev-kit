# API Reference

Complete API documentation for `mcp-dev-kit`.

## Table of Contents

- [MCPTestClient](#mcptestclient)
- [Custom Matchers](#custom-matchers)
- [Logger API](#logger-api)
- [Error Classes](#error-classes)

---

## MCPTestClient

### Import

```typescript
import { MCPTestClient } from 'mcp-dev-kit/client';
```

### Constructor

```typescript
new MCPTestClient(config: MCPTestClientConfig)
```

#### MCPTestClientConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `command` | `string` | Yes | - | Command to execute (e.g., 'node') |
| `args` | `string[]` | Yes | - | Command arguments (e.g., ['server.js']) |
| `env` | `Record<string, string>` | No | `{}` | Environment variables |
| `clientInfo` | `object` | No | See below | Client identification |
| `clientInfo.name` | `string` | No | `'mcp-test-client'` | Client name |
| `clientInfo.version` | `string` | No | `'0.1.0'` | Client version |
| `capabilities` | `object` | No | `{}` | Client capabilities |
| `timeout` | `number` | No | `5000` | Connection timeout (ms) |

**Example:**

```typescript
const client = new MCPTestClient({
  command: 'node',
  args: ['./my-server.js'],
  env: { DEBUG: 'true' },
  timeout: 10000,
});
```

### Methods

#### connect()

Connects to the MCP server and completes initialization handshake.

```typescript
async connect(): Promise<void>
```

**Throws:**
- `ConnectionError` - If connection fails
- `InitializationError` - If handshake fails

**Example:**

```typescript
await client.connect();
```

#### disconnect()

Disconnects from the MCP server and cleans up resources.

```typescript
async disconnect(): Promise<void>
```

**Example:**

```typescript
await client.disconnect();
```

#### isConnected()

Checks if client is connected to server.

```typescript
isConnected(): boolean
```

**Returns:** `boolean` - Connection status

**Example:**

```typescript
if (client.isConnected()) {
  console.log('Connected!');
}
```

#### listTools()

Lists all available tools from the server.

```typescript
async listTools(): Promise<Tool[]>
```

**Returns:** `Promise<Tool[]>` - Array of tool definitions

**Throws:**
- `ConnectionError` - If not connected
- `MCPTestError` - If request fails

**Example:**

```typescript
const tools = await client.listTools();
console.log(tools.map(t => t.name)); // ['echo', 'calculate', ...]
```

#### callTool()

Calls a tool on the server with parameters.

```typescript
async callTool<T>(
  name: string,
  params?: unknown,
  options?: ToolCallOptions
): Promise<ToolCallResult<T>>
```

**Parameters:**
- `name` - Tool name to call
- `params` - Tool parameters (must match tool's input schema)
- `options` - Optional call options

**Returns:** `Promise<ToolCallResult<T>>` - Tool execution result

**Throws:**
- `ConnectionError` - If not connected
- `ToolCallError` - If tool call fails
- `ToolNotFoundError` - If tool doesn't exist

**Example:**

```typescript
const result = await client.callTool('echo', { message: 'hello' });
console.log(result.content[0]?.text); // 'hello'
```

#### listResources()

Lists all available resources from the server.

```typescript
async listResources(): Promise<Resource[]>
```

**Returns:** `Promise<Resource[]>` - Array of resource definitions

**Example:**

```typescript
const resources = await client.listResources();
console.log(resources.map(r => r.uri));
```

#### readResource()

Reads a specific resource from the server.

```typescript
async readResource(uri: string): Promise<ResourceContent>
```

**Parameters:**
- `uri` - Resource URI to read

**Returns:** `Promise<ResourceContent>` - Resource contents

**Example:**

```typescript
const content = await client.readResource('config://app.json');
console.log(content.contents[0]?.text);
```

#### listPrompts()

Lists all available prompts from the server.

```typescript
async listPrompts(): Promise<Prompt[]>
```

**Returns:** `Promise<Prompt[]>` - Array of prompt definitions

**Example:**

```typescript
const prompts = await client.listPrompts();
console.log(prompts.map(p => p.name));
```

#### getPrompt()

Gets a specific prompt from the server.

```typescript
async getPrompt(
  name: string,
  params?: Record<string, string>
): Promise<PromptResult>
```

**Parameters:**
- `name` - Prompt name
- `params` - Prompt parameters

**Returns:** `Promise<PromptResult>` - Prompt messages

**Example:**

```typescript
const prompt = await client.getPrompt('greeting', { name: 'Alice' });
console.log(prompt.messages);
```

### Test Helper Methods

#### expectToolExists()

Test helper that asserts a tool exists and returns it.

```typescript
async expectToolExists(name: string): Promise<Tool>
```

**Throws:** `ToolNotFoundError` if tool doesn't exist

**Example:**

```typescript
const tool = await client.expectToolExists('echo');
expect(tool.description).toBe('Echoes back the message');
```

#### expectToolCallSuccess()

Test helper that asserts a tool call succeeds and returns parsed result.

```typescript
async expectToolCallSuccess<T>(
  name: string,
  params?: unknown,
  options?: ToolCallOptions
): Promise<T>
```

**Returns:** Parsed result (JSON if possible, otherwise text)

**Throws:** `AssertionError` if tool call fails

**Example:**

```typescript
const result = await client.expectToolCallSuccess('echo', { message: 'test' });
expect(result).toBe('test');
```

#### expectToolCallError()

Test helper that asserts a tool call fails and returns the error.

```typescript
async expectToolCallError(
  name: string,
  params?: unknown
): Promise<Error>
```

**Returns:** An Error instance containing the actual server error message

**Throws:** `AssertionError` if tool call succeeds

**Example:**

```typescript
const error = await client.expectToolCallError('calculate', { operation: 'divide', a: 10, b: 0 });
expect(error).toBeInstanceOf(Error);
expect(error.message).toContain('Division by zero'); // Actual server error message
```

#### getServerInfo()

Gets server information from initialization.

```typescript
getServerInfo(): { name: string; version: string } | null
```

**Example:**

```typescript
const info = client.getServerInfo();
console.log(`${info?.name} v${info?.version}`);
```

#### getServerCapabilities()

Gets server capabilities from initialization.

```typescript
getServerCapabilities(): object | null
```

**Example:**

```typescript
const capabilities = client.getServerCapabilities();
console.log(capabilities?.tools); // { listChanged: true }
```

---

## Custom Matchers

### Import

```typescript
import { installMCPMatchers } from 'mcp-dev-kit/matchers';
```

### Installation

Call `installMCPMatchers()` once before using matchers (e.g., in `vitest.setup.ts`):

```typescript
import { installMCPMatchers } from 'mcp-dev-kit/matchers';
installMCPMatchers();
```

### Available Matchers

#### toHaveTool()

Asserts that the server has a tool with the given name.

```typescript
await expect(client).toHaveTool(toolName: string)
expect(tools).toHaveTool(toolName: string)
```

**Works with:**
- `MCPTestClient` instance (async)
- `Tool[]` array (sync)

**Example:**

```typescript
await expect(client).toHaveTool('echo');

const tools = await client.listTools();
expect(tools).toHaveTool('calculate');
```

#### toHaveResource()

Asserts that the server has a resource with the given URI.

```typescript
await expect(client).toHaveResource(uri: string)
expect(resources).toHaveResource(uri: string)
```

**Works with:**
- `MCPTestClient` instance (async)
- `Resource[]` array (sync)

**Example:**

```typescript
await expect(client).toHaveResource('config://app.json');

const resources = await client.listResources();
expect(resources).toHaveResource('file://readme.md');
```

#### toHavePrompt()

Asserts that the server has a prompt with the given name.

```typescript
await expect(client).toHavePrompt(promptName: string)
expect(prompts).toHavePrompt(promptName: string)
```

**Works with:**
- `MCPTestClient` instance (async)
- `Prompt[]` array (sync)

**Example:**

```typescript
await expect(client).toHavePrompt('greeting');

const prompts = await client.listPrompts();
expect(prompts).toHavePrompt('code-review');
```

#### toReturnToolResult()

Asserts that a tool call returns a specific result.

```typescript
await expect(toolCallPromise).toReturnToolResult(expected: unknown)
expect(toolCallResult).toReturnToolResult(expected: unknown)
```

**Works with:**
- `Promise<ToolCallResult>` (async)
- `ToolCallResult` (sync)

**Features:**
- Automatically parses JSON results
- Supports deep equality checking
- Extracts text from single text content items

**Example:**

```typescript
await expect(client.callTool('echo', { message: 'test' }))
  .toReturnToolResult('test');

await expect(client.callTool('calculate', { a: 5, b: 3 }))
  .toReturnToolResult('8');
```

#### toThrowToolError()

Asserts that a tool call throws an error.

```typescript
await expect(toolCallPromise).toThrowToolError()
```

**Works with:**
- `Promise<ToolCallResult>` (async only)

**Example:**

```typescript
await expect(client.callTool('unknown', {})).toThrowToolError();
```

#### toHaveToolProperty()

Asserts that a tool has a specific property with optional value check.

```typescript
expect(tool).toHaveToolProperty(property: string)
expect(tool).toHaveToolProperty(property: string, value: unknown)
```

**Works with:**
- `Tool` object (sync)

**Example:**

```typescript
const tools = await client.listTools();
const echoTool = tools[0];

expect(echoTool).toHaveToolProperty('name');
expect(echoTool).toHaveToolProperty('description', 'Echoes back the message');
```

#### toMatchToolSchema()

Asserts that a tool's input schema matches expected structure (partial match).

```typescript
expect(tool).toMatchToolSchema(schema: Record<string, unknown>)
```

**Works with:**
- `Tool` object (sync)

**Features:**
- Partial matching (only checks specified properties)
- Deep equality for nested structures

**Example:**

```typescript
const tools = await client.listTools();
const echoTool = tools[0];

expect(echoTool).toMatchToolSchema({
  type: 'object',
  required: ['message']
});

expect(echoTool).toMatchToolSchema({
  type: 'object',
  properties: {
    message: { type: 'string' }
  }
});
```

---

## Logger API

### Import

```typescript
// Auto-patch (recommended)
import 'mcp-dev-kit/logger';

// Manual usage
import { createLogger, patchConsole, unpatchConsole } from 'mcp-dev-kit';
```

### createLogger()

Creates a custom logger instance.

```typescript
createLogger(options?: LoggerOptions): DebugLogger
```

#### LoggerOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable logging |
| `timestamps` | `boolean` | `true` | Show ISO8601 timestamps |
| `colors` | `boolean` | auto | Force colors on/off |
| `level` | `'debug'\|'info'\|'warn'\|'error'` | `'debug'` | Minimum log level |
| `stream` | `WritableStream` | `process.stderr` | Output stream |
| `logFile` | `string` | - | Optional file output |

**Example:**

```typescript
const logger = createLogger({
  level: 'info',
  colors: true,
  logFile: './server.log',
});

logger.info('Server started');
await logger.close();
```

### patchConsole()

Patches global console methods to redirect to stderr.

```typescript
patchConsole(options?: LoggerOptions): void
```

**Example:**

```typescript
patchConsole({ timestamps: false });
console.log('Goes to stderr');
```

### unpatchConsole()

Restores original console methods.

```typescript
unpatchConsole(): void
```

**Example:**

```typescript
unpatchConsole();
console.log('Back to stdout');
```

---

## Error Classes

### Import

```typescript
import {
  MCPTestError,
  ConnectionError,
  InitializationError,
  ValidationError,
  ToolNotFoundError,
  ToolCallError,
  AssertionError,
} from 'mcp-dev-kit/client';
```

### MCPTestError

Base error class for all MCP test errors.

```typescript
class MCPTestError extends Error {
  code: MCPTestErrorCode;
  context: Record<string, unknown>;
}
```

### ConnectionError

Thrown when connection to server fails.

```typescript
class ConnectionError extends MCPTestError {
  code: 'CONNECTION_FAILED';
}
```

### InitializationError

Thrown when server initialization fails.

```typescript
class InitializationError extends MCPTestError {
  code: 'INITIALIZATION_FAILED';
}
```

### ValidationError

Thrown when response validation fails.

```typescript
class ValidationError extends MCPTestError {
  code: 'VALIDATION_FAILED';
}
```

### ToolNotFoundError

Thrown when a tool is not found on the server.

```typescript
class ToolNotFoundError extends MCPTestError {
  code: 'TOOL_NOT_FOUND';
  context: {
    toolName: string;
    availableTools: string[];
  };
}
```

### ToolCallError

Thrown when a tool call fails.

```typescript
class ToolCallError extends MCPTestError {
  code: 'TOOL_CALL_FAILED';
  context: {
    toolName: string;
    params?: unknown;
  };
}
```

### AssertionError

Thrown when a test assertion fails.

```typescript
class AssertionError extends MCPTestError {
  code: 'ASSERTION_FAILED';
}
```

---

## Type Definitions

### Tool

```typescript
interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
}
```

### ToolCallResult

```typescript
interface ToolCallResult<T = unknown> {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```

### Resource

```typescript
interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}
```

### Prompt

```typescript
interface Prompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}
```

---

## Examples

For complete working examples, see the [examples](../examples/) directory:

- **MCPTestClient**: [client-integration.test.ts](../tests/client-integration.test.ts)
- **Custom Matchers**: [matchers.test.ts](../tests/matchers.test.ts)
- **Logger**: [examples/logger/](../examples/logger/)
