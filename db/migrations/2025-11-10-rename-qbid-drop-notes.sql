-- Migration: Rename qbid to project_number and drop unused columns
-- Date: 2025-11-10
-- Description:
--   1. Drop project_dashboard view (depends on project_number)
--   2. Drop unused 'project_number' column (currently all NULL)
--   3. Rename 'qbid' to 'project_number' 
--   4. Drop 'scope_summary' column (currently all NULL)
--   5. Drop 'notes' column (per user request - has data so backup first!)
--   6. Recreate project_dashboard view with new column name

-- Step 1: Drop the view that depends on project_number
DROP VIEW IF EXISTS project_dashboard CASCADE;

-- Step 2: Drop the old unused project_number column
ALTER TABLE engagements DROP COLUMN IF EXISTS project_number;

-- Step 3: Rename qbid to project_number
ALTER TABLE engagements RENAME COLUMN qbid TO project_number;

-- Step 4: Drop scope_summary (unused)
ALTER TABLE engagements DROP COLUMN IF EXISTS scope_summary;

-- Step 5: Drop notes column (has 71 records with data - backed up)
-- WARNING: This column has data! Backed up to backups/ directory.
ALTER TABLE engagements DROP COLUMN IF EXISTS notes;

-- Step 6: Recreate project_dashboard view with new column name (simplified)
CREATE OR REPLACE VIEW project_dashboard AS
SELECT
  e.id,
  e.project_number,  -- Renamed from qbid
  e.name AS project_name,
  u.name AS owner,
  e.user_id,
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  e.contract_amount,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN stages s ON e.stage_id = s.id
LEFT JOIN users u ON e.user_id = u.id
WHERE e.type = 'project';
