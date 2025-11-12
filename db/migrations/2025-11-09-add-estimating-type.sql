-- Migration: Add estimating_type to engagements
-- Date: 2025-11-09
-- Purpose: Track whether estimate is based on budget (no construction docs) or construction docs

BEGIN;

-- Add estimating_type column
-- 'Budget' = preliminary estimate without construction documents
-- 'Construction' = detailed estimate based on construction documents/plans
ALTER TABLE public.engagements 
ADD COLUMN IF NOT EXISTS estimating_type TEXT DEFAULT 'Budget';

-- Add check constraint to ensure valid values
ALTER TABLE public.engagements
DROP CONSTRAINT IF EXISTS engagements_estimating_type_check;

ALTER TABLE public.engagements
ADD CONSTRAINT engagements_estimating_type_check 
CHECK (estimating_type IN ('Budget', 'Construction'));

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_engagements_estimating_type 
ON public.engagements(estimating_type);

COMMIT;
