-- Migration: Update project_dashboard view after removing sales column
-- Date: 2025-11-09
-- Purpose: Fix view to not reference dropped sales column

BEGIN;

-- Drop and recreate the view
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT 
  e.id,
  e.qbid,
  e.name AS project_name,
  c.name AS customer_name,
  e.owner AS manager,  -- Project manager name (text field)
  e.owner,             -- Project owner (same as manager for now)
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
LEFT JOIN companies c ON e.company_id = c.id
LEFT JOIN stages s ON e.stage_id = s.id
WHERE e.type = 'project';

COMMENT ON VIEW project_dashboard IS 'Project dashboard view - owner field used for both manager and owner columns';

COMMIT;
