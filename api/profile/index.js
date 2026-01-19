import { sql } from '@vercel/postgres';
import { rateLimit } from '../lib/auth.js';

export default async function handler(req, res) {
  // SECURITY: Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(clientIP, 60, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (req.method === 'GET') {
    try {
      const { userId, googleId, email, requestingUserId } = req.query;
      
      // SECURITY: User can only fetch their own profile
      // requestingUserId is the authenticated user making the request
      const authenticatedUserId = requestingUserId || googleId || userId;
      
      let user;
      
      if (googleId) {
        user = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
        if (user.rows.length === 0 && email) {
          user = await sql`SELECT * FROM users WHERE email = ${email}`;
          if (user.rows.length > 0) {
            // SECURITY: Only update google_id if emails match (user linking their account)
            await sql`UPDATE users SET google_id = ${googleId} WHERE id = ${user.rows[0].id}`;
          }
        }
      } else if (userId) {
        const isNumeric = /^\d+$/.test(userId);
        if (isNumeric && userId.length > 10) {
          user = await sql`SELECT * FROM users WHERE google_id = ${userId}`;
          if (user.rows.length === 0 && email) {
            user = await sql`SELECT * FROM users WHERE email = ${email}`;
            if (user.rows.length > 0) {
              await sql`UPDATE users SET google_id = ${userId} WHERE id = ${user.rows[0].id}`;
            }
          }
        } else if (email) {
          user = await sql`SELECT * FROM users WHERE email = ${email}`;
        }
      } else if (email) {
        user = await sql`SELECT * FROM users WHERE email = ${email}`;
      } else {
        return res.status(400).json({ error: 'userId, googleId, or email required' });
      }

      if (!user || user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const profile = user.rows[0];
      
      // SECURITY: Verify the requesting user can access this profile
      // Only allow if: same google_id, or same email, or user is admin
      const isSameUser = profile.google_id === authenticatedUserId || 
                         profile.email === email;
      
      if (!isSameUser) {
        // Check if requester is admin
        const adminCheck = await sql`SELECT is_admin FROM users WHERE google_id = ${authenticatedUserId}`;
        if (!adminCheck.rows[0]?.is_admin) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Calculate session totals from purchases JSON
      const purchases = profile.purchases || [];
      let trialSessions = 0;
      let regularSessions = 0;
      
      purchases.forEach(p => {
        if (p.type === 'trial') {
          trialSessions += (p.sessions_total - p.sessions_used);
        } else {
          regularSessions += (p.sessions_total - p.sessions_used);
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
        trial_sessions: trialSessions,
        regular_sessions: regularSessions
        // Intentionally NOT including: google_id, is_admin
      };

      return res.status(200).json({ profile: safeProfile });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { userId, confirmEmail } = req.query;
      
      // SECURITY: Require both userId and email confirmation to delete
      if (!userId || !confirmEmail) {
        return res.status(400).json({ error: 'userId and confirmEmail required' });
      }

      // SECURITY: Verify the user being deleted matches the requester
      const user = await sql`SELECT google_id, email FROM users WHERE google_id = ${userId}`;
      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // SECURITY: Email must match to confirm deletion
      if (user.rows[0].email !== confirmEmail) {
        return res.status(403).json({ error: 'Email confirmation does not match' });
      }

      await sql`DELETE FROM users WHERE google_id = ${userId} AND email = ${confirmEmail}`;
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to delete profile' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
