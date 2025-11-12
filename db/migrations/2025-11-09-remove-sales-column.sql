-- Migration: Remove sales column from engagements
-- Date: 2025-11-09
-- Purpose: Simplify engagements table by removing unused sales field

BEGIN;

-- Drop the sales column if it exists
ALTER TABLE public.engagements DROP COLUMN IF EXISTS sales CASCADE;

COMMIT;
