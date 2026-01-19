import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      // Get user-specific resources and global resources
      const result = await sql`
        SELECT * FROM resources 
        WHERE user_id = ${userId} OR is_global = true
        ORDER BY created_at DESC
      `;

      return res.status(200).json({ resources: result.rows });
    } catch (error) {
      console.error('Error fetching resources:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { userId, title, url, description, resourceType, isGlobal } = req.body;

      const result = await sql`
        INSERT INTO resources (user_id, title, url, description, resource_type, is_global)
        VALUES (${userId || null}, ${title}, ${url}, ${description || null}, ${resourceType || null}, ${isGlobal || false})
        RETURNING *
      `;

      return res.status(201).json({ resource: result.rows[0] });
    } catch (error) {
      console.error('Error creating resource:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

