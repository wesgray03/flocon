-- Migration: Recreate projects_v and prospects_v views to pick up new columns
-- Date: 2025-11-18
-- Purpose: Ensure views include contract_budget and any other new columns from engagements table

BEGIN;

-- Drop and recreate projects_v
DROP VIEW IF EXISTS public.projects_v CASCADE;

CREATE VIEW public.projects_v AS
SELECT *
FROM public.engagements
WHERE type = 'project';

-- Drop and recreate prospects_v
DROP VIEW IF EXISTS public.prospects_v CASCADE;

CREATE VIEW public.prospects_v AS
SELECT *
FROM public.engagements
WHERE type = 'prospect';

-- Add comments
COMMENT ON VIEW public.projects_v IS 'Thin view for projects (type=project). Includes all columns from engagements table.';
COMMENT ON VIEW public.prospects_v IS 'Thin view for prospects (type=prospect). Includes all columns from engagements table.';

COMMIT;
