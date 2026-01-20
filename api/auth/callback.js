/**
 * OAuth 2.0 Authorization Code Flow Callback Handler
 * 
 * This endpoint exchanges the authorization code for tokens,
 * verifies the user with Google, and creates a secure session.
 */

import { sql } from '@vercel/postgres';
import { createSession, setSessionCookie } from '../lib/session.js';
import { rateLimit } from '../lib/auth.js';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Get redirect URI based on environment
function getRedirectUri(req) {
  const host = req.headers.host;
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/api/auth/callback`;
}

export default async function handler(req, res) {
  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 20, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error: oauthError } = req.query;

  // Handle OAuth errors
  if (oauthError) {
    console.error('OAuth error:', oauthError);
    return res.redirect('/?auth_error=oauth_denied');
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  if (!state) {
    return res.status(400).json({ error: 'Missing state parameter' });
  }

  try {
    // Decode state which contains PKCE verifier and original state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    const { verifier, nonce } = stateData;
    
    if (!verifier) {
      return res.status(400).json({ error: 'Missing PKCE verifier' });
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: getRedirectUri(req)
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return res.redirect('/?auth_error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();

    // Fetch user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info');
      return res.redirect('/?auth_error=user_info_failed');
    }

    const googleUser = await userInfoResponse.json();

    // Validate required fields
    if (!googleUser.id || !googleUser.email) {
      return res.redirect('/?auth_error=invalid_user_data');
    }

    // Verify email is verified by Google
    if (!googleUser.verified_email) {
      return res.redirect('/?auth_error=email_not_verified');
    }

    // Find or create user in database
    let userResult = await sql`
      SELECT * FROM users WHERE google_id = ${googleUser.id}
    `;

    // If not found by google_id, try by email
    if (userResult.rows.length === 0) {
      userResult = await sql`
        SELECT * FROM users WHERE email = ${googleUser.email.toLowerCase()}
      `;
      
      // Link existing account by email to this Google ID
      if (userResult.rows.length > 0) {
        await sql`
          UPDATE users SET google_id = ${googleUser.id}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userResult.rows[0].id}
        `;
      }
    }

    let dbUser;
    if (userResult.rows.length === 0) {
      // Create new user
      const newUser = await sql`
        INSERT INTO users (google_id, email, name, picture, profile_complete)
        VALUES (${googleUser.id}, ${googleUser.email.toLowerCase()}, ${googleUser.name}, ${googleUser.picture}, false)
        RETURNING *
      `;
      dbUser = newUser.rows[0];
    } else {
      dbUser = userResult.rows[0];
      // Update profile picture if changed
      if (googleUser.picture && googleUser.picture !== dbUser.picture) {
        await sql`
          UPDATE users SET picture = ${googleUser.picture}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${dbUser.id}
        `;
      }
    }

    // Create secure session
    const { token, expiresAt, user } = await createSession({
      dbId: dbUser.id,
      id: googleUser.id,
      email: googleUser.email.toLowerCase(),
      name: googleUser.name,
      picture: googleUser.picture
    });

    // Set httpOnly session cookie
    setSessionCookie(res, token, expiresAt);

    // Redirect back to app with success
    const profileComplete = dbUser.profile_complete ? 'true' : 'false';
    res.redirect(`/?auth=success&profile_complete=${profileComplete}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/?auth_error=server_error');
  }
}

