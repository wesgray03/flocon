-- DROP ALL FLOCON TABLES
-- ⚠️ WARNING: THIS WILL DELETE ALL TABLES AND DATA!
-- ⚠️ Run wipe-production-database-safe.sql first to clear data cleanly

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS projects_v CASCADE;
DROP VIEW IF EXISTS prospects_v CASCADE;
DROP VIEW IF EXISTS vendors_view CASCADE;
DROP VIEW IF EXISTS subcontractors_view CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS engagement_pay_apps CASCADE;
DROP TABLE IF EXISTS engagement_change_orders CASCADE;
DROP TABLE IF EXISTS engagement_sov_lines CASCADE;
DROP TABLE IF EXISTS engagement_comments CASCADE;
DROP TABLE IF EXISTS engagement_task_completion CASCADE;
DROP TABLE IF EXISTS engagement_tasks CASCADE;
DROP TABLE IF EXISTS engagement_subcontractors CASCADE;
DROP TABLE IF EXISTS engagement_user_roles CASCADE;
DROP TABLE IF EXISTS engagement_parties CASCADE;
DROP TABLE IF EXISTS engagements CASCADE;
DROP TABLE IF EXISTS company_subcontractor_details CASCADE;
DROP TABLE IF EXISTS company_vendor_details CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS stages CASCADE;

-- Note: Keep users table if managed by Supabase Auth
-- DROP TABLE IF EXISTS users CASCADE;

-- Verify tables are gone
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%engagement%' 
   OR tablename IN ('companies', 'contacts', 'stages', 'users')
ORDER BY tablename;

-- If query returns empty, all tables are dropped ✅
