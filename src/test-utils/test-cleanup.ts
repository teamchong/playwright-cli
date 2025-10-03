/**
 * Test Cleanup Utilities
 *
 * Provides cleanup functions to prevent connection pool exhaustion
 * and ensure test isolation
 */

import { CDPConnectionPool } from '../lib/cdp-connection-pool'

/**
 * Clean up CDP connections after a test file completes
 * Call this in afterAll() of integration tests that use the browser
 *
 * This prevents connection pool exhaustion when running full test suite
 */
export async function cleanupCDPConnections(): Promise<void> {
  try {
    const pool = CDPConnectionPool.getInstance()

    // Release all connections back to pool (mark as not in use)
    // This allows the cleanup interval to remove stale connections
    const connections = (pool as any).connections
    if (connections) {
      for (const [key, conn] of connections) {
        conn.inUse = false
        conn.lastUsed = Date.now() - 70000 // Force immediate cleanup (older than 60s timeout)
      }
    }

    // Trigger immediate cleanup of stale connections
    const cleanupMethod = (pool as any).cleanupStaleConnections
    if (typeof cleanupMethod === 'function') {
      cleanupMethod.call(pool)
    }
  } catch (error) {
    // Don't fail tests if cleanup fails
    console.warn('CDP connection cleanup warning:', error)
  }
}

/**
 * Full connection pool reset for test isolation
 * More aggressive than cleanupCDPConnections
 */
export async function resetConnectionPool(): Promise<void> {
  try {
    const pool = CDPConnectionPool.getInstance()

    // Clear all connections
    const clearMethod = (pool as any).clearAll
    if (typeof clearMethod === 'function') {
      clearMethod.call(pool)
    }
  } catch (error) {
    console.warn('Connection pool reset warning:', error)
  }
}
