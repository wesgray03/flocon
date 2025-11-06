-- NUCLEAR OPTION: Drop everything and rebuild clean
-- Date: 2025-11-05
-- Purpose: Clean slate approach - drop all views and rebuild project_dashboard properly

-- STEP 1: First, let's see what columns actually exist in your projects table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- STEP 2: See a sample projects row
SELECT * FROM projects LIMIT 1;

-- STEP 3: Drop everything (CASCADE will handle dependencies)
DROP VIEW IF EXISTS project_dashboard CASCADE;
DROP VIEW IF EXISTS project_dashboard_clean CASCADE;
DROP VIEW IF EXISTS project_dashboard_new CASCADE;
DROP VIEW IF EXISTS project_dashboard_simple_clean CASCADE;

-- STEP 4: Create the correct view based on actual projects table structure
CREATE VIEW project_dashboard AS
SELECT 
    -- Core project fields (using actual column names)
    p.id,
    p.name AS project_name,
    p.qbid,
    p.manager,
    p.owner,
    p.start_date,
    p.end_date,
    
    -- Customer info (using customer_id - we'll need to join to customers table later)
    'TBD' AS customer_name,        -- Placeholder - need customers table join
    
    -- Financial fields (using actual columns)
    COALESCE(p.contract_amount, 0) AS contract_amt,
    COALESCE(p.bid_amount, 0) AS co_amt,           -- Using bid_amount as placeholder for change orders
    COALESCE(p.contract_amount, 0) AS total_amt,   -- Contract amount as total for now
    0 AS billed_amt,                               -- Not in projects table - need billing data
    COALESCE(p.contract_amount, 0) AS balance,     -- Contract amount as balance for now
    
    -- CLEAN stage fields (only what we need)
    p.stage_id,
    s.name AS stage_name,
    s."order" AS stage_order
    
FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id;

-- STEP 5: Test the new view
SELECT 
    id, project_name, qbid, stage_id, stage_name, stage_order, contract_amt
FROM project_dashboard 
LIMIT 3;

-- STEP 6: Optional - Add customer names if you have a customers table
/*
-- If you have a customers table, you can update the view to include customer names:
CREATE OR REPLACE VIEW project_dashboard AS
SELECT 
    p.id,
    p.name AS project_name,
    p.qbid,
    p.manager,
    p.owner,
    p.start_date,
    p.end_date,
    
    -- Get actual customer name from customers table
    c.name AS customer_name,       -- Adjust column name as needed
    
    -- Financial fields
    COALESCE(p.contract_amount, 0) AS contract_amt,
    COALESCE(p.bid_amount, 0) AS co_amt,
    COALESCE(p.contract_amount, 0) AS total_amt,
    0 AS billed_amt,
    COALESCE(p.contract_amount, 0) AS balance,
    
    -- Clean stage fields
    p.stage_id,
    s.name AS stage_name,
    s."order" AS stage_order
    
FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id
LEFT JOIN customers c ON p.customer_id = c.id;  -- Adjust table/column names as needed
*/

-- STEP 7: Verify clean stage columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project_dashboard' 
AND column_name LIKE '%stage%'
ORDER BY column_name;