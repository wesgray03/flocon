-- Add contract_budget column to engagements table
ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS contract_budget numeric(12, 2);
