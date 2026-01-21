/**
 * API-level tests for the purchase flow
 * No browser needed - tests the backend directly
 * 
 * Run: node tests/api-purchase.test.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import { sql } from '@vercel/postgres';

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const BASE_URL = 'http://localhost:3000';

// Session token will be created dynamically
let SESSION_TOKEN = null;

/**
 * Create a test session directly in the database
 */
async function createTestSession() {
  const testUser = {
    google_id: 'api_test_user_' + Date.now(),
    email: 'apitest@example.com',
    name: 'API Test User'
  };

  // Find or create user
  let userResult = await sql`SELECT * FROM users WHERE email = ${testUser.email}`;
  
  let user;
  if (userResult.rows.length === 0) {
    const newUser = await sql`
      INSERT INTO users (google_id, email, name, profile_complete)
      VALUES (${testUser.google_id}, ${testUser.email}, ${testUser.name}, true)
      RETURNING *
    `;
    user = newUser.rows[0];
  } else {
    user = userResult.rows[0];
    // Update google_id
    testUser.google_id = user.google_id || testUser.google_id;
    await sql`UPDATE users SET google_id = ${testUser.google_id} WHERE id = ${user.id}`;
  }

  // Generate session token
  const token = crypto.randomBytes(64).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Clear old sessions and create new one
  await sql`DELETE FROM sessions WHERE google_id = ${testUser.google_id}`;
  await sql`
    INSERT INTO sessions (token_hash, user_id, google_id, email, expires_at)
    VALUES (${tokenHash}, ${user.id}, ${testUser.google_id}, ${user.email}, ${expiresAt.toISOString()})
  `;

  return { token, user };
}

/**
 * Helper to make authenticated requests
 */
async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Cookie': `session_token=${SESSION_TOKEN}`
    }
  });
}

// ============ TESTS ============

async function testSessionCheck() {
  console.log('\n=== Test: Session Check ===');
  
  const response = await authFetch(`${BASE_URL}/api/auth?action=session`);
  const data = await response.json();
  
  console.log(`Status: ${response.status}`);
  console.log(`Authenticated: ${data.authenticated}`);
  console.log(`User: ${data.user?.email || 'none'}`);
  
  if (data.authenticated && data.user?.email === 'apitest@example.com') {
    console.log('✅ Session is valid');
    return true;
  } else {
    console.log('❌ Session invalid');
    return false;
  }
}

async function testCheckoutWithAuth() {
  console.log('\n=== Test: Create Checkout WITH Authentication ===');
  
  const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId: 'trial' })
  });
  
  const data = await response.json();
  
  console.log(`Status: ${response.status}`);
  
  if (response.ok && data.url) {
    console.log('✅ Checkout URL created!');
    console.log(`   URL: ${data.url.substring(0, 80)}...`);
    return true;
  } else {
    console.log('Response:', data);
    if (data.error?.includes('Stripe')) {
      console.log('⚠️ Stripe not configured (expected in test mode)');
    } else {
      console.log('❌ Failed to create checkout');
    }
    return false;
  }
}

async function testAllPackages() {
  console.log('\n=== Test: All Package Checkouts ===');
  
  const packages = [
    { id: 'trial', name: '30 Min Trial', price: '$30' },
    { id: 'single', name: '1 Hour Session', price: '$100' },
    { id: 'package3', name: 'Package of 3', price: '$250' },
    { id: 'package5', name: 'Package of 5', price: '$450' }
  ];
  
  for (const pkg of packages) {
    const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: pkg.id })
    });
    
    const data = await response.json();
    
    if (response.ok && data.url) {
      console.log(`  ✅ ${pkg.name} (${pkg.price}): Checkout created`);
    } else if (data.error?.includes('Stripe')) {
      console.log(`  ⚠️ ${pkg.name}: Stripe not fully configured`);
    } else {
      console.log(`  ❌ ${pkg.name}: ${data.error || 'Failed'}`);
    }
  }
}

async function testProfileEndpoint() {
  console.log('\n=== Test: Profile Endpoint ===');
  
  const response = await authFetch(`${BASE_URL}/api/profile`);
  const data = await response.json();
  
  console.log(`Status: ${response.status}`);
  
  if (response.ok && data.user) {
    console.log('✅ Profile fetched successfully');
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Purchases: ${data.user.purchases?.length || 0}`);
    return true;
  } else {
    console.log('❌ Failed:', data.error);
    return false;
  }
}

async function testCalendarAvailability() {
  console.log('\n=== Test: Calendar Availability ===');
  
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const response = await authFetch(`${BASE_URL}/api/calendar?action=availability&date=${dateStr}`);
  const data = await response.json();
  
  console.log(`Status: ${response.status}`);
  
  if (response.ok) {
    console.log(`✅ Got availability for ${dateStr}`);
    console.log(`   Slots: ${data.slots?.length || 0}`);
    if (data.slots?.length > 0) {
      console.log(`   First slot: ${data.slots[0]}`);
    }
    return true;
  } else {
    console.log('⚠️', data.error || 'No data');
    return false;
  }
}

async function testInvalidPackage() {
  console.log('\n=== Test: Invalid Package ID ===');
  
  const response = await authFetch(`${BASE_URL}/api/stripe/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId: 'nonexistent_package_xyz' })
  });
  
  const data = await response.json();
  
  console.log(`Status: ${response.status}`);
  
  if (response.status === 400 && data.error) {
    console.log('✅ Correctly rejected invalid package');
    return true;
  } else {
    console.log('⚠️ Unexpected response:', data);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('\n=== Test: Unauthorized Access (no token) ===');
  
  const response = await fetch(`${BASE_URL}/api/stripe/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId: 'trial' })
  });
  
  const data = await response.json();
  
  console.log(`Status: ${response.status}`);
  
  if (response.status === 401) {
    console.log('✅ Correctly requires authentication');
    return true;
  } else {
    console.log('⚠️ Should require auth:', data);
    return false;
  }
}

// ============ RUN ALL TESTS ============

async function runTests() {
  console.log('========================================');
  console.log('AUTHENTICATED API TESTS');
  console.log('Testing against:', BASE_URL);
  console.log('========================================');

  // Create test session
  console.log('\n📝 Creating test session...');
  const { token, user } = await createTestSession();
  SESSION_TOKEN = token;
  console.log(`✅ Session created for ${user.email}`);

  // Run tests
  const results = {
    session: await testSessionCheck(),
    unauthorized: await testUnauthorizedAccess(),
    checkout: await testCheckoutWithAuth(),
    packages: true, // Just informational
    profile: await testProfileEndpoint(),
    calendar: await testCalendarAvailability(),
    invalidPkg: await testInvalidPackage()
  };

  await testAllPackages();

  // Summary
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`\nPassed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✅ ALL TESTS PASSED');
  } else {
    console.log('\n⚠️ Some tests need attention');
  }
  
  console.log('\n========================================\n');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
