-- Migration: Add last_call, active fields to engagements and create lost_reasons table
-- Date: 2025-11-12
-- Purpose: Add tracking fields for prospect follow-ups and standardize lost reasons

BEGIN;

-- ============================================================================
-- 1. ADD NEW FIELDS TO ENGAGEMENTS TABLE
-- ============================================================================

-- Add last_call field to track last contact date
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS last_call DATE;

-- Add active field to track if engagement is still being pursued
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Convert lost_reason from text to FK (we'll migrate the data after creating lost_reasons table)
-- First, add the new FK column
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS lost_reason_id UUID;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_engagements_last_call ON engagements(last_call);
CREATE INDEX IF NOT EXISTS idx_engagements_active ON engagements(active);
CREATE INDEX IF NOT EXISTS idx_engagements_lost_reason_id ON engagements(lost_reason_id);

-- Add comments to document the new fields
COMMENT ON COLUMN engagements.last_call IS 'Date of last contact/follow-up with prospect or customer';
COMMENT ON COLUMN engagements.active IS 'Whether the engagement is still actively being pursued (true) or archived/inactive (false)';
COMMENT ON COLUMN engagements.lost_reason_id IS 'FK to lost_reasons table - standardized reason for lost opportunities';

-- ============================================================================
-- 2. CREATE LOST_REASONS LOOKUP TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lost_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active reasons
CREATE INDEX IF NOT EXISTS idx_lost_reasons_active ON lost_reasons(is_active);
CREATE INDEX IF NOT EXISTS idx_lost_reasons_display_order ON lost_reasons(display_order);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lost_reasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lost_reasons_updated_at
BEFORE UPDATE ON lost_reasons
FOR EACH ROW
EXECUTE FUNCTION update_lost_reasons_updated_at();

-- Add comments
COMMENT ON TABLE lost_reasons IS 'Standardized list of reasons why opportunities were lost';
COMMENT ON COLUMN lost_reasons.reason IS 'Short reason label (e.g., "Price Too High", "Chose Competitor")';
COMMENT ON COLUMN lost_reasons.description IS 'Optional detailed description of this lost reason';
COMMENT ON COLUMN lost_reasons.is_active IS 'Whether this reason is currently available for selection';
COMMENT ON COLUMN lost_reasons.display_order IS 'Order in which reasons should appear in dropdowns';

-- ============================================================================
-- 3. SEED COMMON LOST REASONS
-- ============================================================================

INSERT INTO lost_reasons (reason, description, display_order, is_active) VALUES
  ('Price Too High', 'Our bid was not competitive on price', 1, true),
  ('Chose Competitor', 'Customer selected another contractor', 2, true),
  ('Project Cancelled', 'Project was cancelled or put on hold indefinitely', 3, true),
  ('No Response', 'Customer stopped responding to follow-ups', 4, true),
  ('Timeline Not Met', 'Could not meet required schedule', 5, true),
  ('Scope Changed', 'Project scope changed significantly', 6, true),
  ('Budget Cut', 'Customer budget was reduced or eliminated', 7, true),
  ('Lack of Resources', 'We could not commit necessary resources', 8, true),
  ('Other', 'Other reason not listed', 99, true)
ON CONFLICT (reason) DO NOTHING;

-- ============================================================================
-- 4. ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

ALTER TABLE engagements
ADD CONSTRAINT fk_engagements_lost_reason
FOREIGN KEY (lost_reason_id)
REFERENCES lost_reasons(id)
ON DELETE SET NULL;

-- ============================================================================
-- 5. MIGRATE EXISTING DATA
-- ============================================================================

-- For any existing engagements with a text lost_reason, try to match to standardized reasons
-- This is a best-effort migration
UPDATE engagements e
SET lost_reason_id = lr.id
FROM lost_reasons lr
WHERE e.lost_reason IS NOT NULL 
  AND e.lost_reason_id IS NULL
  AND (
    LOWER(e.lost_reason) LIKE '%' || LOWER(lr.reason) || '%'
    OR LOWER(lr.reason) LIKE '%' || LOWER(e.lost_reason) || '%'
  );

-- For any remaining unmapped lost_reason text, create an "Other - [original text]" entry
-- and link to generic "Other" reason
UPDATE engagements
SET lost_reason_id = (SELECT id FROM lost_reasons WHERE reason = 'Other')
WHERE lost_reason IS NOT NULL 
  AND lost_reason_id IS NULL;

-- Note: We're keeping the old lost_reason text column for now in case we need to reference it
-- You can drop it later with: ALTER TABLE engagements DROP COLUMN lost_reason;

COMMIT;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Find all inactive engagements
-- SELECT * FROM engagements WHERE active = false;

-- Find engagements that need follow-up (last_call more than 7 days ago)
-- SELECT * FROM engagements 
-- WHERE type = 'prospect' 
--   AND active = true 
--   AND last_call < CURRENT_DATE - INTERVAL '7 days';

-- Get lost reasons with their usage count
-- SELECT lr.reason, COUNT(e.id) as count
-- FROM lost_reasons lr
-- LEFT JOIN engagements e ON e.lost_reason_id = lr.id
-- GROUP BY lr.id, lr.reason
-- ORDER BY lr.display_order;
