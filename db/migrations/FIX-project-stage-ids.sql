-- Fix: Update any projects that have concatenated stage values
-- Date: 2025-11-05  
-- Purpose: Ensure projects.stage_id contains proper UUIDs, not concatenated strings

-- STEP 1: Check if projects table has proper stage_id values
SELECT 
    p.id,
    p.name,
    p.stage_id,
    s.name as stage_name,
    s."order" as stage_order
FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id
WHERE p.stage_id IS NOT NULL
LIMIT 10;

-- STEP 2: If you find projects with concatenated stage_id values, fix them
-- (This updates projects where stage_id might contain concatenated strings)

UPDATE projects 
SET stage_id = (
    SELECT s.id 
    FROM stages s 
    WHERE s.name = TRIM(REGEXP_REPLACE(projects.stage_id::text, '^\d+\.\s*', ''))
    LIMIT 1
)
WHERE projects.stage_id IS NOT NULL 
AND projects.stage_id::text LIKE '%\.%'  -- Contains a period (likely concatenated)
AND EXISTS (
    SELECT 1 FROM stages s 
    WHERE s.name = TRIM(REGEXP_REPLACE(projects.stage_id::text, '^\d+\.\s*', ''))
);

-- STEP 3: Verify all projects now have proper UUID stage_id values
SELECT 
    COUNT(*) as total_projects,
    COUNT(p.stage_id) as projects_with_stage,
    COUNT(s.id) as projects_with_valid_stage
FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id;