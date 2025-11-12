-- Migration: Create project_dashboard view using engagements table
-- Date: 2025-11-09
-- Since there's no separate 'projects' table, we use engagements where type='project'

BEGIN;

-- Drop the view if it exists
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

-- Create the view using engagements table filtered by type='project'
CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT 
  e.id,
  e.qbid,
  e.name AS project_name,
  c.name AS customer_name,
  e.owner AS manager,  -- Using new column names: owner contains the manager
  e.sales AS owner,     -- sales contains the sales/owner person
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  COALESCE(e.contract_amount, 0::numeric) AS contract_amt,
  COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) AS co_amt,
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) AS total_amt,
  COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.project_id = e.id
  ), 0::numeric) AS billed_amt,
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) - COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.project_id = e.id
  ), 0::numeric) AS balance
FROM engagements e
LEFT JOIN customers c ON e.customer_id = c.id
LEFT JOIN stages s ON e.stage_id = s.id
WHERE e.type = 'project';  -- Only show projects, not prospects

COMMENT ON VIEW project_dashboard IS 'Project dashboard view using engagements table (type=project) - automatically respects RLS';

COMMIT;
