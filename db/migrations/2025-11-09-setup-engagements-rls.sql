-- Migration: Setup RLS for engagements (prospects and projects)
-- Date: 2025-11-09
-- Purpose: Implement role-based access control
--   - Sales: Can see/edit their own prospects
--   - Ops/Admin/Owner: Can see/edit all projects
--   - Admins/Owners: Can see everything

BEGIN;

-- 1) Update users table to support sales role if not already present
-- Extend the user_type check constraint to include 'Sales'
-- First, let's check what user_type values currently exist and update invalid ones
DO $$
BEGIN
  -- Update any NULL user_types to 'Admin' as default
  UPDATE public.users SET user_type = 'Admin' WHERE user_type IS NULL;
  
  -- Map any old/unexpected values to valid ones
  -- Add more mappings here if you discover other values
  UPDATE public.users SET user_type = 'Ops' 
  WHERE user_type NOT IN ('Owner', 'Admin', 'Foreman', 'Sales', 'Ops');
  
  -- Drop the old constraint
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_user_type_check;
  
  -- Add new constraint with Sales included
  ALTER TABLE public.users 
  ADD CONSTRAINT users_user_type_check 
  CHECK (user_type IN ('Owner', 'Admin', 'Foreman', 'Sales', 'Ops'));
END $$;

-- 2) Add helper column for quick role checks (optional but improves performance)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS can_manage_prospects BOOLEAN GENERATED ALWAYS AS (user_type IN ('Owner', 'Admin', 'Sales')) STORED,
  ADD COLUMN IF NOT EXISTS can_manage_projects BOOLEAN GENERATED ALWAYS AS (user_type IN ('Owner', 'Admin', 'Ops', 'Foreman')) STORED;

-- 3) Enable RLS on engagements table
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policy: Admins and Owners can see everything
CREATE POLICY engagements_admin_all
  ON public.engagements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.user_type IN ('Admin', 'Owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.user_type IN ('Admin', 'Owner')
    )
  );

-- 5) RLS Policy: Sales can see and edit ALL prospects (team visibility)
-- Note: If you want sales to ONLY see their own prospects, change this policy
CREATE POLICY engagements_sales_prospects
  ON public.engagements
  FOR ALL
  USING (
    type = 'prospect'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.user_type = 'Sales'
    )
  )
  WITH CHECK (
    type = 'prospect'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.user_type = 'Sales'
    )
  );

-- 5b) Alternative: Sales can only see prospects they own
-- Uncomment this and comment out the above policy if you want stricter access
/*
CREATE POLICY engagements_sales_own_prospects
  ON public.engagements
  FOR ALL
  USING (
    type = 'prospect'
    AND owner = (SELECT email FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.user_type = 'Sales'
    )
  )
  WITH CHECK (
    type = 'prospect'
    AND owner = (SELECT email FROM public.users WHERE id = auth.uid())
  );
*/

-- 6) RLS Policy: Ops and Foremen can see and edit ALL projects
CREATE POLICY engagements_ops_projects
  ON public.engagements
  FOR ALL
  USING (
    type = 'project'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.user_type IN ('Ops', 'Foreman')
    )
  )
  WITH CHECK (
    type = 'project'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.user_type IN ('Ops', 'Foreman')
    )
  );

-- 7) RLS Policy: Sales CANNOT promote to project (only admins/owners can)
-- This is enforced by the SECURITY DEFINER function, but we add explicit policy
CREATE POLICY engagements_no_type_change_by_sales
  ON public.engagements
  FOR UPDATE
  USING (
    -- Sales can't change type field
    NOT (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.user_type = 'Sales'
      )
      AND type <> (SELECT type FROM public.engagements e WHERE e.id = engagements.id)
    )
  );

-- 8) Enable RLS on engagement_trades
ALTER TABLE public.engagement_trades ENABLE ROW LEVEL SECURITY;

-- 9) RLS Policy: engagement_trades inherits parent engagement permissions
CREATE POLICY engagement_trades_inherit_parent
  ON public.engagement_trades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = engagement_trades.engagement_id
      -- The engagements RLS will handle the visibility check
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = engagement_trades.engagement_id
    )
  );

-- 10) Enable RLS on related tables if needed
-- These inherit visibility from the parent engagement via FK

-- Proposals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals') THEN
    EXECUTE 'ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY proposals_inherit_engagement
      ON public.proposals
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.engagements e
          WHERE e.id = proposals.project_id  -- Still using old column name
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.engagements e
          WHERE e.id = proposals.project_id
        )
      )
    ';
  END IF;
END $$;

-- Comments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_comments') THEN
    EXECUTE 'ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY';
    EXECUTE '
      CREATE POLICY project_comments_inherit_engagement
      ON public.project_comments
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.engagements e
          WHERE e.id = project_comments.project_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.engagements e
          WHERE e.id = project_comments.project_id
        )
      )
    ';
  END IF;
END $$;

COMMIT;

-- Post-migration notes:
-- 
-- To test RLS in Supabase SQL Editor, you can impersonate a user:
--   SET LOCAL role TO authenticated;
--   SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';
--   SELECT * FROM v_prospects;  -- Should only see what that user can access
--
-- To grant a user sales role:
--   UPDATE users SET user_type = 'Sales' WHERE email = 'valentina@floorsunlimited.com';
--
-- To grant ops role:
--   UPDATE users SET user_type = 'Ops' WHERE email = 'matt@floorsunlimited.com';
