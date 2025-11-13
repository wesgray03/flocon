-- Backfill linking of public.users to auth.users by email (case-insensitive)
-- Also ensure the auth trigger is correctly bound and function search_path is set.

BEGIN;

-- 0) Ensure trigger function exists and has safe search_path
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
BEGIN
  -- Link existing app user by email (case-insensitive)
  UPDATE public.users
     SET auth_user_id = NEW.id,
         name = COALESCE(public.users.name, v_name),
         updated_at = NOW()
   WHERE lower(email) = lower(NEW.email);

  IF FOUND THEN
    RETURN NEW; -- linked existing row
  END IF;

  -- If already linked by auth_user_id, just ensure name/email are set
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
$$;

-- 1) Ensure the trigger on auth.users points to this function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_auth_user();

-- 2) Backfill: link existing public.users rows (auth_user_id IS NULL) to auth.users by email
-- If multiple app users share the same email, link the lowest id only to avoid auth_user_id uniqueness conflicts.
WITH auth_by_email AS (
  SELECT au.id AS auth_id, lower(au.email) AS email_lower
  FROM auth.users au
),
candidates AS (
  SELECT pu.id AS user_id, abe.auth_id,
         ROW_NUMBER() OVER (PARTITION BY lower(pu.email) ORDER BY pu.id) AS rn
  FROM public.users pu
  JOIN auth_by_email abe ON lower(pu.email) = abe.email_lower
  WHERE pu.auth_user_id IS NULL
),
to_update AS (
  SELECT user_id, auth_id FROM candidates WHERE rn = 1
)
UPDATE public.users u
SET auth_user_id = t.auth_id,
    updated_at = NOW()
FROM to_update t
WHERE u.id = t.user_id;

COMMIT;
