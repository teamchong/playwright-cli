import { execSync } from 'child_process';

/**
 * Global Test Teardown
 * 
 * Runs ONCE after all test files are complete.
 * Optionally closes the shared browser session.
 */
export default async function globalTeardown() {
  // Only close browser if explicitly requested via env var
  if (process.env.CLOSE_BROWSER_AFTER_TESTS === 'true') {
    console.log('🧹 Closing global browser session...');
    
    try {
      const output = execSync('node dist/index.js close', { 
        encoding: 'utf8',
        timeout: 5000 
      });
      console.log('✅ Global browser session closed');
      console.log(output);
    } catch (error) {
      console.warn('⚠️  Failed to close browser gracefully:', error.message);
    }
  } else {
    console.log('🌐 Keeping browser session open (set CLOSE_BROWSER_AFTER_TESTS=true to close)');
  }
}