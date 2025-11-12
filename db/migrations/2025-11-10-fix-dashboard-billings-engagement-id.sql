-- Migration: Fix project_dashboard view to use engagement_id for billings
-- Date: 2025-11-10
-- Issue: View was using project_id to join change_orders and pay_apps, but those tables now use engagement_id
-- This was causing billing amounts to show as $0 on the main projects list page

BEGIN;

-- Drop and recreate the view with corrected joins
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT 
  e.id,
  e.project_number,
  e.name AS project_name,
  e.user_id,
  u.name AS owner,
  e.superintendent_id,
  su.name AS superintendent,
  e.foreman_id,
  fo.name AS foreman,
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  -- Contract amount
  COALESCE(e.contract_amount, 0::numeric) AS contract_amt,
  -- Change orders total (using engagement_id)
  COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.engagement_id = e.id
  ), 0::numeric) AS co_amt,
  -- Total contract + change orders
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.engagement_id = e.id
  ), 0::numeric) AS total_amt,
  -- Billed amount from pay apps (using engagement_id)
  COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.engagement_id = e.id
  ), 0::numeric) AS billed_amt,
  -- Balance = total - billed
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.engagement_id = e.id
  ), 0::numeric) - COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.engagement_id = e.id
  ), 0::numeric) AS balance,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN stages s ON e.stage_id = s.id
LEFT JOIN users u ON e.user_id = u.id
LEFT JOIN users su ON e.superintendent_id = su.id
LEFT JOIN users fo ON e.foreman_id = fo.id
WHERE e.type = 'project';

COMMENT ON VIEW project_dashboard IS 'Project dashboard with billing totals - uses engagement_id for joins to change_orders and pay_apps';

COMMIT;
