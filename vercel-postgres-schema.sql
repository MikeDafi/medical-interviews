-- PreMedical 1-on-1 Database Schema (Simplified)
-- Only 2 tables needed!

-- Users table (includes profile + purchases)
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
);

-- Packages table (the 4 package types)
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
);

-- JSON Structure Examples:

-- purchases JSON array:
-- [
--   {
--     "id": "cs_xxx or manual_xxx",
--     "package_id": "trial|single|package3|package5",
--     "duration_minutes": 30 or 60,
--     "category": "interview|cv|advisory",
--     "sessions_total": 1,
--     "sessions_used": 0,
--     "purchase_date": "2024-01-01T00:00:00Z",
--     "status": "active|cancelled",
--     "bookings": [{ "id", "date", "time", "duration", "status", "booked_at" }]
--   }
-- ]

-- target_schools JSON array:
-- [
--   {
--     "name": "UCLA Medical School",
--     "interviewType": "MMI",
--     "interviewDate": "2024-03-15"
--   }
-- ]

-- resources JSON array:
-- [
--   {
--     "id": 123,
--     "title": "MMI Guide",
--     "url": "https://...",
--     "type": "user|coach"
--   }
-- ]
