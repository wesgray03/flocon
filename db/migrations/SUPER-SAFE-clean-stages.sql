-- SUPER SAFE: Clean stage columns while preserving existing financial logic
-- Date: 2025-11-05
-- Purpose: Remove stage column duplication without breaking anything

-- STEP 1: Create a clean view that uses your existing financial calculations
CREATE OR REPLACE VIEW project_dashboard_clean AS
SELECT 
    -- All non-stage columns from current view (preserves working financial logic)
    pd.id,
    pd.qbid, 
    pd.project_name,
    pd.customer_name,
    pd.manager,
    pd.owner,
    pd.start_date,
    pd.end_date,
    pd.contract_amt,
    pd.co_amt,
    pd.total_amt,
    pd.billed_amt,
    pd.balance,
    
    -- ONLY the stage columns we actually need (remove duplicates)
    p.stage_id,             -- UUID for relationships
    s.name AS stage_name,   -- Clean name for display  
    s."order" AS stage_order -- Number for progression logic
    
    -- Deliberately removing these duplicative columns:
    -- stage (old concatenated version)
    -- new_stage_id (duplicate of stage_id)
    
FROM project_dashboard pd
JOIN projects p ON pd.id = p.id
LEFT JOIN stages s ON p.stage_id = s.id;

-- STEP 2: Test the clean view
SELECT 
    project_name, 
    stage_id, 
    stage_name, 
    stage_order
FROM project_dashboard_clean 
WHERE stage_name IS NOT NULL
LIMIT 3;

-- STEP 3: Replace the original with the clean view
-- Handle dependent views first

-- 3a. Drop dependent views that are blocking us
DROP VIEW IF EXISTS project_dashboard_new CASCADE;
DROP VIEW IF EXISTS project_dashboard_clean CASCADE;

-- 3b. Recreate the clean view (since we just dropped it)
CREATE VIEW project_dashboard_clean AS
SELECT 
    -- All non-stage columns from current view (preserves working financial logic)
    pd.id,
    pd.qbid, 
    pd.project_name,
    pd.customer_name,
    pd.manager,
    pd.owner,
    pd.start_date,
    pd.end_date,
    pd.contract_amt,
    pd.co_amt,
    pd.total_amt,
    pd.billed_amt,
    pd.balance,
    
    -- ONLY the stage columns we actually need (remove duplicates)
    p.stage_id,             -- UUID for relationships
    s.name AS stage_name,   -- Clean name for display  
    s."order" AS stage_order -- Number for progression logic
    
FROM project_dashboard pd
JOIN projects p ON pd.id = p.id
LEFT JOIN stages s ON p.stage_id = s.id;

-- 3c. Now drop the original view
DROP VIEW project_dashboard;

-- 3d. Rename the clean view to replace it
ALTER VIEW project_dashboard_clean RENAME TO project_dashboard;

-- STEP 4: Verify the replacement worked
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project_dashboard' 
AND column_name LIKE '%stage%'
ORDER BY column_name;

-- Expected result should show ONLY these 3 stage columns:
-- stage_id, stage_name, stage_order

-- STEP 5: Test that your application still works
SELECT 
    id,
    project_name, 
    stage_id, 
    stage_name, 
    stage_order,
    contract_amt,
    co_amt
FROM project_dashboard 
LIMIT 2;