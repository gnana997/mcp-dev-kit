# Test Suite Example

**Make testing MCP servers delightful** with `mcp-dev-kit`'s powerful testing utilities and custom Vitest matchers.

## What This Example Shows

- ✨ **Custom Vitest Matchers** - Expressive, readable test assertions
- 🎯 **MCPTestClient** - Simple, reliable MCP server testing
- 📝 **Best Practices** - Patterns for comprehensive test suites
- 🛠️ **Real Server Example** - Complete working MCP server with 3 tools
- ✅ **30 Comprehensive Tests** - Covering all server functionality

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run the test suite
npm test

# Watch mode for development
npm run test:watch
\`\`\`

## Files

- **test-server.js** - Example MCP server with 3 tools (echo, calculate, format)
- **test-server.test.ts** - Comprehensive test suite showcasing all features
- **vitest.setup.ts** - Matcher installation setup
- **vitest.config.ts** - Vitest configuration
- **package.json** - Dependencies and scripts

---

## ✨ Custom Vitest Matchers

The star feature! Write beautiful, expressive tests with our custom matchers.

### toHaveTool

Check if a server has a specific tool:

\`\`\`typescript
// Before (standard assertions)
const tools = await client.listTools();
expect(tools.tools.some(t => t.name === 'echo')).toBe(true);

// After (custom matcher) - So much better! ✨
await expect(client).toHaveTool('echo');
\`\`\`

### toReturnToolResult

Assert a tool returns the expected result:

\`\`\`typescript
// Clean, readable assertion
await expect(
  client.callTool('calculate', { operation: 'add', a: 5, b: 3 })
).toReturnToolResult('8');
\`\`\`

### toThrowToolError

Test error cases elegantly:

\`\`\`typescript
// Assert that a tool call throws an error
await expect(
  client.callTool('calculate', { operation: 'divide', a: 10, b: 0 })
).toThrowToolError();
\`\`\`

### toMatchToolSchema

Validate tool schemas:

\`\`\`typescript
const tools = await client.listTools();
const echoTool = tools.find(t => t.name === 'echo');

expect(echoTool).toMatchToolSchema({
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string' }
  }
});
\`\`\`

---

## 🎯 MCPTestClient

Super simple way to test MCP servers:

\`\`\`typescript
import { MCPTestClient } from 'mcp-dev-kit/client';

describe('My MCP Server', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    // Create a client pointing to your server
    client = new MCPTestClient({
      command: 'node',
      args: ['./my-server.js'],
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should have the tools I need', async () => {
    // Use custom matchers for clean assertions
    await expect(client).toHaveTool('my-tool');
  });

  it('should do what I expect', async () => {
    const result = await client.expectToolCallSuccess('my-tool', { input: 'test' });
    expect(result).toBe('expected output');
  });
});
\`\`\`

### Client Methods

- **\`connect()\`** - Connect to the server
- **\`disconnect()\`** - Disconnect and cleanup
- **\`isConnected()\`** - Check connection status
- **\`listTools()\`** - Get all available tools
- **\`callTool(name, args)\`** - Call a tool and get result
- **\`expectToolCallSuccess(name, args)\`** - Call tool, expect success
- **\`expectToolCallError(name, args)\`** - Call tool, expect error
- **\`getServerInfo()\`** - Get server name/version
- **\`getServerCapabilities()\`** - Get server capabilities

---

## 📝 Test Structure

The example test suite is organized to showcase different testing patterns:

### Part 1: Custom Matchers (Lines 39-106)

Demonstrates all custom matchers with clear examples.

### Part 2: Standard Testing (Lines 110-309)

- Server initialization tests
- Tool discovery tests
- Functional tests for each tool
- Error handling tests

---

## Example Test Output

\`\`\`
✓ MCP Server Test Suite Example (30 tests)
  ✓ ✨ Custom Vitest Matchers (8 tests)
    ✓ toHaveTool matcher (2 tests)
    ✓ toReturnToolResult matcher (1 test)
    ✓ toThrowToolError matcher (1 test)
    ✓ toMatchToolSchema matcher (2 tests)
  ✓ Server Initialization (3 tests)
  ✓ Tool Discovery (2 tests)
  ✓ Echo Tool (4 tests)
  ✓ Calculate Tool (10 tests)
  ✓ Format Tool (3 tests)
  ✓ Error Scenarios (1 test)

Test Files  1 passed (1)
     Tests  30 passed (30)
  Start at  12:00:00
  Duration  1.2s
\`\`\`

---

## The Example Server

Our test server implements three simple tools to demonstrate testing patterns:

### echo

Returns the input message unchanged.

**Input:** \`{ message: string }\`  
**Output:** The message  
**Errors:** Throws if message is empty or missing

### calculate

Performs basic arithmetic operations.

**Input:** \`{ operation: 'add'|'subtract'|'multiply'|'divide', a: number, b: number }\`  
**Output:** The result as a string  
**Errors:** Division by zero, unknown operations

### format

Formats a message with an ISO timestamp.

**Input:** \`{ message: string }\`  
**Output:** \`[2024-01-01T12:00:00.000Z] message\`

---

## Tips for Writing Great Tests

### 1. Use Custom Matchers

They make your tests more readable and intentions clearer:

\`\`\`typescript
// ❌ Harder to read
const tools = await client.listTools();
expect(tools.find(t => t.name === 'echo')).toBeDefined();

// ✅ Clear and expressive
await expect(client).toHaveTool('echo');
\`\`\`

### 2. Test Happy Paths and Errors

\`\`\`typescript
// Happy path
it('should add numbers', async () => {
  await expect(
    client.callTool('calculate', { operation: 'add', a: 5, b: 3 })
  ).toReturnToolResult('8');
});

// Error case
it('should fail on division by zero', async () => {
  await expect(
    client.callTool('calculate', { operation: 'divide', a: 10, b: 0 })
  ).toThrowToolError();
});
\`\`\`

### 3. Organize by Feature

Group related tests using describe blocks:

\`\`\`typescript
describe('Calculate Tool', () => {
  describe('Addition', () => {
    it('should add positive numbers', ...);
    it('should add negative numbers', ...);
  });

  describe('Division', () => {
    it('should divide numbers', ...);
    it('should fail on division by zero', ...);
  });
});
\`\`\`

### 4. Use Helper Methods

\`\`\`typescript
// Use expectToolCallSuccess for cleaner tests
const result = await client.expectToolCallSuccess<string>('echo', { message: 'hi' });
expect(result).toBe('hi');

// Instead of manual error handling
try {
  await client.callTool('echo', { message: '' });
  expect.fail('Should have thrown');
} catch (error) {
  expect(error).toBeDefined();
}

// Use expectToolCallError
const error = await client.expectToolCallError('echo', { message: '' });
expect(error).toBeDefined();
\`\`\`

---

## Learn More

- [mcp-dev-kit Documentation](../../README.md)
- [API Reference](../../docs/api.md)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Vitest Documentation](https://vitest.dev)

---

## Contributing

Found a better testing pattern? Have ideas for more custom matchers? We'd love to hear from you!
