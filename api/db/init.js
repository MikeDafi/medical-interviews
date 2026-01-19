import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create users table (includes profile + purchases)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        phone VARCHAR(50),
        application_stage VARCHAR(100),
        main_concerns TEXT,
        target_schools JSONB DEFAULT '[]',
        purchases JSONB DEFAULT '[]',
        resources JSONB DEFAULT '[]',
        profile_complete BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create packages table
    await sql`
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        session_count INTEGER DEFAULT 1,
        features JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert default packages if they don't exist
    await sql`
      INSERT INTO packages (name, description, price, duration_minutes, session_count, features)
      SELECT '30 Min Trial', 'Try it out session', 30.00, 30, 1, '["Brief introduction & assessment", "One MMI question practice", "7 min timed response", "Immediate feedback"]'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = '30 Min Trial')
    `;

    await sql`
      INSERT INTO packages (name, description, price, duration_minutes, session_count, features)
      SELECT '1 Hour Session', 'Full prep session', 100.00, 60, 1, '["Full prep & coaching", "MMI or traditional practice", "Detailed feedback", "Take-home notes"]'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = '1 Hour Session')
    `;

    await sql`
      INSERT INTO packages (name, description, price, duration_minutes, session_count, features)
      SELECT 'Package of 3', 'Three session package', 250.00, 60, 3, '["3 one-hour sessions", "Progressive skill building", "Beginner to Advanced", "Comprehensive feedback"]'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Package of 3')
    `;

    await sql`
      INSERT INTO packages (name, description, price, duration_minutes, session_count, features)
      SELECT 'Package of 5', 'Premium five session package', 450.00, 60, 5, '["5 one-hour sessions", "Full mastery program", "Take-home questions", "Priority scheduling", "Session recordings"]'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Package of 5')
    `;

    // Insert admin user
    await sql`
      INSERT INTO users (google_id, email, name, is_admin)
      SELECT '106108496620102922676', 'premedical1on1@gmail.com', 'Ashley Kumar', true
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'premedical1on1@gmail.com')
    `;

    return res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ error: error.message });
  }
}
