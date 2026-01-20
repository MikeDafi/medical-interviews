/**
 * Session Management Endpoints
 * 
 * GET - Verify current session and return user data
 * DELETE - Logout (invalidate session)
 */

import { sql } from '@vercel/postgres';
import { 
  verifySession, 
  invalidateSession, 
  getTokenFromRequest, 
  clearSessionCookie 
} from '../lib/session.js';
import { rateLimit } from '../lib/auth.js';

export default async function handler(req, res) {
  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 60, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const token = getTokenFromRequest(req);

  // GET - Verify session and return user data
  if (req.method === 'GET') {
    if (!token) {
      return res.status(200).json({ authenticated: false, user: null });
    }

    const user = await verifySession(token);
    
    if (!user) {
      clearSessionCookie(res);
      return res.status(200).json({ authenticated: false, user: null });
    }

    // Fetch full user profile if authenticated
    try {
      const userResult = await sql`
        SELECT id, email, name, picture, is_admin, profile_complete, 
               application_stage, phone
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

    // Return basic session data if DB query fails
    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isAdmin: user.isAdmin || false,
        profileComplete: false
      }
    });
  }

  // DELETE - Logout
  if (req.method === 'DELETE') {
    if (token) {
      await invalidateSession(token);
    }
    clearSessionCookie(res);
    return res.status(200).json({ success: true, message: 'Logged out' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

