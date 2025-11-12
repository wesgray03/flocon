-- Migration: Deprecate user_id and foreman_id columns after transition to engagement_user_roles
-- Date: 2025-11-10
-- Purpose: Mark legacy FK columns as deprecated; data now managed via engagement_user_roles junction table
-- Depends on: 2025-11-10-create-engagement-user-roles.sql, 2025-11-10-update-dashboard-use-user-roles.sql

BEGIN;

-- 1) NULL out existing data (data already migrated to engagement_user_roles)
UPDATE public.engagements
SET user_id = NULL
WHERE user_id IS NOT NULL;

UPDATE public.engagements
SET foreman_id = NULL
WHERE foreman_id IS NOT NULL;

-- 2) Add comments documenting deprecation
COMMENT ON COLUMN public.engagements.user_id IS 
  'DEPRECATED: Use engagement_user_roles with role=''project_owner''. This column will be dropped in a future migration. Do not write to this column.';

COMMENT ON COLUMN public.engagements.foreman_id IS 
  'DEPRECATED: Use engagement_user_roles with role=''foreman''. This column will be dropped in a future migration. Do not write to this column.';

-- 3) Add NULL-only constraints to enforce no new data writes
-- First check if constraints already exist
DO $$
DECLARE
  user_id_con_exists boolean;
  foreman_id_con_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'engagements_user_id_must_be_null'
      AND conrelid = 'public.engagements'::regclass
  ) INTO user_id_con_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'engagements_foreman_id_must_be_null'
      AND conrelid = 'public.engagements'::regclass
  ) INTO foreman_id_con_exists;

  IF NOT user_id_con_exists THEN
    ALTER TABLE public.engagements
      ADD CONSTRAINT engagements_user_id_must_be_null
      CHECK (user_id IS NULL);
    RAISE NOTICE 'Added NULL-only constraint for user_id';
  END IF;

  IF NOT foreman_id_con_exists THEN
    ALTER TABLE public.engagements
      ADD CONSTRAINT engagements_foreman_id_must_be_null
      CHECK (foreman_id IS NULL);
    RAISE NOTICE 'Added NULL-only constraint for foreman_id';
  END IF;
END $$;

COMMIT;
