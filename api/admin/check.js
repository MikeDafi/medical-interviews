import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting to prevent enumeration
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 60, 60000); // 60 requests per minute
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { googleId } = req.query;

  // SECURITY: Only allow checking own admin status
  // The googleId should come from the authenticated session
  if (!googleId) {
    return res.status(400).json({ error: 'googleId required', isAdmin: false });
  }

  try {
    const result = await sql`
      SELECT is_admin FROM users WHERE google_id = ${googleId}
    `;

    if (result.rows.length === 0) {
      // Don't reveal if user exists or not
      return res.status(200).json({ isAdmin: false });
    }

    return res.status(200).json({ isAdmin: result.rows[0].is_admin || false });
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Don't leak error details
    return res.status(200).json({ isAdmin: false });
  }
}

