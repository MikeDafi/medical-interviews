import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { userId, googleId } = req.query;
      
      let user;
      if (userId) {
        user = await sql`SELECT * FROM users WHERE id = ${userId}`;
      } else if (googleId) {
        user = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
      } else {
        return res.status(400).json({ error: 'userId or googleId required' });
      }

      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const profile = user.rows[0];

      // Get target schools
      const schools = await sql`
        SELECT * FROM target_schools WHERE user_id = ${profile.id} ORDER BY priority
      `;

      // Get active package
      const activePackage = await sql`
        SELECT up.*, p.name 
        FROM user_packages up
        JOIN packages p ON up.package_id = p.id
        WHERE up.user_id = ${profile.id} AND up.status = 'active'
        LIMIT 1
      `;

      return res.status(200).json({ 
        profile: {
          ...profile,
          target_schools: schools.rows,
          active_package: activePackage.rows[0] || null
        }
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

