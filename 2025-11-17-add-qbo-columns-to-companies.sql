-- Add QuickBooks sync columns to companies table
-- Run this in Supabase SQL Editor

-- Add QB customer ID column
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT;

-- Add timestamp when synced
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS qbo_last_synced_at TIMESTAMPTZ;

-- Create index on qbo_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_qbo_customer_id 
ON companies(qbo_customer_id) 
WHERE qbo_customer_id IS NOT NULL;
