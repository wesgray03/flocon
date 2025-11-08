-- Run this in Production Supabase SQL Editor to check what exists
-- https://supabase.com/dashboard/project/groxqyaoavmfvmaymhbe/sql

-- Check which tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'migration_history' THEN 'Migration tracking'
        WHEN table_name = 'project_task_completion' THEN 'NEW - Task completion per project'
        WHEN table_name = 'project_comments' THEN 'NEW - Comments feature'
        WHEN table_name = 'project_tasks' THEN 'NEW - Tasks system'
        WHEN table_name = 'users' THEN 'NEW - User management'
        WHEN table_name = 'contacts' THEN 'NEW - Contacts system'
        WHEN table_name = 'change_orders' THEN 'Updated - Change orders'
        WHEN table_name = 'pay_apps' THEN 'Updated - AIA pay apps'
        ELSE 'Existing table'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if migration_history table exists and what's been run
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_history')
        THEN 'migration_history table EXISTS'
        ELSE 'migration_history table MISSING - no migrations have been tracked'
    END as migration_status;

-- Check key columns in projects table to see what's been added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('stage_id', 'contract_amount', 'sharepoint_folder_url')
ORDER BY column_name;
