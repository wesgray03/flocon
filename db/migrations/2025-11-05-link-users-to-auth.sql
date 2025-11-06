-- Migration: Link users table to Supabase auth
-- Date: 2025-11-05
-- Purpose: Add auth_user_id to connect users to their authentication accounts

BEGIN;

-- Add auth_user_id column to link to Supabase auth.users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index on auth_user_id to ensure one user record per auth account
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Create index on email for auth lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users(email);

COMMIT;
