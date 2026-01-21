import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/component-setup.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.js', 'tests/**/*.test.jsx'],
    exclude: ['tests/api/**'],  // Exclude API tests from default run
    sequence: {
      shuffle: false
    },
    fileParallelism: false
  }
});
