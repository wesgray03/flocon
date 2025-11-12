# Production Database Reset and Import

**⚠️ WARNING: This will DELETE ALL DATA in your production database!**

## Pre-Flight Checklist

- [ ] Production database backup completed and verified
- [ ] All migrations applied to production
- [ ] Import CSV files reviewed and customized with your data
- [ ] Test run completed on staging environment
- [ ] Team notified of maintenance window
- [ ] Rollback plan prepared

## Step 1: Backup Production Database

### Option A: Supabase Dashboard

1. Go to Database → Backups
2. Create manual backup
3. Wait for completion
4. Download backup file

### Option B: pg_dump

```bash
# Export schema and data
pg_dump -h [your-project-ref].supabase.co \
  -U postgres \
  -d postgres \
  --clean --if-exists \
  --no-owner --no-acl \
  -f backup-$(date +%Y%m%d-%H%M%S).sql

# Just in case, export data only (no schema)
pg_dump -h [your-project-ref].supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  --no-owner --no-acl \
  -f backup-data-$(date +%Y%m%d-%H%M%S).sql
```

## Step 2: Clear Existing Data

**⚠️ DANGER ZONE - Review carefully before executing!**

```sql
-- Disable RLS temporarily to allow deletion
ALTER TABLE engagement_pay_apps DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_change_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_sov_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_task_completion DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_subcontractors DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagements DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_subcontractor_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_vendor_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE stages DISABLE ROW LEVEL SECURITY;

-- Delete data (reverse order of foreign keys)
TRUNCATE TABLE engagement_pay_apps CASCADE;
TRUNCATE TABLE engagement_change_orders CASCADE;
TRUNCATE TABLE engagement_sov_lines CASCADE;
TRUNCATE TABLE engagement_comments CASCADE;
TRUNCATE TABLE engagement_task_completion CASCADE;
TRUNCATE TABLE engagement_tasks CASCADE;
TRUNCATE TABLE engagement_subcontractors CASCADE;
TRUNCATE TABLE engagement_user_roles CASCADE;
TRUNCATE TABLE engagement_parties CASCADE;
TRUNCATE TABLE engagements CASCADE;
TRUNCATE TABLE company_subcontractor_details CASCADE;
TRUNCATE TABLE company_vendor_details CASCADE;
TRUNCATE TABLE contacts CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE stages CASCADE;

-- Note: Don't truncate users table - Supabase auth manages this

-- Re-enable RLS
ALTER TABLE engagement_pay_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_task_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subcontractor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_vendor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
```

## Step 3: Prepare Import Files

1. Copy templates from `import-templates/` directory
2. Rename files (remove `-template` suffix):
   - `01-stages-template.csv` → `01-stages.csv`
   - `02-users-template.csv` → `02-users.csv`
   - etc.
3. Edit each CSV file with your actual data
4. Verify UUIDs are unique
5. Verify foreign key references match

## Step 4: Import Data

### Option A: Supabase Dashboard (Recommended for small datasets)

Import files in this exact order:

1. **stages**
   - Table Editor → stages → Import Data
   - Upload `01-stages.csv`
   - Map columns
   - Import

2. **users** (if not using Supabase Auth)
   - Skip this if users already exist from Auth
   - Table Editor → users → Import Data
   - Upload `02-users.csv`

3. **companies**
   - Table Editor → companies → Import Data
   - Upload `03-companies.csv`

4. **contacts**
   - Table Editor → contacts → Import Data
   - Upload `04-contacts.csv`

5. **engagements**
   - Table Editor → engagements → Import Data
   - Upload `05-engagements.csv`

6. **engagement_parties**
   - Table Editor → engagement_parties → Import Data
   - Upload `06-engagement-parties.csv`

7. **engagement_user_roles**
   - Table Editor → engagement_user_roles → Import Data
   - Upload `07-engagement-user-roles.csv`

8. **engagement_subcontractors**
   - Table Editor → engagement_subcontractors → Import Data
   - Upload `08-engagement-subcontractors.csv`

9. **engagement_change_orders**
   - Table Editor → engagement_change_orders → Import Data
   - Upload `09-engagement-change-orders.csv`

10. **engagement_pay_apps**
    - Table Editor → engagement_pay_apps → Import Data
    - Upload `10-engagement-pay-apps.csv`

### Option B: SQL COPY Command (For larger datasets)

```sql
-- From psql command line
\copy stages FROM '/absolute/path/to/01-stages.csv' CSV HEADER;
\copy users FROM '/absolute/path/to/02-users.csv' CSV HEADER;
\copy companies FROM '/absolute/path/to/03-companies.csv' CSV HEADER;
\copy contacts FROM '/absolute/path/to/04-contacts.csv' CSV HEADER;
\copy engagements FROM '/absolute/path/to/05-engagements.csv' CSV HEADER;
\copy engagement_parties FROM '/absolute/path/to/06-engagement-parties.csv' CSV HEADER;
\copy engagement_user_roles FROM '/absolute/path/to/07-engagement-user-roles.csv' CSV HEADER;
\copy engagement_subcontractors FROM '/absolute/path/to/08-engagement-subcontractors.csv' CSV HEADER;
\copy engagement_change_orders FROM '/absolute/path/to/09-engagement-change-orders.csv' CSV HEADER;
\copy engagement_pay_apps FROM '/absolute/path/to/10-engagement-pay-apps.csv' CSV HEADER;
```

### Option C: Import Script (Requires setup)

```bash
# Install dependencies
npm install csv-parse

# Dry run (preview only)
npx tsx import-data.ts

# Execute import
npx tsx import-data.ts --execute
```

## Step 5: Verification Queries

```sql
-- Record counts
SELECT
  'stages' as table_name, COUNT(*) as count FROM stages
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'engagements', COUNT(*) FROM engagements
UNION ALL SELECT 'engagement_parties', COUNT(*) FROM engagement_parties
UNION ALL SELECT 'engagement_user_roles', COUNT(*) FROM engagement_user_roles
UNION ALL SELECT 'engagement_subcontractors', COUNT(*) FROM engagement_subcontractors
ORDER BY table_name;

-- Check for orphaned records (should return 0)
SELECT 'engagements_without_stage' as issue, COUNT(*) as count
FROM engagements e
LEFT JOIN stages s ON e.stage_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 'parties_without_engagement', COUNT(*)
FROM engagement_parties ep
LEFT JOIN engagements e ON ep.engagement_id = e.id
WHERE e.id IS NULL

UNION ALL

SELECT 'parties_without_company_or_contact', COUNT(*)
FROM engagement_parties ep
WHERE ep.company_id IS NULL AND ep.contact_id IS NULL

UNION ALL

SELECT 'user_roles_without_engagement', COUNT(*)
FROM engagement_user_roles eur
LEFT JOIN engagements e ON eur.engagement_id = e.id
WHERE e.id IS NULL

UNION ALL

SELECT 'user_roles_without_user', COUNT(*)
FROM engagement_user_roles eur
LEFT JOIN users u ON eur.user_id = u.id
WHERE u.id IS NULL;

-- Verify projects have customers
SELECT
  e.id,
  e.name,
  e.type,
  CASE WHEN ep.id IS NULL THEN 'Missing Customer' ELSE 'Has Customer' END as status
FROM engagements e
LEFT JOIN engagement_parties ep ON e.id = ep.engagement_id AND ep.role = 'customer'
WHERE e.type = 'project'
ORDER BY e.name;

-- Verify financial data
SELECT
  e.name,
  e.contract_amount,
  COALESCE(SUM(eco.amount), 0) as total_change_orders,
  e.contract_amount + COALESCE(SUM(eco.amount), 0) as revised_contract,
  COALESCE(SUM(epa.amount), 0) as total_billed
FROM engagements e
LEFT JOIN engagement_change_orders eco ON e.id = eco.engagement_id
LEFT JOIN engagement_pay_apps epa ON e.id = epa.engagement_id
WHERE e.type = 'project'
GROUP BY e.id, e.name, e.contract_amount
ORDER BY e.name;
```

## Step 6: Test Application

1. **Login** - Verify users can authenticate
2. **Projects List** - Check all projects display correctly
3. **Prospects List** - Check all prospects display correctly
4. **Project Details** - Open a project, verify all sections load
5. **Contacts** - Verify customer/PM/superintendent info
6. **Subcontractors** - Verify subcontractor dropdown and assignments
7. **Financials** - Check contract amount, change orders, billing
8. **User Roles** - Verify sales lead, project lead, foreman display

## Rollback Plan

If something goes wrong:

```sql
-- Quick rollback - restore from backup
-- (Use Supabase dashboard or pg_restore command)

-- Or clear bad data and try again
-- (Run Step 2 again, then re-import)
```

## Post-Import Tasks

- [ ] Verify all queries in Step 5 show correct data
- [ ] Test all application functionality (Step 6)
- [ ] Check for any console errors in browser
- [ ] Verify RLS policies are working (users only see their data)
- [ ] Update team that system is ready
- [ ] Monitor for any issues in first 24 hours

## Troubleshooting

**"Foreign key violation"**: Import order is wrong, or referenced ID doesn't exist

**"RLS policy violation"**: Temporarily disable RLS for import, re-enable after

**"Invalid UUID format"**: Ensure all UUIDs are valid v4 format (8-4-4-4-12 hex digits)

**"Date parse error"**: Use YYYY-MM-DD format for dates

**"Boolean parse error"**: Use true/false, t/f, or 1/0 for booleans

**"Unique constraint violation"**: Duplicate IDs in CSV files
