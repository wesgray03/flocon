-- Migration: Create users table
-- Date: 2025-11-05
-- Purpose: Track users with roles for project management and comments

BEGIN;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('Owner', 'Admin', 'Foreman')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Insert sample users for development
INSERT INTO users (name, email, user_type) VALUES
  ('John Smith', 'john@floorsunlimited.com', 'Owner'),
  ('Jane Doe', 'jane@floorsunlimited.com', 'Admin'),
  ('Mike Johnson', 'mike@floorsunlimited.com', 'Foreman')
ON CONFLICT (email) DO NOTHING;

COMMIT;
