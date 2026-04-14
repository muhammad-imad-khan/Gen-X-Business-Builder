import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 30_000,
    globals: true,
    include: ['**/*.e2e.ts'],
    sequence: { concurrent: false },
    setupFiles: ['./setup.ts'],
  },
});
