-- Migration: Update user_type values from Owner/Admin/Foreman to Office/Field
-- Date: 2025-11-10

-- Step 1: Drop the old constraint first (to allow updates)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Step 2: Update existing users to new type system
-- Map Owner and Admin to Office, Foreman to Field
UPDATE users 
SET user_type = 'Office' 
WHERE user_type IN ('Owner', 'Admin');

UPDATE users 
SET user_type = 'Field' 
WHERE user_type = 'Foreman';

-- Step 3: Add new constraint with Office/Field values
ALTER TABLE users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('Office', 'Field'));

-- Update the auto-create trigger to default to Office
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    INSERT INTO public.users (auth_user_id, name, email, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      'Office' -- Default new users to Office, can be changed manually
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
