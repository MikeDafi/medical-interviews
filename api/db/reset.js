import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Drop all old tables
    await sql`DROP TABLE IF EXISTS user_packages CASCADE`;
    await sql`DROP TABLE IF EXISTS bookings CASCADE`;
    await sql`DROP TABLE IF EXISTS target_schools CASCADE`;
    await sql`DROP TABLE IF EXISTS resources CASCADE`;
    await sql`DROP TABLE IF EXISTS profiles CASCADE`;
    await sql`DROP TABLE IF EXISTS reviews CASCADE`;
    await sql`DROP TABLE IF EXISTS availability CASCADE`;
    await sql`DROP TABLE IF EXISTS blocked_dates CASCADE`;
    await sql`DROP TABLE IF EXISTS packages CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;

    return res.status(200).json({ message: 'All tables dropped' });
  } catch (error) {
    console.error('Reset error:', error);
    return res.status(500).json({ error: error.message });
  }
}
