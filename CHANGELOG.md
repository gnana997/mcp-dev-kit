# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-04

### Added
- **Snapshot Testing** - MCP-aware snapshot matchers for regression testing
  - `toMatchMCPSnapshot()` - Generic snapshot matcher with smart defaults
  - `toMatchToolResponseSnapshot()` - Specialized for tool call results
  - `toMatchToolListSnapshot()` - Snapshot tool definitions
  - `toMatchResourceListSnapshot()` - Snapshot resource listings
  - `toMatchPromptListSnapshot()` - Snapshot prompt definitions
- **Smart Defaults** - Automatically excludes dynamic fields from snapshots:
  - `timestamp`, `requestId`, `executionTime`
  - `_meta.timestamp`, `serverInfo.startedAt`, `serverInfo.uptime`
  - `cacheKey`
- **Custom Property Exclusion** - Glob pattern support for excluding fields:
  - `field` - Top-level field exclusion
  - `nested.field` - Nested field exclusion
  - `array.*.field` - Exclude field from all array items
- **Performance Benchmarks** - Comprehensive benchmarking suite:
  - Data size scaling (10, 100, 1000, 5000 items)
  - Nesting depth scaling (2, 5, 10 levels)
  - Real-world MCP scenarios (GitHub repos, databases, file systems)
  - < 50 microseconds overhead for typical MCP responses
- **Complete Examples** - Real-world snapshot testing examples in `examples/snapshot-example/`:
  - Realistic file system MCP server
  - 16 test scenarios with best practices
  - Performance benchmarks with detailed metrics
  - Anti-patterns and pitfalls documentation

### Performance
- Property exclusion normalization: < 50μs for typical MCP responses (10-100 items)
- Scales well with data size, degrades gracefully with nesting depth
- Production-ready with < 1% overhead for standard use cases

## [0.1.0] - 2025-11-03

### Added
- Smart Debug Logger - patches console methods to use stderr
- MCPTestClient - simple client for unit testing MCP servers
- Custom Vitest matchers for MCP testing
- Complete TypeScript support with type definitions
- Comprehensive documentation and API reference
- Example test suite showcasing custom matchers
- Logger examples demonstrating various use cases
