-- Migration: Add user_id for project owner
-- Date: 2025-11-09
-- Purpose: Add FK to users table for project owner field

BEGIN;

-- Add user_id column to engagements
ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_engagements_user_id ON engagements(user_id);

-- Add comment
COMMENT ON COLUMN public.engagements.user_id IS 'FK to users table - the internal person who owns the project';

-- Update the view to include user name from users table
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT 
  e.id,
  e.qbid,
  e.name AS project_name,
  c.name AS customer_name,
  e.owner AS manager,          -- Project manager name (text field)
  u.name AS owner,              -- Project owner from users table
  e.user_id,                    -- FK to users
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
LEFT JOIN companies c ON e.company_id = c.id
LEFT JOIN stages s ON e.stage_id = s.id
LEFT JOIN users u ON e.user_id = u.id
WHERE e.type = 'project';

COMMENT ON VIEW project_dashboard IS 'Project dashboard view - manager from text, owner from users table';

COMMIT;
