-- Check and fix orphaned contacts (contacts without a company)
-- Run this first to see what contacts need companies assigned

-- Step 1: View all contacts without companies
SELECT id, name, email, contact_type, company_id
FROM contacts 
WHERE company_id IS NULL;

-- Step 2: Option A - Delete orphaned contacts (if they're not needed)
-- Uncomment the line below if you want to delete them:
-- DELETE FROM contacts WHERE company_id IS NULL;

-- Step 2: Option B - Assign them to a default company
-- First, find a company to assign them to:
-- SELECT id, name FROM companies LIMIT 10;

-- Then assign orphaned contacts to that company (replace 'COMPANY_ID_HERE' with actual ID):
-- UPDATE contacts 
-- SET company_id = 'COMPANY_ID_HERE' 
-- WHERE company_id IS NULL;
