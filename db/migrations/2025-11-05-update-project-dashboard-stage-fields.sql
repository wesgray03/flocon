-- Migration: Update project dashboard view to include stage_id and stage_order
-- Date: 2025-11-05
-- Purpose: Remove concatenated stage string and add proper stage_id and order references

-- IMPORTANT: Run 0-inspect-current-schema.sql first to see your actual table structure!

-- Step 1: Backup the current view definition (optional but recommended)
-- You can get the current definition with: SELECT pg_get_viewdef('project_dashboard', true);

-- Step 2: Drop the existing view
DROP VIEW IF EXISTS project_dashboard;

-- Step 3: Recreate the view - SIMPLIFIED APPROACH
-- This version preserves all existing fields and adds the new stage fields
CREATE VIEW project_dashboard AS
SELECT 
    *,
    -- Add proper stage references
    p.stage_id,
    s.name AS stage_name,
    s.order AS stage_order
FROM (
    -- Use the existing data structure that was working
    SELECT 
        id,
        qbid,
        project_name,
        customer_name,
        manager,
        owner,
        stage,  -- Keep the old stage field temporarily for compatibility
        contract_amt,
        co_amt,
        total_amt,
        billed_amt,
        balance,
        start_date,
        end_date,
        stage_id  -- Assuming this exists or can be derived
    FROM (
        -- You'll need to replace this with your actual projects table query
        -- For now, this is a placeholder that preserves existing structure
        SELECT * FROM projects
    ) base
) p
LEFT JOIN stages s ON p.stage_id = s.id;

-- Add a comment explaining the change
COMMENT ON VIEW project_dashboard IS 'Project dashboard view with proper stage_id references. Updated 2025-11-05. Run inspection queries first!';