/**
 * Create a test session for API testing
 * 
 * This creates a real user and session in the database,
 * then returns a valid session token you can use in tests.
 * 
 * Run: node tests/create-test-session.js
 * 
 * Requires: POSTGRES_URL environment variable (loads from .env.local)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import { sql } from '@vercel/postgres';
import crypto from 'crypto';

// Session configuration (must match api/_lib/session.js)
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_LENGTH = 64;

function generateSessionToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createTestSession() {
  console.log('========================================');
  console.log('CREATE TEST SESSION');
  console.log('========================================\n');

  // Test user details
  const testUser = {
    google_id: 'test_user_' + Date.now(),
    email: 'test@example.com',
    name: 'Test User',
    picture: null
  };

  try {
    // Check if test user already exists
    let userResult = await sql`
      SELECT * FROM users WHERE email = ${testUser.email}
    `;

    let user;
    if (userResult.rows.length === 0) {
      // Create test user
      console.log('Creating test user...');
      const newUser = await sql`
        INSERT INTO users (google_id, email, name, picture, profile_complete)
        VALUES (${testUser.google_id}, ${testUser.email}, ${testUser.name}, ${testUser.picture}, true)
        RETURNING *
      `;
      user = newUser.rows[0];
      console.log('✅ Created test user:', user.email);
    } else {
      user = userResult.rows[0];
      console.log('✅ Found existing test user:', user.email);
      
      // Update google_id if needed (in case it changed)
      if (!user.google_id || user.google_id.startsWith('test_user_')) {
        await sql`
          UPDATE users SET google_id = ${testUser.google_id} WHERE id = ${user.id}
        `;
        user.google_id = testUser.google_id;
      }
    }

    // Generate session token
    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    console.log('\nCreating session...');

    // Clear any existing sessions for this user
    await sql`DELETE FROM sessions WHERE google_id = ${user.google_id}`;

    // Create new session
    await sql`
      INSERT INTO sessions (token_hash, user_id, google_id, email, expires_at, created_at)
      VALUES (${tokenHash}, ${user.id}, ${user.google_id}, ${user.email}, ${expiresAt.toISOString()}, CURRENT_TIMESTAMP)
    `;

    console.log('✅ Session created\n');

    console.log('========================================');
    console.log('SESSION TOKEN (use this in tests):');
    console.log('========================================');
    console.log(`\n${token}\n`);
    console.log('========================================');
    console.log('USAGE IN TESTS:');
    console.log('========================================');
    console.log(`
// As a cookie:
Cookie: session_token=${token}

// As Authorization header:
Authorization: Bearer ${token}

// In fetch:
fetch(url, {
  headers: { 'Cookie': 'session_token=${token}' }
})
`);

    console.log('Expires:', expiresAt.toISOString());
    console.log('\nUser ID:', user.id);
    console.log('Google ID:', user.google_id);
    console.log('Email:', user.email);

    // Return the token for programmatic use
    return token;

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Export for use in other tests
export { createTestSession };

// Run if called directly
createTestSession().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

