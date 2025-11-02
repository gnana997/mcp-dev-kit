import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'logger/index': 'src/logger/index.ts',
    'client/index': 'src/client/index.ts',
    'dev-server/index': 'src/dev-server/index.ts',
    'matchers/index': 'src/matchers/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'node18',
  outDir: 'dist',
  shims: true,
});
