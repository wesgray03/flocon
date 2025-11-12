-- Migration: Replace text owner field with user_id FK
-- Date: 2025-11-10
-- Purpose: Convert owner (text) to user_id (UUID FK to users table)

-- Step 1: Ensure user_id column exists and has proper FK
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Step 2: Migrate existing owner text values to user_id
-- Match by name (case-insensitive)
UPDATE engagements e
SET user_id = u.id
FROM users u
WHERE 
  e.owner IS NOT NULL 
  AND e.owner != ''
  AND e.user_id IS NULL
  AND LOWER(TRIM(e.owner)) = LOWER(TRIM(u.name));

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_engagements_user_id ON engagements(user_id);

-- Step 4: Update project_dashboard view to use user_id
DROP VIEW IF EXISTS project_dashboard CASCADE;

CREATE OR REPLACE VIEW project_dashboard AS
SELECT 
  e.id,
  e.name AS project_name,
  e.qbid,
  e.project_number,
  customer.party_name as customer_name,
  pm.party_name as project_manager_name,
  u.name as owner,  -- From user_id FK
  e.user_id,
  e.probability,
  e.probability_percent,
  e.stage_id,
  s.name as stage_name,
  e.contract_amount as contract_amt,
  e.contract_amount as total_amt,
  e.start_date,
  e.end_date,
  e.est_start_date,
  e.notes,
  e.sharepoint_folder,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN (
  SELECT engagement_id, party_name 
  FROM engagement_parties_detailed 
  WHERE role = 'customer' AND is_primary = true
) customer ON e.id = customer.engagement_id
LEFT JOIN (
  SELECT engagement_id, party_name 
  FROM engagement_parties_detailed 
  WHERE role = 'project_manager' AND is_primary = true
) pm ON e.id = pm.engagement_id
LEFT JOIN users u ON e.user_id = u.id
LEFT JOIN stages s ON e.stage_id = s.id
WHERE e.type = 'project'
ORDER BY e.updated_at DESC;

COMMENT ON VIEW project_dashboard IS 'Project dashboard using user_id FK for owner and engagement_parties for external parties';

-- Step 5: Drop the legacy owner text column
ALTER TABLE engagements
DROP COLUMN IF EXISTS owner;
