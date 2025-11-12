-- PRODUCTION DATABASE WIPE SCRIPT (SAFE VERSION)
-- ⚠️ WARNING: THIS WILL DELETE ALL DATA!
-- ⚠️ Make sure you have a backup before running this!
-- This version only operates on tables that exist

-- Step 1: Disable RLS temporarily to allow deletion (only on existing tables)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_pay_apps') THEN
    ALTER TABLE engagement_pay_apps DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_change_orders') THEN
    ALTER TABLE engagement_change_orders DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_sov_lines') THEN
    ALTER TABLE engagement_sov_lines DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_comments') THEN
    ALTER TABLE engagement_comments DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_tasks') THEN
    ALTER TABLE engagement_tasks DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_task_completion') THEN
    ALTER TABLE engagement_task_completion DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_subcontractors') THEN
    ALTER TABLE engagement_subcontractors DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_user_roles') THEN
    ALTER TABLE engagement_user_roles DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_parties') THEN
    ALTER TABLE engagement_parties DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagements') THEN
    ALTER TABLE engagements DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'company_subcontractor_details') THEN
    ALTER TABLE company_subcontractor_details DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'company_vendor_details') THEN
    ALTER TABLE company_vendor_details DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'contacts') THEN
    ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'companies') THEN
    ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stages') THEN
    ALTER TABLE stages DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') THEN
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 2: Delete data (reverse order of foreign keys, only existing tables)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_pay_apps') THEN
    TRUNCATE TABLE engagement_pay_apps CASCADE;
    RAISE NOTICE 'Cleared: engagement_pay_apps';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_change_orders') THEN
    TRUNCATE TABLE engagement_change_orders CASCADE;
    RAISE NOTICE 'Cleared: engagement_change_orders';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_sov_lines') THEN
    TRUNCATE TABLE engagement_sov_lines CASCADE;
    RAISE NOTICE 'Cleared: engagement_sov_lines';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_comments') THEN
    TRUNCATE TABLE engagement_comments CASCADE;
    RAISE NOTICE 'Cleared: engagement_comments';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_task_completion') THEN
    TRUNCATE TABLE engagement_task_completion CASCADE;
    RAISE NOTICE 'Cleared: engagement_task_completion';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_tasks') THEN
    TRUNCATE TABLE engagement_tasks CASCADE;
    RAISE NOTICE 'Cleared: engagement_tasks';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_subcontractors') THEN
    TRUNCATE TABLE engagement_subcontractors CASCADE;
    RAISE NOTICE 'Cleared: engagement_subcontractors';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_user_roles') THEN
    TRUNCATE TABLE engagement_user_roles CASCADE;
    RAISE NOTICE 'Cleared: engagement_user_roles';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_parties') THEN
    TRUNCATE TABLE engagement_parties CASCADE;
    RAISE NOTICE 'Cleared: engagement_parties';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagements') THEN
    TRUNCATE TABLE engagements CASCADE;
    RAISE NOTICE 'Cleared: engagements';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'company_subcontractor_details') THEN
    TRUNCATE TABLE company_subcontractor_details CASCADE;
    RAISE NOTICE 'Cleared: company_subcontractor_details';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'company_vendor_details') THEN
    TRUNCATE TABLE company_vendor_details CASCADE;
    RAISE NOTICE 'Cleared: company_vendor_details';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'contacts') THEN
    TRUNCATE TABLE contacts CASCADE;
    RAISE NOTICE 'Cleared: contacts';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'companies') THEN
    TRUNCATE TABLE companies CASCADE;
    RAISE NOTICE 'Cleared: companies';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stages') THEN
    TRUNCATE TABLE stages CASCADE;
    RAISE NOTICE 'Cleared: stages';
  END IF;
  
  RAISE NOTICE '✅ All tables cleared successfully!';
END $$;

-- Step 3: Re-enable RLS (only on existing tables)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_pay_apps') THEN
    ALTER TABLE engagement_pay_apps ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_change_orders') THEN
    ALTER TABLE engagement_change_orders ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_sov_lines') THEN
    ALTER TABLE engagement_sov_lines ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_comments') THEN
    ALTER TABLE engagement_comments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_tasks') THEN
    ALTER TABLE engagement_tasks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_task_completion') THEN
    ALTER TABLE engagement_task_completion ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_subcontractors') THEN
    ALTER TABLE engagement_subcontractors ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_user_roles') THEN
    ALTER TABLE engagement_user_roles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagement_parties') THEN
    ALTER TABLE engagement_parties ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'engagements') THEN
    ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'company_subcontractor_details') THEN
    ALTER TABLE company_subcontractor_details ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'company_vendor_details') THEN
    ALTER TABLE company_vendor_details ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'contacts') THEN
    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'companies') THEN
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stages') THEN
    ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 4: Verify all tables are empty
DO $$
DECLARE
  rec RECORD;
  row_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TABLE ROW COUNTS ===';
  FOR rec IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'stages', 'users', 'companies', 'contacts', 'engagements',
      'engagement_parties', 'engagement_user_roles', 'engagement_subcontractors',
      'engagement_tasks', 'engagement_task_completion', 'engagement_comments',
      'engagement_change_orders', 'engagement_pay_apps', 'engagement_sov_lines',
      'company_vendor_details', 'company_subcontractor_details'
    )
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', rec.tablename) INTO row_count;
    RAISE NOTICE '% : % rows', RPAD(rec.tablename, 35, ' '), row_count;
  END LOOP;
END $$;
