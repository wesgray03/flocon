-- Migration: Drop deprecated superintendent_id column
-- Date: 2025-11-10
-- Prerequisites: 
--   - 2025-11-10-deprecate-superintendent-foreman-columns.sql must be applied
--   - All superintendent data migrated to engagement_parties

BEGIN;

-- 1. Verify column is NULL-only (safeguard)
DO $$
DECLARE
  non_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO non_null_count
  FROM engagements
  WHERE superintendent_id IS NOT NULL;
  
  IF non_null_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop superintendent_id: % row(s) still have non-null values. Migrate to engagement_parties first.', non_null_count;
  END IF;
  
  RAISE NOTICE 'Verified: All superintendent_id values are NULL';
END $$;

-- 2. Drop the NULL-only constraint (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'engagements_superintendent_id_must_be_null'
  ) THEN
    ALTER TABLE public.engagements 
      DROP CONSTRAINT engagements_superintendent_id_must_be_null;
    RAISE NOTICE 'Dropped constraint engagements_superintendent_id_must_be_null';
  END IF;
END $$;

-- 3. Drop the index
DROP INDEX IF EXISTS public.idx_engagements_superintendent_id;

-- 4. Drop the column
ALTER TABLE public.engagements 
  DROP COLUMN IF EXISTS superintendent_id;

COMMENT ON TABLE public.engagements IS 'Engagements table - superintendent now managed via engagement_parties (dropped superintendent_id column 2025-11-10)';

COMMIT;
