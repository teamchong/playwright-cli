import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Performance optimizations to prevent hanging
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // Run all tests in a single fork to prevent multiple processes
      }
    },
    testTimeout: 10000,    // 10 second timeout per test
    hookTimeout: 10000,    // 10 second timeout for hooks
    teardownTimeout: 1000, // 1 second for cleanup
    maxConcurrency: 1,     // Run tests sequentially
    isolate: true,         // Isolate tests to prevent cross-contamination
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts', 
        'src/index.ts',
        'dist/**/*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['dist/**/*', 'node_modules/**/*']
  }
})