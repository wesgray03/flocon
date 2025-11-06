-- Fix customer names in project_dashboard view
-- Run this via Supabase SQL editor

-- First, let's see the current state of customer data
SELECT 
    p.id, 
    p.name AS project_name,
    p.customer_id,
    c.name AS actual_customer_name,
    pd.customer_name AS dashboard_customer_name
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN project_dashboard pd ON p.id = pd.id
WHERE p.customer_id IS NOT NULL
LIMIT 5;

-- Now recreate the project_dashboard view with proper customer names
DROP VIEW IF EXISTS project_dashboard CASCADE;

CREATE VIEW project_dashboard AS
SELECT 
    -- Core project fields
    p.id,
    p.qbid,
    p.name AS project_name,
    
    -- Get actual customer name from customers table via customer_id FK
    c.name AS customer_name,
    
    p.manager,
    p.owner,
    p.start_date,
    p.end_date,
    
    -- Stage fields (clean)
    p.stage_id,
    s.name AS stage_name,
    s."order" AS stage_order,
    
    -- Financial fields (adjust based on your actual projects table columns)
    COALESCE(p.contract_amount, 0) AS contract_amt,
    COALESCE((SELECT SUM(amount) FROM change_orders WHERE project_id = p.id), 0) AS co_amt,
    COALESCE(p.contract_amount, 0) + COALESCE((SELECT SUM(amount) FROM change_orders WHERE project_id = p.id), 0) AS total_amt,
    COALESCE((SELECT SUM(amount) FROM pay_apps WHERE project_id = p.id), 0) AS billed_amt,
    (COALESCE(p.contract_amount, 0) + COALESCE((SELECT SUM(amount) FROM change_orders WHERE project_id = p.id), 0)) - COALESCE((SELECT SUM(amount) FROM pay_apps WHERE project_id = p.id), 0) AS balance,
    
    -- SharePoint folder if it exists
    p.sharepoint_folder
    
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN stages s ON p.stage_id = s.id;

-- Verify the fix
SELECT 
    id, 
    project_name, 
    customer_name, 
    stage_name,
    contract_amt
FROM project_dashboard
WHERE customer_name IS NOT NULL
LIMIT 5;