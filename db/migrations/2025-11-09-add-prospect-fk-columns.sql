-- Migration: Add missing FK columns for prospects
-- Description: Add contact_id and architect_id columns to engagements table
-- Note: company_id and owner already exist, just need to use them correctly

BEGIN;

-- Add contact_id for Contact field (PM/Estimator from contacts table)
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Add architect_id for Architect field (companies where company_type='Architect')
ALTER TABLE engagements  
ADD COLUMN IF NOT EXISTS architect_id UUID REFERENCES companies(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_engagements_contact_id ON engagements(contact_id);
CREATE INDEX IF NOT EXISTS idx_engagements_architect_id ON engagements(architect_id);

-- Add comments
COMMENT ON COLUMN engagements.contact_id IS 'FK to contacts table (Project Manager or Estimator for prospects)';
COMMENT ON COLUMN engagements.architect_id IS 'FK to companies table where company_type=Architect';

COMMIT;

-- Note: 
-- company_id already exists - use this for Customer (companies where is_customer=true)
-- owner already exists - use this for Prospect Owner name (query users table for dropdown)
-- sales_contact_id exists but we'll use contact_id instead for consistency
