import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT * FROM packages WHERE is_active = true ORDER BY price
      `;
      return res.status(200).json({ packages: result.rows });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

