/**
 * Real-World Snapshot Testing Examples
 *
 * Demonstrates snapshot testing with realistic MCP server responses
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MCPTestClient } from '../../src/client/index.js';
import { installMCPMatchers } from '../../src/matchers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Install custom matchers
installMCPMatchers();

describe('Real-World Snapshot Testing', () => {
  const serverPath = path.join(__dirname, 'file-system-server.ts');
  let client: MCPTestClient;

  beforeAll(async () => {
    client = new MCPTestClient({
      command: 'npx',
      args: ['tsx', serverPath],
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('File System Scenarios', () => {
    it('should snapshot small directory listing (10 files)', async () => {
      const result = await client.callTool('list_files', {
        path: '/project/src',
        count: 10,
      });

      // Timestamps and inodes are auto-excluded by smart defaults
      expect(result).toMatchToolResponseSnapshot();
    });

    it('should snapshot medium directory listing (100 files)', async () => {
      const result = await client.callTool('list_files', {
        path: '/project',
        count: 100,
      });

      expect(result).toMatchToolResponseSnapshot();
    });

    it('should snapshot with custom exclusions (file sizes)', async () => {
      const result = await client.callTool('list_files', {
        path: '/project',
        count: 50,
      });

      // Exclude file sizes in addition to timestamps/inodes
      expect(result).toMatchToolResponseSnapshot({
        exclude: ['size', 'inode'], // Custom exclusions
      });
    });

    it('should handle large directory listing (1000 files)', async () => {
      const result = await client.callTool('list_files', {
        path: '/project',
        count: 1000,
      });

      // This creates a large snapshot (~200KB)
      // Consider if this is really needed or if smaller focused tests are better
      expect(result).toMatchToolResponseSnapshot();
    });
  });

  describe('Database Query Scenarios', () => {
    it('should snapshot small query result (10 rows)', async () => {
      const result = await client.callTool('query_database', {
        query: 'SELECT * FROM orders WHERE status = $1',
        rowCount: 10,
      });

      // executionTime and timestamp auto-excluded
      expect(result).toMatchToolResponseSnapshot();
    });

    it('should snapshot medium query result (100 rows)', async () => {
      const result = await client.callTool('query_database', {
        query: 'SELECT * FROM orders',
        rowCount: 100,
      });

      expect(result).toMatchToolResponseSnapshot();
    });

    it('should snapshot with ID exclusion', async () => {
      const result = await client.callTool('query_database', {
        query: 'SELECT * FROM orders',
        rowCount: 50,
      });

      // Exclude auto-increment IDs as they're not stable
      expect(result).toMatchToolResponseSnapshot({
        exclude: ['rows.*.id'], // Exclude ID from all rows
      });
    });

    it('should handle large query result (1000 rows)', async () => {
      const result = await client.callTool('query_database', {
        query: 'SELECT * FROM orders',
        rowCount: 1000,
      });

      expect(result).toMatchToolResponseSnapshot();
    });
  });

  describe('GitHub Integration Scenarios', () => {
    it('should snapshot small repository (10 files, 5 commits)', async () => {
      const result = await client.callTool('get_github_repo', {
        owner: 'testuser',
        repo: 'testproject',
        fileCount: 10,
        commitCount: 5,
      });

      // created_at, updated_at, and SHAs auto-excluded
      expect(result).toMatchToolResponseSnapshot();
    });

    it('should snapshot medium repository (100 files, 50 commits)', async () => {
      const result = await client.callTool('get_github_repo', {
        owner: 'testuser',
        repo: 'largeproject',
        fileCount: 100,
        commitCount: 50,
      });

      expect(result).toMatchToolResponseSnapshot();
    });

    it('should snapshot with git SHA exclusion', async () => {
      const result = await client.callTool('get_github_repo', {
        owner: 'testuser',
        repo: 'project',
        fileCount: 50,
        commitCount: 25,
      });

      // Explicitly exclude git SHAs (though smart defaults should handle this)
      expect(result).toMatchToolResponseSnapshot({
        exclude: ['files.*.sha', 'commits.*.sha', 'id'],
      });
    });
  });

  describe('Best Practices', () => {
    it('should snapshot only relevant parts of response', async () => {
      const result = await client.callTool('list_files', {
        path: '/project',
        count: 100,
      });

      // Parse the response and snapshot only what matters
      const parsed = JSON.parse(result.content[0]?.text || '{}');

      // Snapshot file names and types only, not sizes/timestamps
      const relevantData = {
        fileCount: parsed.fileCount,
        files: parsed.files.map((f: any) => ({
          name: f.name,
          type: f.type,
        })),
      };

      expect(relevantData).toMatchSnapshot();
    });

    it('should use multiple focused snapshots instead of one large one', async () => {
      const result = await client.callTool('get_github_repo', {
        owner: 'testuser',
        repo: 'project',
        fileCount: 100,
        commitCount: 50,
      });

      const parsed = JSON.parse(result.content[0]?.text || '{}');

      // Snapshot different aspects separately
      expect({ name: parsed.name, description: parsed.description }).toMatchSnapshot(
        'repo-basic-info'
      );
      expect(parsed.files.slice(0, 10)).toMatchSnapshot('repo-sample-files');
      expect(parsed.commits.slice(0, 5)).toMatchSnapshot('repo-recent-commits');
    });

    it('should combine explicit assertions with snapshots', async () => {
      const result = await client.callTool('list_files', {
        path: '/project',
        count: 50,
      });

      const parsed = JSON.parse(result.content[0]?.text || '{}');

      // Explicit assertions for critical properties
      expect(parsed.fileCount).toBe(50);
      expect(parsed.files).toHaveLength(50);
      expect(parsed.files[0]).toHaveProperty('name');
      expect(parsed.files[0]).toHaveProperty('type');

      // Snapshot for structure regression detection
      expect(parsed).toMatchMCPSnapshot();
    });
  });

  describe('Anti-Patterns to Avoid', () => {
    it('should NOT snapshot without excluding dynamic fields', async () => {
      const result = await client.callTool('list_files', {
        path: '/project',
        count: 10,
      });

      // ❌ BAD: This will fail every time because timestamps change
      // expect(result).toMatchSnapshot();

      // ✅ GOOD: Use MCP snapshot matcher with auto-exclusion
      expect(result).toMatchToolResponseSnapshot();
    });

    it('should NOT create unnecessarily large snapshots', async () => {
      // ❌ BAD: Snapshotting 10,000 files creates a multi-MB snapshot
      // const result = await client.callTool('list_files', { count: 10000 });
      // expect(result).toMatchToolResponseSnapshot();

      // ✅ GOOD: Snapshot a sample instead
      const result = await client.callTool('list_files', {
        path: '/project',
        count: 10,
      });
      expect(result).toMatchToolResponseSnapshot();
    });
  });
});
