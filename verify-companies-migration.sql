-- Verify companies table migration status
-- Run this to check if the migration was successful

-- Check if companies table exists (should return 1 row)
SELECT 'companies table exists' AS check_name, COUNT(*) AS result
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'companies'

UNION ALL

-- Check if customers table still exists (should return 0)
SELECT 'customers table exists (should be 0)', COUNT(*)
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'customers'

UNION ALL

-- Check if company_type column exists (should return 1)
SELECT 'company_type column exists', COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name = 'company_type'

UNION ALL

-- Check if is_customer column exists (should return 1)
SELECT 'is_customer column exists', COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name = 'is_customer'

UNION ALL

-- Check if company_id column exists in engagements (should return 1)
SELECT 'company_id in engagements exists', COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'engagements' AND column_name = 'company_id'

UNION ALL

-- Check if customer_id still exists in engagements (should return 0)
SELECT 'customer_id in engagements exists (should be 0)', COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'engagements' AND column_name = 'customer_id';

-- If all checks pass, show sample data
SELECT 'Sample companies data:' AS info;
SELECT id, name, company_type, is_customer, created_at 
FROM companies 
LIMIT 5;
