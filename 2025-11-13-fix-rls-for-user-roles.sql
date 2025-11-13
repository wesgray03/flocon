-- Ensure RLS policies exist so the app can read sales lead assignments
-- Applies to: engagement_user_roles, users, engagements (SELECT only)

BEGIN;

-- Enable RLS defensively (no-op if already enabled)
ALTER TABLE IF EXISTS public.engagement_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.engagements ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy for authenticated on engagement_user_roles if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'engagement_user_roles'
      AND polname = 'select_authenticated_all'
  ) THEN
    CREATE POLICY select_authenticated_all
      ON public.engagement_user_roles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create SELECT policy for authenticated on users if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND polname = 'select_authenticated_all'
  ) THEN
    CREATE POLICY select_authenticated_all
      ON public.users
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create SELECT policy for authenticated on engagements if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'engagements'
      AND polname = 'select_authenticated_all'
  ) THEN
    CREATE POLICY select_authenticated_all
      ON public.engagements
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

COMMIT;
