-- Migration: Add prospect_status field to engagements
-- Date: 2025-11-21
-- Purpose: Track prospect lifecycle status (active, won, lost, delayed, cancelled)

BEGIN;

-- Add prospect_status column
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS prospect_status TEXT 
CHECK (prospect_status IN ('active', 'won', 'lost', 'delayed', 'cancelled'))
DEFAULT 'active';

-- Backfill existing data
UPDATE engagements 
SET prospect_status = CASE 
  WHEN type = 'project' THEN 'won'
  WHEN type = 'prospect' AND active = false AND lost_reason_id IS NOT NULL THEN 'lost'
  WHEN type = 'prospect' AND active = true THEN 'active'
  ELSE 'active'
END
WHERE prospect_status IS NULL OR prospect_status = 'active';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_engagements_prospect_status 
ON engagements(type, prospect_status) WHERE type = 'prospect';

-- Add comment
COMMENT ON COLUMN engagements.prospect_status IS 'Prospect lifecycle status: active (default), won (converted to project), lost (inactive), delayed (active but postponed), cancelled (inactive)';

COMMIT;
