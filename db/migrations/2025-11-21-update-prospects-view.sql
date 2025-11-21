-- Migration: Refresh prospects_v view to include prospect_status
-- Date: 2025-11-21
-- Purpose: Ensure view picks up new prospect_status column

BEGIN;

DROP VIEW IF EXISTS public.prospects_v;

CREATE VIEW public.prospects_v AS
SELECT *
FROM public.engagements
WHERE type = 'prospect';

COMMENT ON VIEW public.prospects_v IS 'Thin view for prospects (type=prospect) with prospect_status tracking';

COMMIT;
