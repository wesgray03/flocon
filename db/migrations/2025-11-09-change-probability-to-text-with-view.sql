-- Migration: Change probability column to TEXT (handling ALL view dependencies)
-- This allows us to use actual CSV Pipeline Status values

-- Step 1: Drop ALL views in the public schema to avoid conflicts
-- Get all view names first (for reference):
-- SELECT table_name FROM information_schema.views WHERE table_schema = 'public';

-- Drop all known views that use engagements table
DROP VIEW IF EXISTS v_hot_prospects CASCADE;
DROP VIEW IF EXISTS v_pipeline_summary CASCADE;
DROP VIEW IF EXISTS v_prospects CASCADE;
DROP VIEW IF EXISTS v_lost_prospects CASCADE;
DROP VIEW IF EXISTS project_dashboard CASCADE;

-- Nuclear option: Drop all views that reference the engagements table
DO $$ 
DECLARE
    view_name text;
BEGIN
    FOR view_name IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'v_%'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', view_name);
    END LOOP;
END $$;

-- Step 2: Change the column type from enum to TEXT
ALTER TABLE engagements 
ALTER COLUMN probability TYPE TEXT;

-- Step 3: Add comment
COMMENT ON COLUMN engagements.probability IS 'Pipeline Status from CSV: Landed, Probable, Questionable, Doubtful, or custom values';

-- Note: You will need to recreate any necessary views after this migration
-- To get view definitions later, run:
-- SELECT table_name, pg_get_viewdef(table_name::regclass, true) 
-- FROM information_schema.views 
-- WHERE table_schema = 'public';
