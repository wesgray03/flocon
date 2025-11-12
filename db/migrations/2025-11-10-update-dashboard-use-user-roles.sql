-- Migration: Update project_dashboard view to source owner/foreman from engagement_user_roles_detailed
-- Date: 2025-11-10
-- Purpose: Complete transition to junction table pattern for user role assignments
-- Depends on: 2025-11-10-create-engagement-user-roles.sql

BEGIN;

-- Recreate project_dashboard view to derive owner and foreman from engagement_user_roles_detailed
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT
  e.id,
  e.project_number,
  e.name AS project_name,
  -- Owner from engagement_user_roles_detailed (project_owner role)
  (
    SELECT eurd.user_name
    FROM engagement_user_roles_detailed eurd
    WHERE eurd.engagement_id = e.id
      AND eurd.role = 'project_owner'
      AND eurd.is_primary = true
    LIMIT 1
  ) AS owner,
  e.user_id, -- Keep for backwards compatibility during transition
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  -- Superintendent from engagement_parties_detailed (contacts)
  (
    SELECT epd.party_name
    FROM engagement_parties_detailed epd
    WHERE epd.engagement_id = e.id
      AND epd.role = 'superintendent'
      AND epd.is_primary = true
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
  -- Contract amount and billing aggregates
  COALESCE(e.contract_amount, 0::numeric) AS contract_amt,
  COALESCE((
    SELECT SUM(co.amount) FROM change_orders co WHERE co.engagement_id = e.id
  ), 0::numeric) AS co_amt,
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(co.amount) FROM change_orders co WHERE co.engagement_id = e.id
  ), 0::numeric) AS total_amt,
  COALESCE((
    SELECT SUM(pa.amount) FROM pay_apps pa WHERE pa.engagement_id = e.id
  ), 0::numeric) AS billed_amt,
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(co.amount) FROM change_orders co WHERE co.engagement_id = e.id
  ), 0::numeric) - COALESCE((
    SELECT SUM(pa.amount) FROM pay_apps pa WHERE pa.engagement_id = e.id
  ), 0::numeric) AS balance,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN stages s ON e.stage_id = s.id
WHERE e.type = 'project';

COMMENT ON VIEW public.project_dashboard IS 
  'Project dashboard using engagement_user_roles_detailed for owner/foreman and engagement_parties_detailed for superintendent; billing totals from engagement_id';

COMMIT;
