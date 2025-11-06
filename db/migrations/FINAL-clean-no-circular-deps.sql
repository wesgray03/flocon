-- FINAL SOLUTION: Clean replacement without circular dependencies
-- Date: 2025-11-05
-- Purpose: Replace project_dashboard with clean version, no circular deps

-- STEP 1: First, let's see what columns actually exist in your projects table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- STEP 2: See a sample row from projects to understand the data
SELECT * FROM projects LIMIT 1;

-- STEP 3: See what your current project_dashboard looks like
SELECT * FROM project_dashboard LIMIT 1;

-- STEP 4: Based on the above results, create the clean view
-- (You'll need to adjust the column names based on what you see above)

/*
-- Template - uncomment and adjust column names based on your inspection results:

CREATE OR REPLACE VIEW project_dashboard_final AS
SELECT 
    -- Core project fields (adjust names based on your projects table)
    p.id,
    p.qbid, 
    p.name AS project_name,           -- or maybe p.project_name?
    p.customer AS customer_name,      -- or maybe p.customer_name or p.client?
    p.manager,                        -- confirm this exists
    p.owner,                          -- confirm this exists
    p.start_date,                     -- or maybe p.started_date?
    p.end_date,                       -- or maybe p.finished_date?
    
    -- Financial fields (adjust based on what you see in projects table)
    p.contract_amt,                   -- use actual column name
    p.co_amt,                         -- use actual column name  
    p.total_amt,                      -- use actual column name
    p.billed_amt,                     -- use actual column name
    p.balance,                        -- use actual column name
    
    -- Stage columns (these should work)
    p.stage_id,             
    s.name AS stage_name,   
    s."order" AS stage_order 
    
FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id;
*/

-- STEP 5: After you see the correct column names, create this simpler approach:
-- Use your existing project_dashboard but just clean up the stage columns

-- 5a. Create a view that copies everything from current dashboard but fixes stages
CREATE OR REPLACE VIEW project_dashboard_simple_clean AS
SELECT 
    -- Copy ALL existing columns EXCEPT the problematic stage ones
    combined.id, 
    combined.qbid, 
    combined.project_name, 
    combined.customer_name, 
    combined.manager, 
    combined.owner,
    combined.start_date, 
    combined.end_date, 
    combined.contract_amt, 
    combined.co_amt, 
    combined.total_amt, 
    combined.billed_amt, 
    combined.balance,
    
    -- Add ONLY the clean stage columns we need (properly qualified)
    combined.p_stage_id AS stage_id,      -- From projects table
    combined.stage_name,                  -- Clean name from stages.name
    combined.stage_order                  -- Order from stages.order
    
FROM (
    SELECT 
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
        p.stage_id AS p_stage_id,         -- Rename to avoid ambiguity
        s.name AS stage_name,
        s."order" AS stage_order
    FROM project_dashboard pd
    JOIN projects p ON pd.id = p.id  
    LEFT JOIN stages s ON p.stage_id = s.id
) combined;

-- 5b. Test it
SELECT project_name, stage_id, stage_name, stage_order, contract_amt 
FROM project_dashboard_simple_clean 
LIMIT 2;

-- 5c. If test works, replace the original
-- DROP VIEW project_dashboard CASCADE;
-- ALTER VIEW project_dashboard_simple_clean RENAME TO project_dashboard;