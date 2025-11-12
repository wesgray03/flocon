-- Migration: Refactor engagements table to use contact references
-- Date: 2025-11-09
-- Purpose: Replace text-based owner field with FK references to contacts table
-- Changes:
--   - Rename 'owner' field to 'project_manager_id' (FK to contacts where contact_type='Project Manager')
--   - Add 'contact_id' field (FK to contacts for PM or Estimator)
--   - Keep old text fields temporarily for rollback capability
--   - Update project_dashboard view

BEGIN;

-- Step 1: Add new FK columns to engagements table
ALTER TABLE public.engagements 
  ADD COLUMN IF NOT EXISTS project_manager_id UUID,
  ADD COLUMN IF NOT EXISTS contact_id UUID;

-- Step 2: Add foreign key constraints
ALTER TABLE public.engagements
  ADD CONSTRAINT fk_engagements_project_manager
    FOREIGN KEY (project_manager_id) 
    REFERENCES public.contacts(id)
    ON DELETE SET NULL;

ALTER TABLE public.engagements
  ADD CONSTRAINT fk_engagements_contact
    FOREIGN KEY (contact_id) 
    REFERENCES public.contacts(id)
    ON DELETE SET NULL;

-- Step 3: Migrate data from text fields to FK references
-- Map 'owner' (text) to contacts with matching name and contact_type='Project Manager'
UPDATE public.engagements e
SET project_manager_id = c.id
FROM public.contacts c
WHERE c.name = e.owner 
  AND c.contact_type = 'Project Manager'
  AND e.type = 'project';  -- Only for projects, not prospects

-- Step 4: Update project_dashboard view to use the new FK joins
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT 
  e.id,
  e.qbid,
  e.name AS project_name,
  co.name AS customer_name,
  co.company_type,
  co.is_customer,
  e.owner AS manager,                    -- Old text field (deprecated, kept for compatibility)
  pm.name AS project_manager,            -- New: actual project manager from contacts
  pm.id AS project_manager_id,           -- ID for editing
  cont.name AS contact,                  -- New: contact person from contacts
  cont.id AS contact_id,                 -- ID for editing
  cont.contact_type AS contact_type,     -- Type of contact (PM, Estimator, etc.)
  e.sales AS owner,                      -- This is the prospect owner/sales person (user name)
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  COALESCE(e.contract_amount, 0::numeric) AS contract_amt,
  COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) AS co_amt,
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) AS total_amt,
  COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.project_id = e.id
  ), 0::numeric) AS billed_amt,
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) - COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.project_id = e.id
  ), 0::numeric) AS balance
FROM engagements e
LEFT JOIN companies co ON e.company_id = co.id
LEFT JOIN stages s ON e.stage_id = s.id
LEFT JOIN contacts pm ON e.project_manager_id = pm.id
LEFT JOIN contacts cont ON e.contact_id = cont.id
WHERE e.type = 'project';

COMMENT ON VIEW project_dashboard IS 'Project dashboard view with contact references';

-- Step 5: Add helpful comments
COMMENT ON COLUMN public.engagements.project_manager_id IS 'Foreign key to contacts table for Project Manager (replaces text owner field)';
COMMENT ON COLUMN public.engagements.contact_id IS 'Foreign key to contacts table for primary contact (PM or Estimator)';

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagements_project_manager ON engagements(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_engagements_contact ON engagements(contact_id);

-- Step 7: Future cleanup (uncomment after verifying migration worked)
-- After confirming everything works, you can drop the old text fields:
-- ALTER TABLE public.engagements DROP COLUMN IF EXISTS owner;

COMMIT;

