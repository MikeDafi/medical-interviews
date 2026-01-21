import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30s for API calls
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    sequence: {
      shuffle: false // Run in order
    },
    // Only run one test file at a time to avoid DB conflicts
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});

