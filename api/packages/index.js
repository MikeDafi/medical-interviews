import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await sql`
      SELECT * FROM packages 
      WHERE is_active = true 
      ORDER BY price ASC
    `;

    return res.status(200).json({ packages: result.rows });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({ error: 'Failed to fetch packages' });
  }
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await sql`
      SELECT * FROM packages 
      WHERE is_active = true 
      ORDER BY price ASC
    `;

    return res.status(200).json({ packages: result.rows });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({ error: 'Failed to fetch packages' });
  }
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await sql`
      SELECT * FROM packages 
      WHERE is_active = true 
      ORDER BY price ASC
    `;

    return res.status(200).json({ packages: result.rows });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({ error: 'Failed to fetch packages' });
  }
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await sql`
      SELECT * FROM packages 
      WHERE is_active = true 
      ORDER BY price ASC
    `;

    return res.status(200).json({ packages: result.rows });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({ error: 'Failed to fetch packages' });
  }
}

