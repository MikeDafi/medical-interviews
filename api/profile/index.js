import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { userId, googleId, email } = req.query;
      
      let user;
      
      if (googleId) {
        user = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
        if (user.rows.length === 0 && email) {
          user = await sql`SELECT * FROM users WHERE email = ${email}`;
          if (user.rows.length > 0) {
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

      return res.status(200).json({ 
        profile: {
          ...profile,
          trial_sessions: trialSessions,
          regular_sessions: regularSessions
        }
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { userId } = req.query;
      await sql`DELETE FROM users WHERE google_id = ${userId}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
