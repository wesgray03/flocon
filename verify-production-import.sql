-- Post-Import Verification Script
-- Run this after importing all CSV files to verify data integrity

-- ============================================
-- 1. CHECK RECORD COUNTS
-- ============================================
SELECT 'RECORD COUNTS' as check_type, '' as details;

SELECT 
  'stages' as table_name, 
  COUNT(*) as actual_count,
  12 as expected_count,
  CASE WHEN COUNT(*) = 12 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM stages
UNION ALL
SELECT 
  'users', 
  COUNT(*),
  13,
  CASE WHEN COUNT(*) = 13 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM users
UNION ALL
SELECT 
  'companies', 
  COUNT(*),
  14,
  CASE WHEN COUNT(*) = 14 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM companies
UNION ALL
SELECT 
  'contacts', 
  COUNT(*),
  31,
  CASE WHEN COUNT(*) = 31 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM contacts
UNION ALL
SELECT 
  'engagements', 
  COUNT(*),
  54,
  CASE WHEN COUNT(*) = 54 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM engagements
UNION ALL
SELECT 
  'engagement_parties', 
  COUNT(*),
  50,
  CASE WHEN COUNT(*) = 50 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM engagement_parties;

-- ============================================
-- 2. CHECK ENGAGEMENT TYPES BREAKDOWN
-- ============================================
SELECT 'ENGAGEMENT TYPES' as check_type, '' as details;

SELECT 
  type,
  COUNT(*) as count
FROM engagements
GROUP BY type
ORDER BY type;

-- ============================================
-- 3. CHECK ENGAGEMENTS WITHOUT CUSTOMERS
-- ============================================
SELECT 'ENGAGEMENTS WITHOUT CUSTOMERS (should be 0)' as check_type, '' as details;

SELECT 
  e.id,
  e.name,
  e.type,
  e.project_number,
  COUNT(ep.id) as total_parties,
  SUM(CASE WHEN ep.role = 'customer' THEN 1 ELSE 0 END) as customer_count
FROM engagements e
LEFT JOIN engagement_parties ep ON ep.engagement_id = e.id
GROUP BY e.id, e.name, e.type, e.project_number
HAVING SUM(CASE WHEN ep.role = 'customer' THEN 1 ELSE 0 END) = 0
ORDER BY e.type, e.name;

-- ============================================
-- 4. CHECK PROJECTS WITHOUT PROJECT MANAGERS
-- ============================================
SELECT 'PROJECTS WITHOUT PROJECT MANAGERS (should be 0)' as check_type, '' as details;

SELECT 
  e.id,
  e.name,
  e.project_number,
  SUM(CASE WHEN ep.role = 'project_manager' THEN 1 ELSE 0 END) as pm_count
FROM engagements e
LEFT JOIN engagement_parties ep ON ep.engagement_id = e.id
WHERE e.type = 'project'
GROUP BY e.id, e.name, e.project_number
HAVING SUM(CASE WHEN ep.role = 'project_manager' THEN 1 ELSE 0 END) = 0
ORDER BY e.name;

-- ============================================
-- 5. CHECK PROJECT STAGE DISTRIBUTION
-- ============================================
SELECT 'PROJECT STAGE DISTRIBUTION' as check_type, '' as details;

SELECT 
  s.name as stage_name,
  s.order as stage_order,
  COUNT(e.id) as project_count
FROM stages s
LEFT JOIN engagements e ON e.stage_id = s.id AND e.type = 'project'
GROUP BY s.id, s.name, s.order
ORDER BY s.order;

-- ============================================
-- 6. CHECK PARTY ROLE DISTRIBUTION
-- ============================================
SELECT 'PARTY ROLE DISTRIBUTION' as check_type, '' as details;

SELECT 
  role,
  COUNT(*) as count,
  COUNT(DISTINCT engagement_id) as unique_engagements
FROM engagement_parties
GROUP BY role
ORDER BY role;

-- ============================================
-- 7. CHECK ORPHANED CONTACTS
-- ============================================
SELECT 'ORPHANED CONTACTS (should be 0)' as check_type, '' as details;

SELECT 
  c.id,
  c.first_name,
  c.last_name,
  c.email,
  c.company_id
FROM contacts c
LEFT JOIN companies co ON co.id = c.company_id
WHERE c.company_id IS NOT NULL AND co.id IS NULL;

-- ============================================
-- 8. CHECK USER PERMISSIONS SUMMARY
-- ============================================
SELECT 'USER PERMISSIONS SUMMARY' as check_type, '' as details;

SELECT 
  role,
  can_manage_prospects,
  can_manage_projects,
  COUNT(*) as user_count
FROM users
GROUP BY role, can_manage_prospects, can_manage_projects
ORDER BY role;

-- ============================================
-- 9. CHECK PARTY REFERENCES (Companies vs Contacts)
-- ============================================
SELECT 'PARTY REFERENCES' as check_type, '' as details;

SELECT 
  'Companies' as party_type,
  COUNT(*) as count
FROM engagement_parties
WHERE party_id IN (SELECT id FROM companies)
UNION ALL
SELECT 
  'Contacts',
  COUNT(*)
FROM engagement_parties
WHERE party_id IN (SELECT id FROM contacts);

-- ============================================
-- 10. CHECK FOR NULL CRITICAL FIELDS
-- ============================================
SELECT 'NULL CRITICAL FIELDS IN ENGAGEMENTS' as check_type, '' as details;

SELECT 
  id,
  name,
  type,
  CASE 
    WHEN type IS NULL THEN 'Missing type'
  WHEN stage_id IS NULL AND type = 'project' THEN 'Missing stage (project)'
    WHEN name IS NULL OR name = '' THEN 'Missing name'
    ELSE 'Other issue'
  END as issue
FROM engagements
WHERE 
  type IS NULL 
  OR (stage_id IS NULL AND type = 'project')
  OR name IS NULL 
  OR name = '';

-- ============================================
-- SUMMARY
-- ============================================
SELECT '============================================' as summary;
SELECT 'IMPORT VERIFICATION COMPLETE' as summary;
SELECT 'Review results above for any ❌ FAIL statuses' as summary;
SELECT '============================================' as summary;
