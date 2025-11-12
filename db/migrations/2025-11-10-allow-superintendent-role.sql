-- Migration: Allow 'superintendent' (and 'foreman') in engagement_parties roles; update dashboard view to read superintendent from parties
-- Date: 2025-11-10

BEGIN;

-- 1) Relax/extend the engagement_parties.role CHECK constraint to include superintendent and foreman
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint 
  WHERE conrelid = 'public.engagement_parties'::regclass
    AND contype = 'c'
    AND conname LIKE '%role_check%'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.engagement_parties DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.engagement_parties
  ADD CONSTRAINT engagement_parties_role_check
  CHECK (role IN (
    'customer',
    'architect',
    'general_contractor',
    'project_manager',
    'superintendent',
    'foreman',
    'estimator',
    'owner',
    'sales_contact',
    'subcontractor',
    'other'
  ));

-- 2) Recreate project_dashboard view to derive superintendent from engagement_parties_detailed
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT
  e.id,
  e.project_number,
  e.name AS project_name,
  u.name AS owner,
  e.user_id,
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  -- Superintendent from parties
  (
    SELECT epd.party_name
    FROM engagement_parties_detailed epd
    WHERE epd.engagement_id = e.id
      AND epd.role = 'superintendent'
      AND epd.is_primary = true
    LIMIT 1
  ) AS superintendent,
  -- Foreman: keep existing users-based if present (optional)
  (
    SELECT u2.name FROM users u2 WHERE u2.id = e.foreman_id
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
LEFT JOIN users u ON e.user_id = u.id
WHERE e.type = 'project';

COMMENT ON VIEW public.project_dashboard IS 'Project dashboard using engagement_parties for superintendent and engagement_id for billing totals';

COMMIT;
