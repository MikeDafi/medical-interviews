import { sql } from '@vercel/postgres';

// Admin config from environment (fallback for backwards compatibility)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'premedical1on1@gmail.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Ashley Kumar';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Only allow initialization with a secret key
  const initSecret = req.headers['x-init-secret'] || req.body?.initSecret;
  const expectedSecret = process.env.DB_INIT_SECRET;
  
  // In production, require the secret
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    if (!expectedSecret) {
      return res.status(500).json({ error: 'DB_INIT_SECRET not configured' });
    }
    if (initSecret !== expectedSecret) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
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

    // Create performance indexes for common query patterns
    // Index on email for login lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    
    // Index on google_id for OAuth lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
    
    // Index on created_at for recent users queries
    await sql`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)`;
    
    // Index on updated_at for recent activity queries
    await sql`CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC)`;
    
    // GIN index on purchases JSONB for efficient JSON queries (including subscription_id lookups)
    await sql`CREATE INDEX IF NOT EXISTS idx_users_purchases ON users USING GIN(purchases jsonb_path_ops)`;

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

    // Index on active packages (most common query)
    await sql`CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active) WHERE is_active = true`;

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

    // Insert admin user from environment config
    await sql`
      INSERT INTO users (email, name, is_admin)
      SELECT ${ADMIN_EMAIL}, ${ADMIN_NAME}, true
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ${ADMIN_EMAIL})
    `;

    return res.status(200).json({ 
      message: 'Database initialized successfully',
      tables: ['users', 'packages'],
      indexes: ['idx_users_email', 'idx_users_google_id', 'idx_users_created_at', 'idx_users_updated_at', 'idx_users_purchases (GIN jsonb_path_ops)', 'idx_packages_active']
    });
  } catch (error) {
    // Log error for debugging but don't expose details
    console.error('DB init error:', error.message);
    return res.status(500).json({ error: 'Database initialization failed' });
  }
}
