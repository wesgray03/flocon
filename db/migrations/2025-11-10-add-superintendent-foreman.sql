-- Migration: Add superintendent_id and foreman_id columns to engagements
-- Date: 2025-11-10
-- Description:
--   Add foreign key columns for superintendent and foreman (both reference users table)

-- Add superintendent_id column
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS superintendent_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add foreman_id column
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS foreman_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagements_superintendent_id ON engagements(superintendent_id);
CREATE INDEX IF NOT EXISTS idx_engagements_foreman_id ON engagements(foreman_id);

-- Add comments
COMMENT ON COLUMN engagements.superintendent_id IS 'FK to users table for project superintendent';
COMMENT ON COLUMN engagements.foreman_id IS 'FK to users table for project foreman';
