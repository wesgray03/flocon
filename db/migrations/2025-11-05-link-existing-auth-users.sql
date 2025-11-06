-- Migration: Link existing auth users to user records
-- Date: 2025-11-05
-- Purpose: One-time script to connect existing auth accounts to existing user records by email

BEGIN;

-- Update existing users table records to link them to auth.users by matching email
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.email = a.email
  AND u.auth_user_id IS NULL;

COMMIT;
