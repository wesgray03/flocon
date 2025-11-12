-- Fix constraint after renaming qbid to project_number
-- The constraint still references old column name causing errors

-- Drop the old constraint
ALTER TABLE engagements DROP CONSTRAINT IF EXISTS chk_no_qbid_on_prospects;

-- Recreate with updated column name
ALTER TABLE engagements 
ADD CONSTRAINT chk_no_project_number_on_prospects
  CHECK (
    (type = 'prospect' AND project_number IS NULL) OR 
    (type = 'project')
  );

COMMENT ON CONSTRAINT chk_no_project_number_on_prospects ON engagements IS 
  'Prospects cannot have a project_number (QuickBooks ID) since they are not yet in QuickBooks';
