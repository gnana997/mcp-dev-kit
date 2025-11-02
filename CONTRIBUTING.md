# Contributing to mcp-dev-kit

Thank you for your interest in contributing to mcp-dev-kit! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18 or higher (20 LTS recommended)
- npm 9 or higher
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/gnana997/mcp-dev-kit.git
   cd mcp-dev-kit
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Watch mode during development
npm run test:watch

# Run with coverage
npm run test:coverage

# Open test UI
npm run test:ui
```

### Building

```bash
# Build once
npm run build

# Watch mode
npm run dev
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck

# Run all validations (recommended before committing)
npm run validate
```

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting.

- Use single quotes for strings
- 2 spaces for indentation
- 100 character line width
- LF line endings (enforced via .gitattributes)
- ES5 trailing commas

Run `npm run format` to automatically format your code.

## Testing Guidelines

- Write tests for all new features and bug fixes
- Aim for high code coverage (>80% lines, >75% functions)
- Use descriptive test names that explain what is being tested
- Follow the existing test structure in `tests/`
- Use TypeScript for all test files

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Commit Guidelines

- Write clear, descriptive commit messages
- Use present tense ("Add feature" not "Added feature")
- Reference issue numbers when applicable
- Keep commits focused on a single change

Example:
```
Add notification support to MCPTestClient

Implements bidirectional notification handling for test scenarios.
Fixes #123
```

## Pull Request Process

1. Ensure all tests pass: `npm test`
2. Ensure code is properly formatted: `npm run validate`
3. Update documentation if needed (README.md, API docs)
4. Update CHANGELOG.md with your changes (see Changesets section)
5. Push your branch and create a pull request
6. Wait for CI checks to pass
7. Address any review feedback

### Pull Request Template

When creating a PR, please include:

- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Testing**: How was this tested?
- **Breaking Changes**: Are there any breaking changes?

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

When adding a feature or fix, create a changeset:

```bash
npm run changeset
```

Follow the prompts to:
1. Select the type of change (patch, minor, major)
2. Describe the change for the changelog

This creates a file in `.changeset/` that will be used during release.

## Project Structure

```
mcp-dev-kit/
├── src/
│   ├── logger/        # Debug logger implementation
│   ├── client/        # MCPTestClient implementation
│   ├── dev-server/    # Hot reload development server
│   ├── matchers/      # Vitest/Jest test matchers
│   ├── cli/           # CLI entry point
│   └── index.ts       # Main entry point
├── tests/             # Test files
├── examples/          # Usage examples
└── docs/              # Additional documentation
```

## Implementation Plan

See [MCP_DEV_KIT_PLAN.md](./MCP_DEV_KIT_PLAN.md) for the detailed implementation roadmap and feature priorities.

## Reporting Issues

When reporting issues, please include:

- Node.js version (`node --version`)
- npm version (`npm --version`)
- Operating system and version
- Minimal reproduction steps
- Expected vs actual behavior
- Error messages and stack traces

## Getting Help

- Check existing [issues](https://github.com/gnana997/mcp-dev-kit/issues)
- Review the [documentation](./README.md)
- Create a new issue with the "question" label

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## License

By contributing to mcp-dev-kit, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing!
