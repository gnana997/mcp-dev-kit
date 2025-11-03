import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', 'tests/', 'examples/', '**/*.config.ts', '**/*.d.ts'],
      thresholds: {
        lines: 75,
        functions: 50,
        branches: 60,
        statements: 70,
      },
    },
    typecheck: {
      enabled: true,
    },
  },
});
