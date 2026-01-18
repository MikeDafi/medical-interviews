-- Vercel Postgres Schema for Medical Interview Prep
-- Run this in your Vercel Postgres console

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  picture TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES packages(id),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  zoom_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

