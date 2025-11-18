-- Migration: Add QuickBooks ID columns to engagements table
-- Date: 2025-11-17
-- Purpose: Store QuickBooks Customer and Job IDs for two-way sync

BEGIN;

-- Add columns to store QuickBooks IDs
ALTER TABLE engagements 
  ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS qbo_job_id TEXT,
  ADD COLUMN IF NOT EXISTS qbo_last_synced_at TIMESTAMPTZ;

-- Add indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_engagements_qbo_customer 
  ON engagements(qbo_customer_id) 
  WHERE qbo_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_engagements_qbo_job 
  ON engagements(qbo_job_id) 
  WHERE qbo_job_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN engagements.qbo_customer_id IS 'QuickBooks Customer ID (parent company)';
COMMENT ON COLUMN engagements.qbo_job_id IS 'QuickBooks Job ID (sub-customer under customer)';
COMMENT ON COLUMN engagements.qbo_last_synced_at IS 'Last time this engagement was synced to QuickBooks';

COMMIT;

-- Usage Notes:
-- - project_number: Your internal FloCon project number (generated first)
-- - qbo_customer_id: QB Customer entity (the main company)
-- - qbo_job_id: QB Job/Sub-customer entity (the project under the company)
-- - Workflow: Create in FloCon → Generate project_number → Push to QB → Store qbo_customer_id and qbo_job_id
