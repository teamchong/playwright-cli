import { defineConfig } from 'vite'

export default defineConfig({
  // Server configuration to prevent RPC timeout
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**']
    }
  },
  test: {
    globals: true,
    environment: 'node',
    // Global browser session setup
    globalSetup: ['./src/test-utils/global-setup.ts'],
    globalTeardown: ['./src/test-utils/global-teardown.ts'],
    // Per-file setup/teardown for connection cleanup
    setupFiles: ['./src/test-utils/per-file-setup.ts'],
    // Use threads instead of forks for better RPC communication
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,  // Run all tests in a single thread
        isolate: false,      // Don't isolate to reduce overhead
      }
    },
    testTimeout: 30000,    // 30 second timeout per test (browser tests are slow)
    hookTimeout: 60000,    // 60 second timeout for hooks (browser setup takes time)
    teardownTimeout: 30000, // 30 second for cleanup (browser teardown takes time)
    maxConcurrency: 1,     // Run tests sequentially
    isolate: false,        // Disable isolation to reduce overhead (tests run sequentially anyway)
    bail: 3,               // Stop after 3 test failures to prevent cascading timeouts
    // Fix for vitest-worker timeout
    slowTestThreshold: 30000, // Mark tests as slow after 30 seconds
    // Reporter configuration for better handling of long tests
    reporters: process.env.CI ? ['default'] : ['verbose'],
    // Disable file parallelism to avoid worker communication issues
    fileParallelism: false,
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