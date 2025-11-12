-- Migration: Deprecate superintendent_id; retain foreman_id for now
-- Date: 2025-11-10

BEGIN;

-- 1) Comment columns as deprecated
COMMENT ON COLUMN public.engagements.superintendent_id IS 'DEPRECATED: use engagement_parties (role = ''superintendent''). Must be NULL.';
COMMENT ON COLUMN public.engagements.foreman_id IS 'Transitional: still used (FK to users). Do not deprecate until foreman is migrated to engagement_parties.';

-- 2) Ensure both columns remain NULL via CHECK constraints (idempotent-ish)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'engagements_superintendent_id_must_be_null'
  ) THEN
    ALTER TABLE public.engagements
      ADD CONSTRAINT engagements_superintendent_id_must_be_null
      CHECK (superintendent_id IS NULL);
  END IF;

  -- Do not enforce NULL for foreman_id yet
END $$;

-- 3) Recreate project_dashboard to read both superintendent and foreman from engagement_parties_detailed
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
  -- Foreman from users (transitional)
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

COMMENT ON VIEW public.project_dashboard IS 'Project dashboard using engagement_parties for superintendent and users.foreman_id for foreman (transitional); billing totals use engagement_id';

COMMIT;
