-- Vercel Postgres Schema for Medical Interview Prep
-- Run this in your Vercel Postgres console

-- Users table (extended with profile fields)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  picture TEXT,
  phone VARCHAR(50),
  profile_complete BOOLEAN DEFAULT FALSE,
  current_level VARCHAR(50) DEFAULT 'beginner',
  interview_experience TEXT,
  strengths TEXT,
  areas_to_improve TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Target schools table
CREATE TABLE IF NOT EXISTS target_schools (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  school_name VARCHAR(255) NOT NULL,
  interview_type VARCHAR(50), -- 'MMI', 'Traditional', 'Both'
  interview_date DATE,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages table
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

-- User packages (purchased packages with session tracking)
CREATE TABLE IF NOT EXISTS user_packages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES packages(id),
  sessions_total INTEGER NOT NULL,
  sessions_used INTEGER DEFAULT 0,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active'
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES packages(id),
  user_package_id INTEGER REFERENCES user_packages(id),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  zoom_link TEXT,
  notes TEXT,
  coach_notes TEXT,
  session_recording_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session feedback (coach feedback after each session)
CREATE TABLE IF NOT EXISTS session_feedback (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
  ethics_score INTEGER CHECK (ethics_score BETWEEN 1 AND 5),
  empathy_score INTEGER CHECK (empathy_score BETWEEN 1 AND 5),
  structure_score INTEGER CHECK (structure_score BETWEEN 1 AND 5),
  self_awareness_score INTEGER CHECK (self_awareness_score BETWEEN 1 AND 5),
  overall_notes TEXT,
  strengths TEXT,
  areas_to_improve TEXT,
  take_home_tasks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resources (links shared with users)
CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  resource_type VARCHAR(50), -- 'video', 'article', 'document', 'practice_question'
  is_global BOOLEAN DEFAULT FALSE, -- if true, visible to all users
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Availability table (for admin to set available times)
CREATE TABLE IF NOT EXISTS availability (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE
);

-- Blocked dates (for vacations, etc.)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id SERIAL PRIMARY KEY,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews/Testimonials
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  school_accepted VARCHAR(255),
  is_featured BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default packages
INSERT INTO packages (name, description, price, duration_minutes, session_count, features) VALUES
('30 Min Trial', 'Try it out session', 30.00, 30, 1, '["Brief introduction & assessment", "One MMI question practice", "7 min timed response", "Immediate feedback"]'),
('1 Hour Session', 'Full prep session', 100.00, 60, 1, '["Full prep & coaching", "MMI or traditional practice", "Detailed feedback", "Take-home notes"]'),
('Package of 3', 'Three session package', 250.00, 60, 3, '["3 one-hour sessions", "Progressive skill building", "Beginner to Advanced", "Comprehensive feedback"]'),
('Package of 5', 'Premium five session package', 450.00, 60, 5, '["5 one-hour sessions", "Full mastery program", "Take-home questions", "Priority scheduling", "Session recordings"]')
ON CONFLICT DO NOTHING;

-- Insert default availability (Mon-Fri, 9am-5pm)
INSERT INTO availability (day_of_week, start_time, end_time) VALUES
(1, '09:00', '17:00'),
(2, '09:00', '17:00'),
(3, '09:00', '17:00'),
(4, '09:00', '17:00'),
(5, '09:00', '17:00')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_target_schools_user_id ON target_schools(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_user_id ON session_feedback(user_id);
