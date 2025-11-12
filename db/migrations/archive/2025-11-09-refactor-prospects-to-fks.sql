-- Migration: Refactor prospects (engagements where type='prospect') to use FK references
-- Description: Replace text fields with FK references to companies, contacts, and users tables
-- Changes:
--   - customer_name → company_id (FK to companies where is_customer=true)
--   - contact → contact_id (FK to contacts where contact_type IN ('Project Manager', 'Estimator'))
--   - owner → prospect_owner_id (FK to users, all types)
--   - architect → architect_id (FK to companies where company_type='Architect')
--   - Remove sales field (replaced by prospect_owner_id)

BEGIN;

-- Step 1: Add new FK columns to engagements table
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS prospect_owner_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS architect_id UUID REFERENCES companies(id);

-- Step 2: Migrate existing data (optional - can skip if you want to clear data)
-- This attempts to match text names to FK records

-- Migrate customer_name to customer_id (companies where is_customer=true)
UPDATE engagements e
SET customer_id = c.id
FROM companies c
WHERE 
  e.type = 'prospect'
  AND e.customer_name IS NOT NULL
  AND e.customer_name != ''
  AND c.name ILIKE e.customer_name
  AND c.is_customer = true;

-- Migrate contact to contact_id (contacts where type PM or Estimator)
UPDATE engagements e
SET contact_id = c.id
FROM contacts c
WHERE 
  e.type = 'prospect'
  AND e.contact IS NOT NULL
  AND e.contact != ''
  AND c.name ILIKE e.contact
  AND c.contact_type IN ('Project Manager', 'Estimator');

-- Migrate owner/sales to prospect_owner_id (all users)
-- Try owner field first
UPDATE engagements e
SET prospect_owner_id = u.id
FROM users u
WHERE 
  e.type = 'prospect'
  AND e.owner IS NOT NULL
  AND e.owner != ''
  AND u.name ILIKE e.owner;

-- If owner was null, try sales field
UPDATE engagements e
SET prospect_owner_id = u.id
FROM users u
WHERE 
  e.type = 'prospect'
  AND e.prospect_owner_id IS NULL
  AND e.sales IS NOT NULL
  AND e.sales != ''
  AND u.name ILIKE e.sales;

-- Migrate architect to architect_id (companies where type=Architect)
UPDATE engagements e
SET architect_id = c.id
FROM companies c
WHERE 
  e.type = 'prospect'
  AND e.architect IS NOT NULL
  AND e.architect != ''
  AND c.name ILIKE e.architect
  AND c.company_type = 'Architect';

-- Step 3: Drop old text columns (if you want to keep data migration, comment these out)
-- Keeping company_id (already exists for projects), dropping customer_name
ALTER TABLE engagements DROP COLUMN IF EXISTS customer_name;
ALTER TABLE engagements DROP COLUMN IF EXISTS contact;
ALTER TABLE engagements DROP COLUMN IF EXISTS owner;
ALTER TABLE engagements DROP COLUMN IF EXISTS architect;
ALTER TABLE engagements DROP COLUMN IF EXISTS sales;

-- Step 4: Update company_id to reference customer_id for consistency
-- (company_id already exists, so we ensure it points to the customer)
UPDATE engagements
SET company_id = customer_id
WHERE type = 'prospect' AND customer_id IS NOT NULL;

-- Now we can drop the duplicate customer_id column
ALTER TABLE engagements DROP COLUMN IF EXISTS customer_id;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagements_company_id ON engagements(company_id);
CREATE INDEX IF NOT EXISTS idx_engagements_contact_id ON engagements(contact_id);
CREATE INDEX IF NOT EXISTS idx_engagements_prospect_owner_id ON engagements(prospect_owner_id);
CREATE INDEX IF NOT EXISTS idx_engagements_architect_id ON engagements(architect_id);

-- Step 6: Add helpful comments
COMMENT ON COLUMN engagements.company_id IS 'FK to companies table (customer for prospects, customer for projects)';
COMMENT ON COLUMN engagements.contact_id IS 'FK to contacts table (Project Manager or Estimator)';
COMMENT ON COLUMN engagements.prospect_owner_id IS 'FK to users table (internal person who owns the prospect)';
COMMENT ON COLUMN engagements.architect_id IS 'FK to companies table where company_type=Architect';

COMMIT;

-- Verification queries (run these after migration to check results):
-- SELECT id, name, company_id, contact_id, prospect_owner_id, architect_id FROM engagements WHERE type='prospect' LIMIT 10;
-- SELECT COUNT(*) as prospects_with_customer FROM engagements WHERE type='prospect' AND company_id IS NOT NULL;
-- SELECT COUNT(*) as prospects_with_contact FROM engagements WHERE type='prospect' AND contact_id IS NOT NULL;
-- SELECT COUNT(*) as prospects_with_owner FROM engagements WHERE type='prospect' AND prospect_owner_id IS NOT NULL;
-- SELECT COUNT(*) as prospects_with_architect FROM engagements WHERE type='prospect' AND architect_id IS NOT NULL;
