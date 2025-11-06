-- OPTIMIZED Migration: Clean project_dashboard view with only needed columns
-- Date: 2025-11-05
-- Purpose: Include only the columns actually used by the application

-- Step 1: Create the clean, optimized view
DROP VIEW IF EXISTS project_dashboard;

CREATE VIEW project_dashboard AS
SELECT 
    -- Core project fields (used by both pages)
    p.id,
    p.qbid,
    p.name AS project_name,
    p.customer_name,
    p.manager,
    p.owner,
    p.start_date,
    p.end_date,
    
    -- Stage fields (used by detail page)
    p.stage_id,
    s.name AS stage_name,
    s.order AS stage_order,
    
    -- Financial fields (used by main projects page)
    COALESCE(p.contract_amount, 0) AS contract_amt,
    COALESCE(p.change_order_amount, 0) AS co_amt,
    COALESCE(p.contract_amount, 0) + COALESCE(p.change_order_amount, 0) AS total_amt,
    COALESCE(p.billed_amount, 0) AS billed_amt,
    (COALESCE(p.contract_amount, 0) + COALESCE(p.change_order_amount, 0)) - COALESCE(p.billed_amount, 0) AS balance

FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id;

-- Add helpful comment
COMMENT ON VIEW project_dashboard IS 'Optimized project dashboard view with only columns used by the application. Removed legacy stage column. Updated 2025-11-05.';

-- Show the structure for verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'project_dashboard'
ORDER BY ordinal_position;