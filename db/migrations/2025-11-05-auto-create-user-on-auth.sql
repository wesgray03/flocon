-- Migration: Auto-create user records on authentication
-- Date: 2025-11-05
-- Purpose: Automatically create user record when someone signs in via Supabase auth

BEGIN;

-- Function to auto-create user record from auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists in users table
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id = NEW.id
  ) THEN
    -- Create user record with email from auth metadata
    INSERT INTO public.users (auth_user_id, name, email, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'New User'),
      NEW.email,
      'Admin' -- Default new users to Admin, can be changed manually
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to auto-create user records
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;
