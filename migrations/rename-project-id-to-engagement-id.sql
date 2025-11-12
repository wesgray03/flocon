-- =====================================================
-- Migration: Rename project_id to engagement_id
-- =====================================================
-- This migration renames the project_id column to engagement_id
-- in the remaining three tables that still use the old naming.
--
-- Tables to update:
-- 1. project_comments
-- 2. project_subcontractors  
-- 3. project_task_completion
--
-- Prerequisites:
-- - Frontend code has been updated to use engagement_id
-- - sov_lines, pay_apps, and change_orders already migrated
--
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PROJECT_COMMENTS TABLE
-- =====================================================

-- Rename the column
ALTER TABLE project_comments 
RENAME COLUMN project_id TO engagement_id;

-- Update the foreign key constraint name if it exists
-- First check if there's an FK constraint
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'project_comments' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name LIKE '%project_id%';
    
    -- If found, rename it
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE project_comments RENAME CONSTRAINT %I TO project_comments_engagement_id_fkey', constraint_name);
        RAISE NOTICE 'Renamed constraint % to project_comments_engagement_id_fkey', constraint_name;
    END IF;
END $$;

-- Update any indexes that reference the old column name
DO $$
DECLARE
    index_record RECORD;
    new_index_name TEXT;
BEGIN
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'project_comments' 
          AND indexname LIKE '%project_id%'
    LOOP
        new_index_name := REPLACE(index_record.indexname, 'project_id', 'engagement_id');
        EXECUTE format('ALTER INDEX %I RENAME TO %I', index_record.indexname, new_index_name);
        RAISE NOTICE 'Renamed index % to %', index_record.indexname, new_index_name;
    END LOOP;
END $$;

-- =====================================================
-- 2. PROJECT_SUBCONTRACTORS TABLE
-- =====================================================

-- Rename the column
ALTER TABLE project_subcontractors 
RENAME COLUMN project_id TO engagement_id;

-- Update the foreign key constraint name if it exists
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'project_subcontractors' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name LIKE '%project_id%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE project_subcontractors RENAME CONSTRAINT %I TO project_subcontractors_engagement_id_fkey', constraint_name);
        RAISE NOTICE 'Renamed constraint % to project_subcontractors_engagement_id_fkey', constraint_name;
    END IF;
END $$;

-- Update any indexes
DO $$
DECLARE
    index_record RECORD;
    new_index_name TEXT;
BEGIN
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'project_subcontractors' 
          AND indexname LIKE '%project_id%'
    LOOP
        new_index_name := REPLACE(index_record.indexname, 'project_id', 'engagement_id');
        EXECUTE format('ALTER INDEX %I RENAME TO %I', index_record.indexname, new_index_name);
        RAISE NOTICE 'Renamed index % to %', index_record.indexname, new_index_name;
    END LOOP;
END $$;

-- =====================================================
-- 3. PROJECT_TASK_COMPLETION TABLE
-- =====================================================

-- Rename the column
ALTER TABLE project_task_completion 
RENAME COLUMN project_id TO engagement_id;

-- Update the foreign key constraint name if it exists
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'project_task_completion' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name LIKE '%project_id%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE project_task_completion RENAME CONSTRAINT %I TO project_task_completion_engagement_id_fkey', constraint_name);
        RAISE NOTICE 'Renamed constraint % to project_task_completion_engagement_id_fkey', constraint_name;
    END IF;
END $$;

-- Update any indexes
DO $$
DECLARE
    index_record RECORD;
    new_index_name TEXT;
BEGIN
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'project_task_completion' 
          AND indexname LIKE '%project_id%'
    LOOP
        new_index_name := REPLACE(index_record.indexname, 'project_id', 'engagement_id');
        EXECUTE format('ALTER INDEX %I RENAME TO %I', index_record.indexname, new_index_name);
        RAISE NOTICE 'Renamed index % to %', index_record.indexname, new_index_name;
    END LOOP;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the columns have been renamed
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('project_comments', 'project_subcontractors', 'project_task_completion')
  AND column_name IN ('project_id', 'engagement_id')
ORDER BY table_name, column_name;

-- Verify foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('project_comments', 'project_subcontractors', 'project_task_completion')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

COMMIT;
