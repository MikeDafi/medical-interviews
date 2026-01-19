import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';

// Input validation helpers
const sanitizeString = (str, maxLength = 500) => {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).trim();
};

const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  // Only allow digits, spaces, dashes, parentheses, plus
  return phone.replace(/[^\d\s\-\(\)\+]/g, '').slice(0, 20);
};

const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email.toLowerCase().trim() : '';
};

const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return url.slice(0, 500);
  } catch {
    return '';
  }
};

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

  try {
    const { googleId, email, name, picture, phone, applicationStage, targetSchools, concerns, resources } = req.body;

    // SECURITY: Validate and sanitize all inputs
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const cleanGoogleId = sanitizeString(googleId, 100);
    const cleanName = sanitizeString(name, 100);
    const cleanPicture = sanitizeUrl(picture);
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
    let user = await sql`SELECT * FROM users WHERE email = ${cleanEmail}`;
    
    if (user.rows.length === 0 && cleanGoogleId) {
      user = await sql`SELECT * FROM users WHERE google_id = ${cleanGoogleId}`;
    }

    if (user.rows.length === 0) {
      // Create new user
      await sql`
        INSERT INTO users (google_id, email, name, picture, phone, application_stage, target_schools, main_concerns, resources, profile_complete)
        VALUES (
          ${cleanGoogleId}, 
          ${cleanEmail}, 
          ${cleanName}, 
          ${cleanPicture}, 
          ${cleanPhone}, 
          ${cleanApplicationStage}, 
          ${JSON.stringify(cleanTargetSchools)}::jsonb, 
          ${cleanConcerns}, 
          ${JSON.stringify(cleanResources)}::jsonb,
          true
        )
      `;
    } else {
      // SECURITY: Verify the googleId matches if user exists (prevent hijacking)
      const existingUser = user.rows[0];
      if (existingUser.google_id && cleanGoogleId && existingUser.google_id !== cleanGoogleId) {
        return res.status(403).json({ error: 'Account mismatch' });
      }

      // Update existing user
      await sql`
        UPDATE users SET
          google_id = COALESCE(${cleanGoogleId}, google_id),
          name = COALESCE(${cleanName}, name),
          picture = COALESCE(${cleanPicture}, picture),
          phone = ${cleanPhone},
          application_stage = ${cleanApplicationStage},
          target_schools = ${JSON.stringify(cleanTargetSchools)}::jsonb,
          main_concerns = ${cleanConcerns},
          resources = ${JSON.stringify(cleanResources)}::jsonb,
          profile_complete = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = ${cleanEmail}
      `;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Profile setup error:', error);
    return res.status(500).json({ error: 'Failed to save profile' });
  }
}
