-- Migration: Ensure thin views (projects_v, prospects_v) exist
-- Date: 2025-11-12
-- Purpose: Recreate lightweight views that expose engagements by type

BEGIN;

CREATE OR REPLACE VIEW public.projects_v AS
SELECT *
FROM public.engagements
WHERE type = 'project';

CREATE OR REPLACE VIEW public.prospects_v AS
SELECT *
FROM public.engagements
WHERE type = 'prospect';

COMMENT ON VIEW public.projects_v IS 'Thin view for projects (type=project)';
COMMENT ON VIEW public.prospects_v IS 'Thin view for prospects (type=prospect)';

COMMIT;
