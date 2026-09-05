// Load .env.local for local development
import '../_lib/env.js';

import { sql } from '@vercel/postgres';
import { requireAuth } from '../_lib/session.js';
import { rateLimit } from '../_lib/auth.js';
import { 
  sanitizeString, 
  sanitizeEmail, 
  sanitizeUrl, 
  sanitizePhone
} from '../_lib/sanitize.js';

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
    const { phone, applicationStage, targetSchools, concerns, resources, name, interviewLevel, interviewStyle } = req.body;

    // SECURITY: Use verified email from session, not from body
    const cleanEmail = sessionUser.email;
    const cleanGoogleId = sessionUser.googleId;

    // This endpoint is called both for full onboarding (all fields present) and for later
    // single-field partial edits from Profile.jsx (e.g. `{ concerns }` or `{ resources: [...] }`).
    // Every optional field below resolves to `null` when its key is absent from the request body,
    // and to its sanitized value (even if that's an empty string/array, meaning "clear it") when
    // present. The UPDATE below COALESCEs against the existing column so a partial save only
    // touches the field(s) actually sent, instead of blanking out everything else.
    const providedOrNull = (value, sanitizeFn) => (value !== undefined ? sanitizeFn(value) : null);

    // Sanitize inputs
    const cleanName = sanitizeString(name, 100) || sessionUser.name;
    const cleanPhone = providedOrNull(phone, sanitizePhone);
    const cleanApplicationStage = providedOrNull(applicationStage, v => sanitizeString(v, 50));
    const cleanConcerns = providedOrNull(concerns, v => sanitizeString(v, 1000));

    const ALLOWED_INTERVIEW_LEVELS = ['beginner', 'mid', 'advanced'];
    const ALLOWED_INTERVIEW_STYLES = ['MMI', 'traditional', 'both'];
    // Invalid values are dropped (treated the same as "not provided") rather than rejecting the
    // whole request, consistent with this file's existing lightweight-validation style.
    const cleanInterviewLevel = providedOrNull(interviewLevel, v => (ALLOWED_INTERVIEW_LEVELS.includes(v) ? v : null));
    const cleanInterviewStyle = providedOrNull(interviewStyle, v => (ALLOWED_INTERVIEW_STYLES.includes(v) ? v : null));

    // Sanitize target schools array (null when the key is absent - see providedOrNull above)
    const cleanTargetSchools = Array.isArray(targetSchools)
      ? targetSchools.slice(0, 10).map(school => ({
          name: sanitizeString(school.name, 100),
          interviewType: sanitizeString(school.interviewType, 50),
          interviewDate: sanitizeString(school.interviewDate, 20)
        }))
      : null;

    // Sanitize resources array (null when the key is absent - see providedOrNull above)
    const cleanResources = Array.isArray(resources)
      ? resources.slice(0, 20).map(r => ({
          title: sanitizeString(r.title, 100),
          url: sanitizeUrl(r.url)
        })).filter(r => r.title && r.url)
      : null;

    // Check if user exists
    let user = await sql`SELECT * FROM users WHERE google_id = ${cleanGoogleId}`;
    
    if (user.rows.length === 0) {
      // Try by email as fallback
      user = await sql`SELECT * FROM users WHERE email = ${cleanEmail}`;
    }

    if (user.rows.length === 0) {
      // Create new user (this shouldn't normally happen as user is already authenticated).
      // There's no existing row to COALESCE against here, so fall back to sensible blank
      // defaults for anything that wasn't provided.
      await sql`
        INSERT INTO users (
          google_id, email, name, phone, application_stage, target_schools, main_concerns,
          resources, interview_level, interview_style, profile_complete
        )
        VALUES (
          ${cleanGoogleId}, 
          ${cleanEmail}, 
          ${cleanName}, 
          ${cleanPhone ?? ''}, 
          ${cleanApplicationStage ?? ''}, 
          ${JSON.stringify(cleanTargetSchools ?? [])}::jsonb, 
          ${cleanConcerns ?? ''}, 
          ${JSON.stringify(cleanResources ?? [])}::jsonb,
          ${cleanInterviewLevel},
          ${cleanInterviewStyle},
          true
        )
      `;
    } else {
      // SECURITY: Verify the session google_id matches the user record
      const existingUser = user.rows[0];
      if (existingUser.google_id && existingUser.google_id !== cleanGoogleId) {
        return res.status(403).json({ error: 'Account mismatch' });
      }

      // Update existing user. Every optional field is COALESCEd against its existing column
      // value so a single-field partial save (the norm - see providedOrNull above) never wipes
      // out the others.
      await sql`
        UPDATE users SET
          google_id = COALESCE(${cleanGoogleId}, google_id),
          name = COALESCE(${cleanName}, name),
          phone = COALESCE(${cleanPhone}, phone),
          application_stage = COALESCE(${cleanApplicationStage}, application_stage),
          target_schools = COALESCE(${cleanTargetSchools !== null ? JSON.stringify(cleanTargetSchools) : null}::jsonb, target_schools),
          main_concerns = COALESCE(${cleanConcerns}, main_concerns),
          resources = COALESCE(${cleanResources !== null ? JSON.stringify(cleanResources) : null}::jsonb, resources),
          interview_level = COALESCE(${cleanInterviewLevel}, interview_level),
          interview_style = COALESCE(${cleanInterviewStyle}, interview_style),
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
