/**
 * Per-File Test Setup
 *
 * Runs before EACH test file to ensure clean state
 * This prevents connection pool exhaustion across the full test suite
 */

import { beforeAll, afterAll } from 'vitest'
import { CDPConnectionPool } from '../lib/cdp-connection-pool'

// Track connection count before file starts
let connectionsBeforeFile = 0

beforeAll(() => {
  const pool = CDPConnectionPool.getInstance()
  const connections = (pool as any).connections
  connectionsBeforeFile = connections ? connections.size : 0

  if (process.env.DEBUG_TEST_SETUP) {
    console.log(`📊 CDP connections before file: ${connectionsBeforeFile}`)
  }
})

afterAll(async () => {
  // Clean up CDP connections after each test file
  // This prevents the pool from filling up (max 10 connections)
  try {
    const pool = CDPConnectionPool.getInstance()

    // GENTLE cleanup: Just mark connections as available (not in use)
    // Don't force-close them - let the natural cleanup interval handle it
    const connections = (pool as any).connections
    if (connections) {
      for (const [key, conn] of connections) {
        // Only mark as not in use, don't force age
        if (conn.inUse) {
          conn.inUse = false
          conn.lastUsed = Date.now()
        }
      }
    }

    const connectionsAfter = connections ? connections.size : 0

    if (process.env.DEBUG_TEST_SETUP) {
      console.log(`🧹 CDP connections released: ${connectionsBeforeFile} → ${connectionsAfter}`)
    }
  } catch (error) {
    // Don't fail tests if cleanup fails
    console.warn('CDP connection cleanup warning:', error)
  }
})
