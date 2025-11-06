-- SAFE Migration: Add stage fields to existing project_dashboard view
-- Date: 2025-11-05
-- Purpose: Add stage_id, stage_name, stage_order while preserving existing structure

-- Step 1: First, run this to see what currently works:
-- SELECT * FROM project_dashboard LIMIT 1;

-- Step 2: Create a NEW view that extends the existing one
CREATE OR REPLACE VIEW project_dashboard_new AS
SELECT 
    pd.*,
    -- Extract stage_id if it exists, otherwise try to match by stage name
    CASE 
        -- If there's already a stage_id column, use it
        WHEN pd.stage_id IS NOT NULL THEN pd.stage_id
        -- Otherwise, try to find stage_id by matching the stage name
        ELSE (
            SELECT s.id 
            FROM stages s 
            WHERE s.name = TRIM(REGEXP_REPLACE(pd.stage, '^\d+\.\s*', ''))
            LIMIT 1
        )
    END AS new_stage_id,
    
    -- Get clean stage name
    CASE 
        WHEN pd.stage IS NOT NULL AND pd.stage LIKE '%.' THEN 
            TRIM(REGEXP_REPLACE(pd.stage, '^\d+\.\s*', ''))
        ELSE pd.stage
    END AS stage_name,
    
    -- Get stage order
    (
        SELECT s.order 
        FROM stages s 
        WHERE s.name = TRIM(REGEXP_REPLACE(COALESCE(pd.stage, ''), '^\d+\.\s*', ''))
        LIMIT 1
    ) AS stage_order

FROM project_dashboard pd;

-- Step 3: Test the new view
-- SELECT id, project_name, stage, stage_name, new_stage_id, stage_order FROM project_dashboard_new LIMIT 5;

-- Step 4: If the test looks good, replace the original view
-- DROP VIEW project_dashboard;
-- ALTER VIEW project_dashboard_new RENAME TO project_dashboard;