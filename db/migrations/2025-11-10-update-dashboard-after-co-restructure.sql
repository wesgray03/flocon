-- Migration: Recreate project_dashboard view after change_orders restructure
-- Date: 2025-11-10
-- Purpose: Update dashboard view to work with new change_orders structure (engagement_id)
-- Run AFTER: 2025-11-10-recreate-change-orders.sql

DROP VIEW IF EXISTS public.project_dashboard CASCADE;

CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT
  e.id,
  e.project_number,
  e.name AS project_name,
  -- Customer/Company
  (
    SELECT epd.party_name
    FROM engagement_parties_detailed epd
    WHERE epd.engagement_id = e.id
      AND epd.role = 'customer'
      AND epd.is_primary = true
    LIMIT 1
  ) AS customer_name,
  -- Owner from engagement_user_roles_detailed (project_owner role)
  (
    SELECT eurd.user_name
    FROM engagement_user_roles_detailed eurd
    WHERE eurd.engagement_id = e.id
      AND eurd.role = 'project_owner'
      AND eurd.is_primary = true
    LIMIT 1
  ) AS owner,
  -- Superintendent from engagement_user_roles_detailed
  (
    SELECT eurd.user_name
    FROM engagement_user_roles_detailed eurd
    WHERE eurd.engagement_id = e.id
      AND eurd.role = 'superintendent'
      AND eurd.is_primary = true
    LIMIT 1
  ) AS superintendent,
  -- Foreman from engagement_user_roles_detailed
  (
    SELECT eurd.user_name
    FROM engagement_user_roles_detailed eurd
    WHERE eurd.engagement_id = e.id
      AND eurd.role = 'foreman'
      AND eurd.is_primary = true
    LIMIT 1
  ) AS foreman,
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  -- Contract amount and billing aggregates
  COALESCE(e.contract_amount, 0::numeric) AS contract_amt,
  -- Change orders: sum non-deleted change orders
  COALESCE((
    SELECT SUM(co.amount) 
    FROM change_orders co 
    WHERE co.engagement_id = e.id 
      AND co.deleted = false
  ), 0::numeric) AS co_amt,
  -- Total amount: contract + change orders
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(co.amount) 
    FROM change_orders co 
    WHERE co.engagement_id = e.id 
      AND co.deleted = false
  ), 0::numeric) AS total_amt,
  -- Billed amount from pay apps
  COALESCE((
    SELECT SUM(pa.amount) 
    FROM pay_apps pa 
    WHERE pa.engagement_id = e.id
  ), 0::numeric) AS billed_amt,
  -- Balance: total - billed
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(co.amount) 
    FROM change_orders co 
    WHERE co.engagement_id = e.id 
      AND co.deleted = false
  ), 0::numeric) - COALESCE((
    SELECT SUM(pa.amount) 
    FROM pay_apps pa 
    WHERE pa.engagement_id = e.id
  ), 0::numeric) AS balance,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN stages s ON e.stage_id = s.id
WHERE e.type = 'project';

COMMENT ON VIEW public.project_dashboard IS 
  'Project dashboard with billing totals; change_orders use engagement_id column and filter deleted=false';
