import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 100, 60000); // 100 requests per minute
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const result = await sql`
      SELECT id, name, description, price, duration_minutes, session_count, features 
      FROM packages 
      WHERE is_active = true 
      ORDER BY price
    `;
    return res.status(200).json({ packages: result.rows });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch packages' });
  }
}
