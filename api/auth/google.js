import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    
    // Decode the Google JWT token
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    const { sub: googleId, email, name, picture } = payload;

    // Upsert user
    const result = await sql`
      INSERT INTO users (google_id, email, name, picture, updated_at)
      VALUES (${googleId}, ${email}, ${name}, ${picture}, CURRENT_TIMESTAMP)
      ON CONFLICT (google_id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        picture = EXCLUDED.picture,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, google_id, email, name, picture
    `;

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: error.message });
  }
}

