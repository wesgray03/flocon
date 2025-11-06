-- Migration: migrate projects.status -> stages table and projects.stage_id
-- Date: 2025-11-04
-- WARNING: Review and run in a staging environment first. Keep backups.

BEGIN;

-- 1) Create the stages table if it doesn't exist.
-- Note: Use the appropriate uuid function for your Postgres setup.
-- Supabase-managed Postgres commonly supports gen_random_uuid() (pgcrypto).
-- If your DB uses uuid-ossp, replace gen_random_uuid() with uuid_generate_v4().

CREATE TABLE IF NOT EXISTS public.stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2) Insert distinct existing status strings into stages.
INSERT INTO public.stages (name)
SELECT DISTINCT trim(status) AS name
FROM public.projects
WHERE status IS NOT NULL
  AND trim(status) <> ''
ON CONFLICT (name) DO NOTHING;

-- 3) Add stage_id column to projects (if not present).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS stage_id uuid NULL;

-- 4) Populate projects.stage_id by matching normalized names.
UPDATE public.projects p
SET stage_id = s.id
FROM public.stages s
WHERE lower(trim(s.name)) = lower(trim(p.status))
  AND (p.stage_id IS NULL OR p.stage_id = '00000000-0000-0000-0000-000000000000')
;

-- 5) Optionally add a foreign key constraint (enable after verifying updates).
-- Be aware this will fail if some stage_id values do not reference a stages row.
-- Uncomment to enforce referential integrity.
-- ALTER TABLE public.projects
--   ADD CONSTRAINT projects_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(id) ON DELETE SET NULL;

-- 6) Review the changes before dropping the legacy column.
-- Check how many rows still have non-null status but no stage_id:
--   SELECT COUNT(*) FROM public.projects WHERE status IS NOT NULL AND stage_id IS NULL;

-- 7) If you're happy and have backups, drop the legacy status column.
-- WARNING: This is destructive. Only run after verification.
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS status;

COMMIT;

-- Suggested view update (example). Replace the SELECT with your view's actual columns.
-- CREATE OR REPLACE VIEW public.project_dashboard AS
-- SELECT p.id,
--        p.qbid,
--        p.project_name,
--        p.customer_name,
--        p.manager,
--        p.owner,
--        s.name AS stage,
--        p.stage_id,
--        p.contract_amt,
--        p.co_amt,
--        p.total_amt,
--        p.billed_amt,
--        p.balance,
--        p.start_date,
--        p.end_date
-- FROM public.projects p
-- LEFT JOIN public.stages s ON s.id = p.stage_id;

-- End of migration file
