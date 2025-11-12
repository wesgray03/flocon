-- Migration: Enable Row Level Security (RLS) for all tables
-- Date: 2025-11-08
-- Purpose: Enable RLS on all tables and create permissive policies for authenticated users
-- Note: This is a comprehensive migration to ensure all tables have RLS enabled

BEGIN;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

-- Core tables
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stages ENABLE ROW LEVEL SECURITY;

-- Legacy tables (deprecated - will be dropped in cleanup migration)
-- ALTER TABLE IF EXISTS public.managers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.owners ENABLE ROW LEVEL SECURITY;

-- Financial tables
ALTER TABLE IF EXISTS public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pay_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- SOV (Schedule of Values) tables
ALTER TABLE IF EXISTS public.sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sov_line_progress ENABLE ROW LEVEL SECURITY;

-- Project-related tables
ALTER TABLE IF EXISTS public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_task_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_subcontractors ENABLE ROW LEVEL SECURITY;

-- Vendor and subcontractor tables
ALTER TABLE IF EXISTS public.subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendors ENABLE ROW LEVEL SECURITY;

-- Comment mentions
ALTER TABLE IF EXISTS public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- Legacy/other tables
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE PERMISSIVE POLICIES FOR AUTHENTICATED USERS
-- ============================================================================
-- Note: These policies allow all authenticated users to perform all operations.
-- For production, you may want to implement more restrictive policies based on
-- user roles or ownership.

-- Drop old staging policies if they exist (to avoid conflicts)
DO $$ 
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    -- Drop old staging policies
    FOR pol IN 
      SELECT policyname FROM pg_policies 
      WHERE tablename = tbl AND policyname IN ('Allow public access in staging', 'Allow all for authenticated users')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- CREATE NEW POLICIES FOR ALL TABLES
-- ============================================================================

-- Helper function to create policy safely
CREATE OR REPLACE FUNCTION create_policy_safely(
  p_policy_name TEXT,
  p_table_name TEXT
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = p_table_name AND policyname = p_policy_name
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''authenticated'')',
      p_policy_name,
      p_table_name
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Core tables
SELECT create_policy_safely('Authenticated users full access', 'projects');
SELECT create_policy_safely('Authenticated users full access', 'users');
SELECT create_policy_safely('Authenticated users full access', 'contacts');
SELECT create_policy_safely('Authenticated users full access', 'customers');
SELECT create_policy_safely('Authenticated users full access', 'stages');

-- Legacy tables (deprecated - will be dropped)
-- SELECT create_policy_safely('Authenticated users full access', 'managers');
-- SELECT create_policy_safely('Authenticated users full access', 'owners');

-- Financial tables
SELECT create_policy_safely('Authenticated users full access', 'change_orders');
SELECT create_policy_safely('Authenticated users full access', 'pay_apps');
SELECT create_policy_safely('Authenticated users full access', 'billings');
SELECT create_policy_safely('Authenticated users full access', 'proposals');
SELECT create_policy_safely('Authenticated users full access', 'purchase_orders');

-- SOV tables
SELECT create_policy_safely('Authenticated users full access', 'sov_lines');
SELECT create_policy_safely('Authenticated users full access', 'sov_line_progress');

-- Project-related tables (skip if they already have specific policies)
DO $$ 
BEGIN
  -- Only create if no specific policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_comments' 
    AND policyname IN ('Users can view all comments', 'Users can insert comments')
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users full access" ON public.project_comments FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_mentions' 
    AND policyname IN ('Users can view all mentions', 'Users can create mentions')
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users full access" ON public.comment_mentions FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_task_completion'
    AND policyname LIKE 'Users can%'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users full access" ON public.project_task_completion FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

SELECT create_policy_safely('Authenticated users full access', 'project_tasks');
SELECT create_policy_safely('Authenticated users full access', 'project_subcontractors');

-- Vendor and subcontractor tables
SELECT create_policy_safely('Authenticated users full access', 'subcontractors');
SELECT create_policy_safely('Authenticated users full access', 'vendors');

-- Legacy tables
SELECT create_policy_safely('Authenticated users full access', 'tasks');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Query to check RLS status (for verification)
DO $$
DECLARE
  tbl_count INTEGER;
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tbl_count
  FROM pg_tables
  WHERE schemaname = 'public';
  
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;
  
  RAISE NOTICE 'Total tables: %, Tables with RLS enabled: %', tbl_count, rls_count;
END $$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- This migration:
-- 1. Enables RLS on all tables in the public schema
-- 2. Creates permissive policies that allow all authenticated users full access
-- 3. Preserves existing specific policies for tables that have them
-- 4. Removes old staging-specific policies
--
-- For production use, consider implementing more restrictive policies based on:
-- - User roles (admin, foreman, owner)
-- - Resource ownership (users can only edit their own comments)
-- - Project membership (users can only see projects they're assigned to)
--
-- Example of more restrictive policy:
-- CREATE POLICY "Users can only view their projects"
--   ON public.projects FOR SELECT
--   USING (
--     auth.uid() IN (
--       SELECT auth_user_id FROM users 
--       WHERE users.id = projects.manager_id
--     )
--   );
