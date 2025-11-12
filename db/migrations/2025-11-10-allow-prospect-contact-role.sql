-- Migration: Allow 'prospect_contact' in engagement_parties roles and backfill
-- Date: 2025-11-10

BEGIN;

-- 1) Drop existing CHECK constraint for role, if present
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

-- 2) Recreate CHECK constraint including 'prospect_contact'
ALTER TABLE public.engagement_parties
  ADD CONSTRAINT engagement_parties_role_check
  CHECK (role IN (
    'customer',
    'architect',
    'general_contractor',
    'project_manager',
    'prospect_contact',
    'superintendent',
    'foreman',
    'estimator',
    'owner',
    'sales_contact',
    'subcontractor',
    'other'
  ));

-- 3) Backfill: convert existing project_manager → prospect_contact for prospects only
--    This assumes engagements.type is 'prospect' for prospects
UPDATE public.engagement_parties ep
SET role = 'prospect_contact'
FROM public.engagements e
WHERE ep.engagement_id = e.id
  AND e.type = 'prospect'
  AND ep.role = 'project_manager';

COMMENT ON CONSTRAINT engagement_parties_role_check ON public.engagement_parties IS 'Allowed roles incl. prospect_contact for prospect-specific primary contact';

COMMIT;
