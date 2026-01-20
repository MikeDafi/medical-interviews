import { sql } from '@vercel/postgres';
import { requireAuth } from '../lib/session.js';
import { rateLimit } from '../lib/auth.js';
import { 
  sanitizeString, 
  sanitizeEmail, 
  sanitizeUrl, 
  sanitizePhone
} from '../lib/sanitize.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 10, 60000); // 10 profile setups per minute
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // SECURITY: Require authenticated session
  const { authenticated, user: sessionUser, error: authError } = await requireAuth(req);
  
  if (!authenticated) {
    return res.status(401).json({ error: authError || 'Authentication required' });
  }

  try {
    const { phone, applicationStage, targetSchools, concerns, resources, name } = req.body;

    // SECURITY: Use verified email from session, not from body
    const cleanEmail = sessionUser.email;
    const cleanGoogleId = sessionUser.googleId;

    // Sanitize inputs
    const cleanName = sanitizeString(name, 100) || sessionUser.name;
    const cleanPhone = sanitizePhone(phone);
    const cleanApplicationStage = sanitizeString(applicationStage, 50);
    const cleanConcerns = sanitizeString(concerns, 1000);

    // Sanitize target schools array
    const cleanTargetSchools = Array.isArray(targetSchools) 
      ? targetSchools.slice(0, 10).map(school => ({
          name: sanitizeString(school.name, 100),
          interviewType: sanitizeString(school.interviewType, 50),
          interviewDate: sanitizeString(school.interviewDate, 20)
        }))
      : [];

    // Sanitize resources array
    const cleanResources = Array.isArray(resources)
      ? resources.slice(0, 20).map(r => ({
          title: sanitizeString(r.title, 100),
          url: sanitizeUrl(r.url)
        })).filter(r => r.title && r.url)
      : [];

    // Check if user exists
    let user = await sql`SELECT * FROM users WHERE google_id = ${cleanGoogleId}`;
    
    if (user.rows.length === 0) {
      // Try by email as fallback
      user = await sql`SELECT * FROM users WHERE email = ${cleanEmail}`;
    }

    if (user.rows.length === 0) {
      // Create new user (this shouldn't normally happen as user is already authenticated)
      await sql`
        INSERT INTO users (google_id, email, name, phone, application_stage, target_schools, main_concerns, resources, profile_complete)
        VALUES (
          ${cleanGoogleId}, 
          ${cleanEmail}, 
          ${cleanName}, 
          ${cleanPhone}, 
          ${cleanApplicationStage}, 
          ${JSON.stringify(cleanTargetSchools)}::jsonb, 
          ${cleanConcerns}, 
          ${JSON.stringify(cleanResources)}::jsonb,
          true
        )
      `;
    } else {
      // SECURITY: Verify the session google_id matches the user record
      const existingUser = user.rows[0];
      if (existingUser.google_id && existingUser.google_id !== cleanGoogleId) {
        return res.status(403).json({ error: 'Account mismatch' });
      }

      // Update existing user
      await sql`
        UPDATE users SET
          google_id = COALESCE(${cleanGoogleId}, google_id),
          name = COALESCE(${cleanName}, name),
          phone = ${cleanPhone},
          application_stage = ${cleanApplicationStage},
          target_schools = ${JSON.stringify(cleanTargetSchools)}::jsonb,
          main_concerns = ${cleanConcerns},
          resources = ${JSON.stringify(cleanResources)}::jsonb,
          profile_complete = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existingUser.id}
      `;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Profile setup error:', error);
    return res.status(500).json({ error: 'Failed to save profile' });
  }
}
