-- Migration: Fix project_dashboard - convert from table to view
-- Date: 2025-11-08
-- Purpose: project_dashboard should be a VIEW, not a TABLE
-- This fixes an issue where it was created as a table in some environments

BEGIN;

-- Drop the view if it exists (to recreate with proper structure)
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

-- Also try dropping as table in case it was created as a table in some environments
DROP TABLE IF EXISTS public.project_dashboard CASCADE;

-- Create it as a proper view
CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT 
  p.id,
  p.qbid,
  p.name AS project_name,
  c.name AS customer_name,
  p.manager,
  p.owner,
  p.start_date,
  p.end_date,
  p.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  p.sharepoint_folder,
  COALESCE(p.contract_amount, 0::numeric) AS contract_amt,
  COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = p.id
  ), 0::numeric) AS co_amt,
  COALESCE(p.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = p.id
  ), 0::numeric) AS total_amt,
  COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.project_id = p.id
  ), 0::numeric) AS billed_amt,
  COALESCE(p.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = p.id
  ), 0::numeric) - COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.project_id = p.id
  ), 0::numeric) AS balance
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN stages s ON p.stage_id = s.id;

COMMENT ON VIEW project_dashboard IS 'Project dashboard view - automatically respects RLS on underlying tables';

COMMIT;

-- Note: Views inherit RLS from their underlying tables
-- No need to enable RLS on the view itself
