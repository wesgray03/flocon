-- CLEAN UP: Remove duplicate stage columns from project_dashboard
-- Date: 2025-11-05
-- Purpose: Eliminate confusion by keeping only the stage columns we actually need

-- What the code actually needs:
-- 1. stage_name (for display in both main list and detail page)
-- 2. stage_id (for detail page logic)  
-- 3. stage_order (for "next stage" calculation)

-- STEP 1: Back up current view (optional but recommended)
-- CREATE VIEW project_dashboard_backup AS SELECT * FROM project_dashboard;

-- STEP 2: Drop and recreate with clean stage columns
DROP VIEW IF EXISTS project_dashboard;

CREATE VIEW project_dashboard AS
SELECT 
    -- Core project fields
    p.id,
    p.qbid,
    p.name AS project_name,
    p.customer_name,
    p.manager,
    p.owner,
    p.start_date,
    p.end_date,
    
    -- CLEAN stage fields - only what we need
    p.stage_id,                    -- UUID reference to stages table
    s.name AS stage_name,          -- Clean display name (e.g., "Contract Onboarding")
    s."order" AS stage_order,      -- Numeric order for progression logic
    
    -- Financial fields (preserve existing calculations)
    -- Note: You may need to adjust these column names based on your actual projects table
    p.contract_amount AS contract_amt,
    p.change_order_amount AS co_amt,
    (COALESCE(p.contract_amount, 0) + COALESCE(p.change_order_amount, 0)) AS total_amt,
    p.billed_amount AS billed_amt,
    ((COALESCE(p.contract_amount, 0) + COALESCE(p.change_order_amount, 0)) - COALESCE(p.billed_amount, 0)) AS balance

FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id;

-- STEP 3: Verify the clean structure
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project_dashboard' 
AND column_name LIKE '%stage%'
ORDER BY column_name;

-- Expected result should show only:
-- stage_id, stage_name, stage_order

COMMENT ON VIEW project_dashboard IS 'Clean project dashboard view with non-duplicative stage columns: stage_id, stage_name, stage_order. Updated 2025-11-05.';