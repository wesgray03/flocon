-- Migration: Fix duplicate user creation on login
-- Date: 2025-11-13
-- Purpose: Prevent duplicate users by checking both auth_user_id AND email

BEGIN;

-- Update the trigger function to check by email as well
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists by auth_user_id OR email
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = NEW.id 
    OR email = NEW.email
  ) THEN
    INSERT INTO public.users (auth_user_id, name, email, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      'Office' -- Default new users to Office, can be changed manually
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  ELSE
    -- If user exists by email but has different auth_user_id, update the auth_user_id
    UPDATE public.users
    SET auth_user_id = NEW.id,
        updated_at = NOW()
    WHERE email = NEW.email 
    AND (auth_user_id IS NULL OR auth_user_id != NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
