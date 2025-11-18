-- Rename qbo_customer_id to qbo_id for universal use
-- Run this in Supabase SQL Editor

-- Rename the column
ALTER TABLE companies 
RENAME COLUMN qbo_customer_id TO qbo_id;

-- Drop old index
DROP INDEX IF EXISTS idx_companies_qbo_customer_id;

-- Create new index
CREATE INDEX IF NOT EXISTS idx_companies_qbo_id 
ON companies(qbo_id) 
WHERE qbo_id IS NOT NULL;
