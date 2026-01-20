import { sql } from '@vercel/postgres';
import { requireAuth } from '../lib/session.js';
import { rateLimit } from '../lib/auth.js';

export default async function handler(req, res) {
  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 60, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (req.method === 'GET') {
    // SECURITY: Require authenticated session
    const { authenticated, user: sessionUser, error } = await requireAuth(req);
    
    if (!authenticated) {
      return res.status(401).json({ error: error || 'Authentication required' });
    }

    try {
      // User can only fetch their own profile (unless admin)
      const targetGoogleId = req.query.googleId || sessionUser.googleId;
      
      // SECURITY: Non-admins can only access their own profile
      if (targetGoogleId !== sessionUser.googleId && !sessionUser.isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = await sql`
        SELECT * FROM users WHERE google_id = ${targetGoogleId}
      `;

      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const profile = user.rows[0];
      
      // Calculate session totals from purchases JSON
      const purchases = profile.purchases || [];
      let thirtyMinSessions = 0;
      let sixtyMinSessions = 0;
      
      purchases.forEach(p => {
        if (p.status !== 'active') return;
        const remaining = (p.sessions_total || 0) - (p.sessions_used || 0);
        if (remaining <= 0) return;
        
        const duration = p.duration_minutes || 60;
        if (duration === 30) {
          thirtyMinSessions += remaining;
        } else {
          sixtyMinSessions += remaining;
        }
      });

      // SECURITY: Don't expose sensitive fields
      const safeProfile = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        phone: profile.phone,
        application_stage: profile.application_stage,
        target_schools: profile.target_schools,
        main_concerns: profile.main_concerns,
        resources: profile.resources,
        purchases: profile.purchases,
        profile_complete: profile.profile_complete,
        created_at: profile.created_at,
        thirty_min_sessions: thirtyMinSessions,
        sixty_min_sessions: sixtyMinSessions
        // Intentionally NOT including: google_id, is_admin
      };

      return res.status(200).json({ profile: safeProfile });
    } catch (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  if (req.method === 'DELETE') {
    // SECURITY: Require authenticated session
    const { authenticated, user: sessionUser, error } = await requireAuth(req);
    
    if (!authenticated) {
      return res.status(401).json({ error: error || 'Authentication required' });
    }

    try {
      const { confirmEmail } = req.query;
      
      // SECURITY: Require email confirmation to delete
      if (!confirmEmail) {
        return res.status(400).json({ error: 'Email confirmation required' });
      }

      // SECURITY: User can only delete their own account
      if (confirmEmail !== sessionUser.email) {
        return res.status(403).json({ error: 'Email confirmation does not match' });
      }

      // Delete user (sessions will cascade delete)
      await sql`DELETE FROM users WHERE google_id = ${sessionUser.googleId} AND email = ${confirmEmail}`;
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Profile delete error:', error);
      return res.status(500).json({ error: 'Failed to delete profile' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
