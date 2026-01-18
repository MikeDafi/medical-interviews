import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the 5 most recent bookings with user first name only (for privacy)
    const result = await sql`
      SELECT 
        b.id,
        SPLIT_PART(u.name, ' ', 1) as first_name,
        p.name as package_name,
        b.created_at
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN packages p ON b.package_id = p.id
      WHERE b.status != 'cancelled'
      ORDER BY b.created_at DESC
      LIMIT 5
    `;

    return res.status(200).json({ bookings: result.rows });
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    return res.status(500).json({ error: error.message });
  }
}

