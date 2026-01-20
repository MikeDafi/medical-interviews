import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';
import { sanitizeString, sanitizeEmail, sanitizeUrl } from '../lib/sanitize.js';

// Google-specific URL sanitizer (only allows Google profile picture URLs)
const sanitizeGooglePictureUrl = (url) => {
  return sanitizeUrl(url, { 
    allowedHosts: ['googleusercontent.com', 'google.com'] 
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 20, 60000); // 20 auth attempts per minute
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const { userData } = req.body;
    
    if (!userData || !userData.email) {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    // SECURITY: Validate and sanitize all inputs
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

    // Upsert user
    const result = await sql`
      INSERT INTO users (google_id, email, name, picture, updated_at)
      VALUES (${cleanGoogleId}, ${cleanEmail}, ${cleanName}, ${cleanPicture}, CURRENT_TIMESTAMP)
      ON CONFLICT (google_id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        picture = EXCLUDED.picture,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, name, picture, profile_complete
    `;

    // SECURITY: Don't return sensitive fields like google_id
    const user = result.rows[0];
    return res.status(200).json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        profile_complete: user.profile_complete
      }
    });
  } catch {
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
