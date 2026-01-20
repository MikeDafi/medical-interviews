/**
 * Unified Auth API
 * Handles: session check, logout, OAuth callback, and legacy google auth
 */

import { sql } from '@vercel/postgres';
import { rateLimit } from '../_lib/auth.js';
import { sanitizeString, sanitizeEmail, sanitizeUrl } from '../_lib/sanitize.js';
import { 
  createSession, 
  setSessionCookie, 
  verifySession, 
  invalidateSession, 
  getTokenFromRequest, 
  clearSessionCookie 
} from '../_lib/session.js';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Google-specific URL sanitizer
const sanitizeGooglePictureUrl = (url) => {
  return sanitizeUrl(url, { allowedHosts: ['googleusercontent.com', 'google.com'] });
};

// Get redirect URI based on environment
function getRedirectUri(req) {
  const host = req.headers.host;
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/api/auth/callback`;
}

export default async function handler(req, res) {
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 30, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { action } = req.query;

  // ============ SESSION CHECK (GET ?action=session) ============
  if (action === 'session' && req.method === 'GET') {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return res.status(200).json({ authenticated: false, user: null });
    }

    const user = await verifySession(token);
    
    if (!user) {
      clearSessionCookie(res);
      return res.status(200).json({ authenticated: false, user: null });
    }

    try {
      const userResult = await sql`
        SELECT id, email, name, picture, is_admin, profile_complete, application_stage, phone
        FROM users WHERE google_id = ${user.googleId}
      `;

      if (userResult.rows.length > 0) {
        const dbUser = userResult.rows[0];
        return res.status(200).json({
          authenticated: true,
          user: {
            id: user.googleId,
            dbId: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            picture: dbUser.picture,
            isAdmin: dbUser.is_admin || false,
            profileComplete: dbUser.profile_complete || false
          }
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }

    return res.status(200).json({
      authenticated: true,
      user: { id: user.googleId, email: user.email, name: user.name, picture: user.picture, isAdmin: false, profileComplete: false }
    });
  }

  // ============ LOGOUT (DELETE ?action=session) ============
  if (action === 'session' && req.method === 'DELETE') {
    const token = getTokenFromRequest(req);
    if (token) {
      await invalidateSession(token);
    }
    clearSessionCookie(res);
    return res.status(200).json({ success: true, message: 'Logged out' });
  }

  // ============ OAUTH CALLBACK (GET ?action=callback) ============
  if (action === 'callback' && req.method === 'GET') {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect('/?auth_error=oauth_denied');
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    try {
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
      } catch {
        return res.status(400).json({ error: 'Invalid state' });
      }

      const { verifier } = stateData;
      if (!verifier) {
        return res.status(400).json({ error: 'Missing PKCE verifier' });
      }

      // Exchange code for tokens
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
        console.error('Token exchange failed:', await tokenResponse.json());
        return res.redirect('/?auth_error=token_exchange_failed');
      }

      const tokens = await tokenResponse.json();

      // Fetch user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });

      if (!userInfoResponse.ok) {
        return res.redirect('/?auth_error=user_info_failed');
      }

      const googleUser = await userInfoResponse.json();

      if (!googleUser.id || !googleUser.email || !googleUser.verified_email) {
        return res.redirect('/?auth_error=invalid_user_data');
      }

      // Find or create user
      let userResult = await sql`SELECT * FROM users WHERE google_id = ${googleUser.id}`;

      if (userResult.rows.length === 0) {
        userResult = await sql`SELECT * FROM users WHERE email = ${googleUser.email.toLowerCase()}`;
        if (userResult.rows.length > 0) {
          await sql`UPDATE users SET google_id = ${googleUser.id}, updated_at = CURRENT_TIMESTAMP WHERE id = ${userResult.rows[0].id}`;
        }
      }

      let dbUser;
      if (userResult.rows.length === 0) {
        const newUser = await sql`
          INSERT INTO users (google_id, email, name, picture, profile_complete)
          VALUES (${googleUser.id}, ${googleUser.email.toLowerCase()}, ${googleUser.name}, ${googleUser.picture}, false)
          RETURNING *
        `;
        dbUser = newUser.rows[0];
      } else {
        dbUser = userResult.rows[0];
        if (googleUser.picture && googleUser.picture !== dbUser.picture) {
          await sql`UPDATE users SET picture = ${googleUser.picture}, updated_at = CURRENT_TIMESTAMP WHERE id = ${dbUser.id}`;
        }
      }

      // Create session
      const { token, expiresAt } = await createSession({
        dbId: dbUser.id,
        id: googleUser.id,
        email: googleUser.email.toLowerCase(),
        name: googleUser.name,
        picture: googleUser.picture
      });

      setSessionCookie(res, token, expiresAt);
      res.redirect(`/?auth=success&profile_complete=${dbUser.profile_complete ? 'true' : 'false'}`);

    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/?auth_error=server_error');
    }
    return;
  }

  // ============ LEGACY GOOGLE AUTH (POST - no action) ============
  if (req.method === 'POST' && !action) {
    try {
      const { userData } = req.body;
      
      if (!userData || !userData.email) {
        return res.status(400).json({ error: 'Invalid user data' });
      }

      const cleanEmail = sanitizeEmail(userData.email);
      if (!cleanEmail) {
        return res.status(400).json({ error: 'Invalid email' });
      }

      const cleanGoogleId = sanitizeString(userData.id, 100);
      const cleanName = sanitizeString(userData.name, 100);
      const cleanPicture = sanitizeGooglePictureUrl(userData.picture);

      if (!cleanGoogleId) {
        return res.status(400).json({ error: 'Invalid Google ID' });
      }

      const result = await sql`
        INSERT INTO users (google_id, email, name, picture, updated_at)
        VALUES (${cleanGoogleId}, ${cleanEmail}, ${cleanName}, ${cleanPicture}, CURRENT_TIMESTAMP)
        ON CONFLICT (google_id) 
        DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture, updated_at = CURRENT_TIMESTAMP
        RETURNING id, email, name, picture, profile_complete
      `;

      const user = result.rows[0];
      return res.status(200).json({ 
        user: { id: user.id, email: user.email, name: user.name, picture: user.picture, profile_complete: user.profile_complete }
      });
    } catch {
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

