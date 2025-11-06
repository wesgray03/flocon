-- Migration: Update project_dashboard view to include change orders and billings
-- Date: 2025-11-04
-- Purpose: Add co_amt and billed_amt calculations from change_orders and pay_apps tables

BEGIN;

-- Drop the existing view first to avoid column name conflicts
DROP VIEW IF EXISTS public.project_dashboard;

-- Recreate the project_dashboard view with change order and billing amounts
CREATE VIEW public.project_dashboard AS
SELECT 
  p.id,
  p.qbid,
  p.name AS project_name,
  c.name AS customer_name,
  p.manager,
  p.owner,
  s.name AS stage,
  p.stage_id,
  p.sharepoint_folder,
  p.contract_amount AS contract_amt,
  COALESCE((SELECT SUM(amount) FROM public.change_orders WHERE project_id = p.id), 0) AS co_amt,
  p.contract_amount + COALESCE((SELECT SUM(amount) FROM public.change_orders WHERE project_id = p.id), 0) AS total_amt,
  COALESCE((SELECT SUM(amount) FROM public.pay_apps WHERE project_id = p.id), 0) AS billed_amt,
  p.contract_amount + COALESCE((SELECT SUM(amount) FROM public.change_orders WHERE project_id = p.id), 0) - COALESCE((SELECT SUM(amount) FROM public.pay_apps WHERE project_id = p.id), 0) AS balance,
  p.start_date,
  p.end_date
FROM public.projects p
LEFT JOIN public.customers c ON c.id = p.customer_id
LEFT JOIN public.stages s ON s.id = p.stage_id;

-- Add comment to document the view
COMMENT ON VIEW public.project_dashboard IS 'Dashboard view for projects with calculated change order and billing amounts';

COMMIT;

-- Note: This view now includes:
-- - co_amt: Sum of all change order amounts for the project
-- - billed_amt: Sum of all pay application amounts for the project
-- - total_amt: contract_amount + co_amt
-- - balance: total_amt - billed_amt
