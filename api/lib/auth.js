import { sql } from '@vercel/postgres';

/**
 * Verify that a request is authenticated and optionally check ownership
 * 
 * @param {Request} req - The request object
 * @param {Object} options - Options for verification
 * @param {boolean} options.requireAdmin - Require admin privileges
 * @param {string} options.ownerGoogleId - Verify user owns this google_id
 * @returns {Object} { authenticated, user, error }
 */
export async function verifyAuth(req, options = {}) {
  // Get auth header or query params
  const authHeader = req.headers.authorization;
  const { googleId, email } = req.query || {};
  const bodyGoogleId = req.body?.googleId;
  const bodyEmail = req.body?.email;
  
  // Try to get user identifier from various sources
  const userGoogleId = authHeader?.replace('Bearer ', '') || googleId || bodyGoogleId;
  const userEmail = email || bodyEmail;
  
  if (!userGoogleId && !userEmail) {
    return { authenticated: false, user: null, error: 'Authentication required' };
  }

  try {
    // Look up user in database to verify they exist
    let user;
    if (userGoogleId) {
      user = await sql`SELECT id, google_id, email, is_admin FROM users WHERE google_id = ${userGoogleId}`;
    }
    if ((!user || user.rows.length === 0) && userEmail) {
      user = await sql`SELECT id, google_id, email, is_admin FROM users WHERE email = ${userEmail}`;
    }

    if (!user || user.rows.length === 0) {
      return { authenticated: false, user: null, error: 'User not found' };
    }

    const dbUser = user.rows[0];

    // Check admin requirement
    if (options.requireAdmin && !dbUser.is_admin) {
      return { authenticated: false, user: dbUser, error: 'Admin access required' };
    }

    // Check ownership if required
    if (options.ownerGoogleId && dbUser.google_id !== options.ownerGoogleId) {
      return { authenticated: false, user: dbUser, error: 'Access denied - not owner' };
    }

    return { authenticated: true, user: dbUser, error: null };
  } catch {
    return { authenticated: false, user: null, error: 'Authentication failed' };
  }
}

/**
 * Verify the requesting user matches the target user (for profile operations)
 */
export async function verifyOwnership(req, targetGoogleId) {
  const requestingGoogleId = req.headers.authorization?.replace('Bearer ', '') || 
                              req.query?.requestingUserId ||
                              req.body?.requestingUserId;
  
  if (!requestingGoogleId) {
    return { authorized: false, error: 'No requesting user ID provided' };
  }

  // User can only access their own data
  if (requestingGoogleId !== targetGoogleId) {
    // Check if requesting user is admin
    const admin = await sql`SELECT is_admin FROM users WHERE google_id = ${requestingGoogleId}`;
    if (admin.rows.length === 0 || !admin.rows[0].is_admin) {
      return { authorized: false, error: 'Access denied' };
    }
  }

  return { authorized: true, error: null };
}

/**
 * Simple rate limiting using in-memory store (use Redis in production)
 */
const rateLimitStore = new Map();

export function rateLimit(identifier, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get or create entry
  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = { requests: [], blocked: false };
    rateLimitStore.set(identifier, entry);
  }
  
  // Remove old requests outside window
  entry.requests = entry.requests.filter(time => time > windowStart);
  
  // Check if over limit
  if (entry.requests.length >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  // Add current request
  entry.requests.push(now);
  
  return { allowed: true, remaining: maxRequests - entry.requests.length };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.requests.every(time => time < now - 60000)) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

