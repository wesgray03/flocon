-- Simplified one-statement migration to drop legacy party columns from engagements.
-- Uses exec_sql without transaction wrappers (BEGIN/COMMIT removed due to function limitations).
-- Safe to run multiple times (IF EXISTS guards).
ALTER TABLE public.engagements
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS contact_id,
  DROP COLUMN IF EXISTS architect_id,
  DROP COLUMN IF EXISTS sales_contact_id,
  DROP COLUMN IF EXISTS project_manager_id;