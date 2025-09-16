import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Global browser session setup
    globalSetup: ['./src/test-utils/global-setup.ts'],
    globalTeardown: ['./src/test-utils/global-teardown.ts'],
    // Performance optimizations to prevent hanging
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // Run all tests in a single fork to prevent multiple processes
      }
    },
    testTimeout: 10000,    // 10 second timeout per test
    hookTimeout: 30000,    // 30 second timeout for hooks (browser setup takes time)
    teardownTimeout: 10000, // 10 second for cleanup (browser teardown takes time)
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