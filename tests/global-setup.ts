import { execSync } from 'child_process';
import { existsSync } from 'fs';

/**
 * Global Test Setup
 * 
 * Runs ONCE before all test files.
 * Sets up a single browser session that will be shared across all tests.
 */
export default async function globalSetup() {
  console.log('🚀 Starting global browser session...');
  
  // Build the CLI if needed
  if (!existsSync('dist/index.js')) {
    console.log('📦 Building CLI...');
    execSync('pnpm build', { stdio: 'inherit' });
  }

  // Don't kill browser - tests will connect to existing or launch new
  // This allows tests to run with an already-running browser

  // Start browser with a simple HTTP URL that should work
  try {
    const output = execSync('node dist/index.js open https://example.com', { 
      encoding: 'utf8',
      timeout: 15000 
    });
    console.log('✅ Global browser session started');
    console.log(output);
  } catch (error) {
    console.log('⚠️  Browser launch failed, trying without URL...');
    try {
      // Fallback: try without URL
      const fallbackOutput = execSync('node dist/index.js open', { 
        encoding: 'utf8',
        timeout: 10000 
      });
      console.log('✅ Global browser session started (fallback)');
      console.log(fallbackOutput);
    } catch (fallbackError) {
      console.error('❌ Failed to start global browser session:', fallbackError);
      throw fallbackError;
    }
  }
}