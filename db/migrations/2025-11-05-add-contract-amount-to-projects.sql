-- Migration: Add contract_amount to projects table
-- Date: 2025-11-05
-- Purpose: Track the original contract amount for each project

BEGIN;

-- Add contract_amount column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'contract_amount'
  ) THEN
    ALTER TABLE projects ADD COLUMN contract_amount NUMERIC(15, 2) DEFAULT 0.00;
  END IF;
END $$;

COMMIT;

-- Note: contract_amount represents the original contract value before any change orders
