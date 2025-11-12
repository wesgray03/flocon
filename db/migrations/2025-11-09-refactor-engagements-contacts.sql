-- Migration: Refactor engagements to use contact references
-- Description: Change owner field to project_manager_id (FK to contacts where contact_type='Project Manager')
--              Add contact_id field (FK to contacts for PM or Estimator)

-- Step 1: Add new columns
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Step 2: Create a mapping function to find contact_id by name and type
-- This will help us migrate the existing text data to contact references

-- For project managers (owner field → project_manager_id)
UPDATE engagements e
SET project_manager_id = c.id
FROM contacts c
WHERE 
  e.owner IS NOT NULL 
  AND e.owner != ''
  AND c.name ILIKE e.owner
  AND c.contact_type = 'Project Manager';

-- Note: We'll populate contact_id through the UI since there's no existing field to migrate from

-- Step 3: Recreate the project_dashboard view to use the new FK columns
DROP VIEW IF EXISTS project_dashboard CASCADE;

CREATE OR REPLACE VIEW project_dashboard AS
SELECT 
  e.id,
  e.name AS project_name,
  e.qbid,
  e.company_id,
  co.name as customer_name,
  e.owner as manager,  -- Keep for backward compatibility (Projects page expects 'manager')
  pm.name as owner,  -- NEW: Join to contacts for Project Manager (Projects page expects 'owner')
  e.project_manager_id,  -- NEW: FK to contacts
  cont.name as contact,  -- NEW: Join to contacts for contact
  cont.contact_type as contact_type,  -- NEW: Show what type of contact
  e.contact_id,  -- NEW: FK to contacts
  e.sales,
  e.probability,
  e.probability_percent,
  e.stage_id,
  s.name as stage_name,
  s.order as stage_order,
  e.contract_amount as contract_amt,
  0 as co_amt,  -- Change orders amount (not yet implemented)
  e.contract_amount as total_amt,
  0 as billed_amt,  -- Billed amount (not yet implemented)
  e.contract_amount as balance,
  e.start_date,
  e.end_date,
  e.notes,
  e.sharepoint_folder,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN companies co ON e.company_id = co.id
LEFT JOIN contacts pm ON e.project_manager_id = pm.id
LEFT JOIN contacts cont ON e.contact_id = cont.id
LEFT JOIN stages s ON e.stage_id = s.id
WHERE e.type = 'project'
ORDER BY e.updated_at DESC;

-- Add helpful comment
COMMENT ON VIEW project_dashboard IS 'Project dashboard view with contact references. Includes both old text fields (owner, manager) and new FK fields (project_manager_id, contact_id) during transition.';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagements_project_manager_id ON engagements(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_engagements_contact_id ON engagements(contact_id);
