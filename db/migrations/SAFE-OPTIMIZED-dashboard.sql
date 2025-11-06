-- SAFE OPTIMIZED Migration: Preserve existing financial logic
-- Date: 2025-11-05
-- Purpose: Clean view while preserving existing working financial calculations

-- Step 1: First check what financial columns currently exist and work
-- SELECT contract_amt, co_amt, total_amt, billed_amt, balance FROM project_dashboard LIMIT 1;

-- Step 2: Get the current view definition to preserve financial logic
-- SELECT pg_get_viewdef('project_dashboard', true);

-- Step 3: Create optimized view (adjust financial fields based on current working version)
CREATE OR REPLACE VIEW project_dashboard AS
SELECT 
    -- Core fields that we know are used
    p.id,
    p.qbid,
    p.name AS project_name,
    p.customer_name,
    p.manager,
    p.owner,
    p.start_date,
    p.end_date,
    
    -- NEW: Clean stage fields (this is what we're adding)
    p.stage_id,
    s.name AS stage_name,
    s.order AS stage_order,
    
    -- Financial fields - COPY EXACTLY from your current working view
    -- Replace these lines with the exact financial calculations from your current view:
    p.contract_amt,    -- Replace with actual working calculation
    p.co_amt,         -- Replace with actual working calculation  
    p.total_amt,      -- Replace with actual working calculation
    p.billed_amt,     -- Replace with actual working calculation
    p.balance         -- Replace with actual working calculation
    
FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id;

-- Alternative: If you want to be super safe, create a new view first:
/*
CREATE VIEW project_dashboard_clean AS
SELECT 
    pd.id, pd.qbid, pd.project_name, pd.customer_name, pd.manager, pd.owner,
    pd.start_date, pd.end_date,
    pd.contract_amt, pd.co_amt, pd.total_amt, pd.billed_amt, pd.balance,
    -- Add the new stage fields
    p.stage_id,
    s.name AS stage_name,
    s.order AS stage_order
FROM project_dashboard pd
JOIN projects p ON pd.id = p.id
LEFT JOIN stages s ON p.stage_id = s.id;
*/