-- Migration: Add contract_budget to engagements table
-- Date: 2025-11-18
-- Purpose: Track the budgeted cost for the base contract (separate from revenue)

BEGIN;

-- Add contract_budget column
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS contract_budget NUMERIC(15,2) DEFAULT 0.00;

-- Add comment
COMMENT ON COLUMN engagements.contract_budget IS 'Budgeted cost for base contract (not including change orders)';

COMMIT;
