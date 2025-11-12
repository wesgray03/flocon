-- PRODUCTION DATABASE WIPE SCRIPT
-- ⚠️ WARNING: THIS WILL DELETE ALL DATA!
-- ⚠️ Make sure you have a backup before running this!

-- Step 1: Disable RLS temporarily to allow deletion
ALTER TABLE engagement_pay_apps DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_change_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_sov_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_task_completion DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_subcontractors DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagements DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_subcontractor_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_vendor_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Delete data (reverse order of foreign keys)
TRUNCATE TABLE engagement_pay_apps CASCADE;
TRUNCATE TABLE engagement_change_orders CASCADE;
TRUNCATE TABLE engagement_sov_lines CASCADE;
TRUNCATE TABLE engagement_comments CASCADE;
TRUNCATE TABLE engagement_task_completion CASCADE;
TRUNCATE TABLE engagement_tasks CASCADE;
TRUNCATE TABLE engagement_subcontractors CASCADE;
TRUNCATE TABLE engagement_user_roles CASCADE;
TRUNCATE TABLE engagement_parties CASCADE;
TRUNCATE TABLE engagements CASCADE;
TRUNCATE TABLE company_subcontractor_details CASCADE;
TRUNCATE TABLE company_vendor_details CASCADE;
TRUNCATE TABLE contacts CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE stages CASCADE;

-- Note: Leaving users table - managed by Supabase Auth
-- TRUNCATE TABLE users CASCADE;

-- Step 3: Re-enable RLS
ALTER TABLE engagement_pay_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_task_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subcontractor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_vendor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify all tables are empty
SELECT 'stages' as table_name, COUNT(*) as count FROM stages
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'engagements', COUNT(*) FROM engagements
UNION ALL SELECT 'engagement_parties', COUNT(*) FROM engagement_parties
UNION ALL SELECT 'engagement_user_roles', COUNT(*) FROM engagement_user_roles
UNION ALL SELECT 'engagement_subcontractors', COUNT(*) FROM engagement_subcontractors
UNION ALL SELECT 'engagement_tasks', COUNT(*) FROM engagement_tasks
UNION ALL SELECT 'engagement_task_completion', COUNT(*) FROM engagement_task_completion
UNION ALL SELECT 'engagement_comments', COUNT(*) FROM engagement_comments
UNION ALL SELECT 'engagement_change_orders', COUNT(*) FROM engagement_change_orders
UNION ALL SELECT 'engagement_pay_apps', COUNT(*) FROM engagement_pay_apps
ORDER BY table_name;
