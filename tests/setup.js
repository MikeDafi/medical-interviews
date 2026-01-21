/**
 * Test Setup
 * 
 * Creates test user, session, and provides helpers for all tests.
 * Cleans up test data after tests complete.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import { sql } from '@vercel/postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Test configuration
export const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
export const TEST_PREFIX = 'test_' + Date.now();

// Test user (created fresh for each test run)
export const testUser = {
  email: `${TEST_PREFIX}@premedical-test.com`,
  google_id: TEST_PREFIX,
  name: 'Test User'
};

// Session token (set after createTestUser)
export let sessionToken = null;
export let testUserId = null;

/**
 * Create a test user and session
 */
export async function createTestUser() {
  // Create user
  const result = await sql`
    INSERT INTO users (google_id, email, name, profile_complete, purchases)
    VALUES (${testUser.google_id}, ${testUser.email}, ${testUser.name}, true, '[]'::jsonb)
    RETURNING *
  `;
  
  testUserId = result.rows[0].id;
  
  // Create session
  const token = crypto.randomBytes(64).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  await sql`
    INSERT INTO sessions (token_hash, user_id, google_id, email, expires_at)
    VALUES (${tokenHash}, ${testUserId}, ${testUser.google_id}, ${testUser.email}, ${expiresAt.toISOString()})
  `;
  
  sessionToken = token;
  
  return { userId: testUserId, token, user: result.rows[0] };
}

/**
 * Make an authenticated request
 */
export async function authFetch(url, options = {}) {
  if (!sessionToken) {
    throw new Error('No session token - call createTestUser() first');
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Cookie': `session_token=${sessionToken}`
    }
  });
}

/**
 * Reset test user purchases
 */
export async function resetUserPurchases() {
  await sql`UPDATE users SET purchases = '[]'::jsonb WHERE id = ${testUserId}`;
}

/**
 * Add a purchase to test user
 */
export async function addTestPurchase(purchase) {
  const defaultPurchase = {
    id: `test_purchase_${Date.now()}`,
    package_id: 'trial',
    duration_minutes: 30,
    category: 'interview',
    sessions_total: 1,
    sessions_used: 0,
    purchase_date: new Date().toISOString(),
    status: 'active',
    bookings: []
  };
  
  const fullPurchase = { ...defaultPurchase, ...purchase };
  
  await sql`
    UPDATE users 
    SET purchases = purchases || ${JSON.stringify(fullPurchase)}::jsonb
    WHERE id = ${testUserId}
  `;
  
  return fullPurchase;
}

/**
 * Get test user from database
 */
export async function getTestUser() {
  const result = await sql`SELECT * FROM users WHERE id = ${testUserId}`;
  return result.rows[0];
}

/**
 * Cleanup test data
 */
export async function cleanupTestData() {
  try {
    // Delete test sessions
    await sql`DELETE FROM sessions WHERE email LIKE '%@premedical-test.com'`;
    
    // Delete test users
    await sql`DELETE FROM users WHERE email LIKE '%@premedical-test.com'`;
    
    console.log('✓ Test data cleaned up');
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

/**
 * Check if server is running
 */
export async function waitForServer(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`).catch(() => null);
      if (response?.ok || response?.status === 404) {
        return true; // Server is up (404 is fine, means server responds)
      }
    } catch {
      // Server not ready
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Server not responding at ${BASE_URL}`);
}

// Global setup - runs once before all tests
export async function setup() {
  console.log('\n🧪 Setting up tests...');
  console.log(`   Base URL: ${BASE_URL}`);
  
  // Wait for server
  await waitForServer();
  console.log('   ✓ Server is running');
  
  // Create test user
  await createTestUser();
  console.log(`   ✓ Test user created: ${testUser.email}`);
  
  console.log('');
}

// Global teardown - runs once after all tests
export async function teardown() {
  console.log('\n🧹 Cleaning up...');
  await cleanupTestData();
}

// Vitest hooks
beforeAll(async () => {
  await setup();
});

afterAll(async () => {
  await teardown();
});

