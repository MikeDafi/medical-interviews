import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { googleId, email, name, picture, phone, applicationStage, targetSchools, concerns, resources } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Check if user exists
    let user = await sql`SELECT * FROM users WHERE email = ${email}`;
    
    if (user.rows.length === 0 && googleId) {
      user = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
    }

    if (user.rows.length === 0) {
      // Create new user
      await sql`
        INSERT INTO users (google_id, email, name, picture, phone, application_stage, target_schools, main_concerns, resources, profile_complete)
        VALUES (
          ${googleId}, 
          ${email}, 
          ${name}, 
          ${picture}, 
          ${phone}, 
          ${applicationStage}, 
          ${JSON.stringify(targetSchools || [])}::jsonb, 
          ${concerns}, 
          ${JSON.stringify(resources || [])}::jsonb,
          true
        )
      `;
    } else {
      // Update existing user
      await sql`
        UPDATE users SET
          google_id = COALESCE(${googleId}, google_id),
          name = COALESCE(${name}, name),
          picture = COALESCE(${picture}, picture),
          phone = ${phone},
          application_stage = ${applicationStage},
          target_schools = ${JSON.stringify(targetSchools || [])}::jsonb,
          main_concerns = ${concerns},
          resources = ${JSON.stringify(resources || [])}::jsonb,
          profile_complete = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = ${email}
      `;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Profile setup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
