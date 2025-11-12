-- Migration: Add probability_level_id FK and drop old probability fields
-- Date: 2025-11-13
-- Purpose: Link engagements to probability_levels lookup table and remove redundant fields

BEGIN;

-- Drop old probability fields
ALTER TABLE engagements 
DROP COLUMN IF EXISTS probability CASCADE;

ALTER TABLE engagements 
DROP COLUMN IF EXISTS probability_percent CASCADE;

-- Add probability_level_id foreign key column
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS probability_level_id UUID 
REFERENCES probability_levels(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_engagements_probability_level_id 
ON engagements(probability_level_id);

-- Add comment
COMMENT ON COLUMN engagements.probability_level_id 
IS 'FK to probability_levels table - standardized probability level for prospects';

COMMIT;
