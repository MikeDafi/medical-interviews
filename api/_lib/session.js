/**
 * Secure Server-Side Session Management
 * 
 * Uses cryptographically secure tokens stored in the database
 * to authenticate requests. Tokens are httpOnly cookies.
 */

// Load .env.local for local development
import './env.js';

import { sql } from '@vercel/postgres';
import crypto from 'crypto';

// Session configuration
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_LENGTH = 64; // 256 bits of entropy

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Hash a session token for secure storage
 * We store hashes, not plaintext tokens, so a DB breach doesn't compromise sessions
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session for a user
 * @param {Object} user - User data from Google OAuth
 * @returns {Object} { token, expiresAt }
 */
export async function createSession(user) {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  // Ensure sessions table exists and store the session
  await sql`
    INSERT INTO sessions (token_hash, user_id, google_id, email, expires_at, created_at)
    VALUES (${tokenHash}, ${user.dbId || null}, ${user.id}, ${user.email}, ${expiresAt.toISOString()}, CURRENT_TIMESTAMP)
  `;
  
  return { 
    token, 
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    }
  };
}

/**
 * Verify a session token and return the associated user
 * @param {string} token - The session token from cookie
 * @returns {Object|null} User data or null if invalid/expired
 */
export async function verifySession(token) {
  if (!token) return null;
  
  const tokenHash = hashToken(token);
  
  try {
    const result = await sql`
      SELECT s.*, u.id as db_user_id, u.email, u.name, u.picture, u.is_admin, u.google_id
      FROM sessions s
      LEFT JOIN users u ON s.google_id = u.google_id
      WHERE s.token_hash = ${tokenHash}
        AND s.expires_at > CURRENT_TIMESTAMP
    `;
    
    if (result.rows.length === 0) return null;
    
    const session = result.rows[0];
    return {
      sessionId: session.id,
      userId: session.db_user_id,
      googleId: session.google_id,
      email: session.email,
      name: session.name,
      picture: session.picture,
      isAdmin: session.is_admin || false
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Invalidate a session (logout)
 * @param {string} token - The session token
 */
export async function invalidateSession(token) {
  if (!token) return;
  
  const tokenHash = hashToken(token);
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
}

/**
 * Invalidate all sessions for a user (security measure)
 * @param {string} googleId - User's Google ID
 */
export async function invalidateAllUserSessions(googleId) {
  await sql`DELETE FROM sessions WHERE google_id = ${googleId}`;
}

/**
 * Clean up expired sessions (call periodically)
 */
export async function cleanupExpiredSessions() {
  await sql`DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP`;
}

/**
 * Extract session token from request
 * Checks httpOnly cookie first, then Authorization header as fallback
 */
export function getTokenFromRequest(req) {
  // Try httpOnly cookie first (most secure)
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies.session_token) {
    return cookies.session_token;
  }
  
  // Fallback to Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  return null;
}

/**
 * Simple cookie parser
 */
function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  
  return cookies;
}

/**
 * Set session cookie in response
 * @param {Object} res - Response object
 * @param {string} token - Session token
 * @param {Date} expiresAt - Expiration date
 */
export function setSessionCookie(res, token, expiresAt) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  const cookieOptions = [
    `session_token=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expiresAt.toUTCString()}`,
    isProduction ? 'Secure' : ''
  ].filter(Boolean).join('; ');
  
  res.setHeader('Set-Cookie', cookieOptions);
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

/**
 * Middleware-style function to verify session and attach user to request
 * Returns { authenticated, user, error }
 */
export async function requireAuth(req, options = {}) {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    return { authenticated: false, user: null, error: 'No session token provided' };
  }
  
  const user = await verifySession(token);
  
  if (!user) {
    return { authenticated: false, user: null, error: 'Invalid or expired session' };
  }
  
  // Check admin requirement
  if (options.requireAdmin && !user.isAdmin) {
    return { authenticated: false, user, error: 'Admin access required' };
  }
  
  // Check ownership if required
  if (options.requireUserId && user.userId !== options.requireUserId) {
    if (!user.isAdmin) {
      return { authenticated: false, user, error: 'Access denied - not owner' };
    }
  }
  
  return { authenticated: true, user, error: null };
}

