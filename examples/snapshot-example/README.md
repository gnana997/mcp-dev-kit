# Snapshot Testing Example

This example demonstrates real-world MCP server snapshot testing with a realistic file system server.

## Features

- **File System MCP Server** - Lists files with metadata (size, modified time, permissions)
- **Realistic Data** - Generates 10-5000 files with nested directories
- **Snapshot Tests** - Shows how to snapshot complex responses (16 test scenarios)
- **Performance Benchmarks** - Measures normalization overhead vs data size/depth
- **Best Practices & Anti-Patterns** - Learn what to do (and what to avoid)

## Running the Example

```bash
# Run the tests (16 scenarios)
npm test

# Run benchmarks (measures normalization performance)
npm run bench

# Update snapshots
npm test -- -u
```

## What This Demonstrates

1. **Smart Defaults** - Timestamps, request IDs, and execution times automatically excluded
2. **Custom Exclusions** - Excluding file sizes, inodes, and other dynamic fields
3. **Real-World Scenarios** - File systems, databases, GitHub repos
4. **Performance Analysis** - Benchmarks show < 50μs overhead for typical use cases
5. **Best Practices** - When to snapshot, what to exclude, how to combine with assertions
6. **Anti-Patterns** - Common mistakes and how to avoid them

## Test Scenarios

The test suite includes 16 comprehensive scenarios:

### File System Scenarios
- **Small directory (10 files)** - Fast tests, easy PR review
- **Medium directory (100 files)** - Typical MCP response size
- **Large directory (1000 files)** - Stress testing
- **Custom exclusions** - Excluding file sizes and inodes

### Database Query Scenarios
- **Small result (10 rows)** - Quick queries
- **Medium result (100 rows)** - Standard dataset
- **ID exclusion** - Excluding auto-increment IDs
- **Large result (1000 rows)** - Heavy queries

### GitHub Integration Scenarios
- **Small repo (10 files, 5 commits)** - Lightweight projects
- **Medium repo (100 files, 50 commits)** - Typical repositories
- **SHA exclusion** - Excluding git commit SHAs

### Best Practices Examples
- **Focused snapshots** - Snapshot only relevant parts
- **Multiple snapshots** - Split large responses into manageable chunks
- **Combined approach** - Explicit assertions + snapshots

### Anti-Patterns to Avoid
- **Without exclusions** - Shows why dynamic field exclusion is critical
- **Unnecessarily large snapshots** - Demonstrates snapshot size limits

## Performance Benchmarks

The benchmark suite measures **normalization overhead only** (property exclusion logic), not snapshot file creation (which is handled by Vitest and involves non-deterministic file I/O).

### What We Measure

- **Data size scaling** - 10, 100, 1000, 5000 items
- **Nesting depth scaling** - 2, 5, 10 levels deep
- **Exclusion count scaling** - 0, 7, 15 excluded fields
- **Real-world scenarios** - GitHub repos, database queries, file listings

### Performance Characteristics

| Scenario | Normalization Overhead | Notes |
|----------|----------------------|-------|
| **10-100 items** | < 50 microseconds | Typical MCP responses |
| **1000 items** | < 50 microseconds | Large responses |
| **5000 items** | < 50 microseconds | Extra-large responses |
| **Shallow nesting (2 levels)** | ~45 microseconds | Most MCP responses |
| **Medium nesting (5 levels)** | ~430 microseconds | Complex nested data |
| **Deep nesting (10 levels)** | ~1.6 milliseconds | Rare in practice |

**Key Findings:**
- ✅ **Scales well with DATA SIZE** - More items ≈ similar overhead (JIT optimization)
- ⚠️ **Degrades with NESTING DEPTH** - Deeper = slower (recursive overhead)
- ✅ **Production-ready** - < 1% overhead for typical MCP responses

### Important Notes on Benchmarking

- **JIT warmup**: Benchmarks measure fully-optimized code (after warmup iterations)
- **Micro-benchmark limitations**: Real-world "cold start" performance may vary
- **Deterministic data**: All test data uses fixed values (no `Date` or `Math.random()` during benchmarks)
- **No file I/O measured**: Snapshot file creation time excluded (handled by Vitest)

### 📝 Feedback Welcome!

I'm actively testing this feature and would love your feedback! If you experience performance issues or have suggestions, please [open an issue on GitHub](https://github.com/gnana997/mcp-dev-kit/issues).

## Best Practices

**✅ DO:**
- Snapshot server response structure
- Use smart defaults for common dynamic fields
- Snapshot small-to-medium datasets (10-1000 items)
- Combine snapshots with explicit assertions
- Review snapshot changes before accepting
- Split large responses into focused snapshots

**❌ DON'T:**
- Snapshot without excluding dynamic fields (timestamps, IDs, etc.)
- Create multi-megabyte snapshots (split into smaller tests)
- Snapshot implementation details
- Blindly update snapshots with `-u` flag
- Use snapshots as a replacement for explicit assertions

## Example Output

When you run the benchmarks, you'll see:

```
=== MCP Snapshot Testing Performance ===

What we measure:
  Property exclusion normalization overhead (excludeProperties function)

Performance characteristics:
  - ✅ Scales well with data SIZE (more items = similar overhead)
  - ⚠️  Degrades with NESTING DEPTH (deeper = slower)
  - Typical MCP responses (2-3 levels): < 50μs overhead
  - Deep structures (10+ levels): ~1-2ms overhead

Conclusion:
  Snapshot testing with property exclusion adds negligible overhead
  for typical MCP server responses, making it practical for real-world use.
```

## Learn More

- See [../../README.md](../../README.md#snapshot-testing) for complete snapshot testing documentation
- Check [snapshot.test.ts](./snapshot.test.ts) for all 16 test scenarios
- Review [snapshot.bench.ts](./snapshot.bench.ts) for performance benchmark implementation
