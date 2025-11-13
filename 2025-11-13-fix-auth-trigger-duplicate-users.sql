-- Fix duplicate user creation by updating the auth trigger to match by email (case-insensitive)
-- and link existing rows instead of inserting a new one.
-- Also enforce a unique index on lower(email) to prevent case-variant duplicates.

BEGIN;

-- 1) Replace the trigger function used by auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name text := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
BEGIN
  -- First, try to link by case-insensitive email if a row already exists
  UPDATE public.users
     SET auth_user_id = NEW.id,
         name = COALESCE(public.users.name, v_name),
         updated_at = NOW()
   WHERE lower(email) = lower(NEW.email);

  IF FOUND THEN
    RETURN NEW; -- linked existing row
  END IF;

  -- Next, if a row already exists linked by auth_user_id, just ensure name/email are set
  UPDATE public.users
     SET email = COALESCE(public.users.email, NEW.email),
         name  = COALESCE(public.users.name, v_name),
         updated_at = NOW()
   WHERE auth_user_id = NEW.id;

  IF FOUND THEN
    RETURN NEW;
  END IF;

  -- Otherwise, insert a brand new user (default Office)
  INSERT INTO public.users (auth_user_id, name, email, user_type)
  VALUES (NEW.id, v_name, NEW.email, 'Office')
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Enforce case-insensitive uniqueness on email to prevent future duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_email_lower_unique'
  ) THEN
    CREATE UNIQUE INDEX users_email_lower_unique ON public.users ((lower(email)));
  END IF;
END $$;

COMMIT;
