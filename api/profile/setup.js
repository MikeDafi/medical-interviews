import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, phone, interviewExperience, targetSchools, currentConcerns } = req.body;

    // Update user profile
    await sql`
      UPDATE users SET
        phone = ${phone || null},
        interview_experience = ${interviewExperience || null},
        areas_to_improve = ${currentConcerns || null},
        profile_complete = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId} OR google_id = ${userId}
    `;

    // Get the actual user id if google_id was passed
    const userResult = await sql`
      SELECT id FROM users WHERE id = ${userId} OR google_id = ${userId}
    `;
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dbUserId = userResult.rows[0].id;

    // Delete existing target schools and add new ones
    await sql`DELETE FROM target_schools WHERE user_id = ${dbUserId}`;

    // Insert target schools
    for (let i = 0; i < targetSchools.length; i++) {
      const school = targetSchools[i];
      if (school.name) {
        await sql`
          INSERT INTO target_schools (user_id, school_name, interview_type, interview_date, priority)
          VALUES (${dbUserId}, ${school.name}, ${school.interviewType}, ${school.interviewDate || null}, ${i + 1})
        `;
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving profile:', error);
    return res.status(500).json({ error: error.message });
  }
}

