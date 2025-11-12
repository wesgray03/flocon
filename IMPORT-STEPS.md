# Production Data Import Steps

## 📁 CSV Files Location

All files are in: `import-templates/parsed/`

## 🔢 Import Order (CRITICAL - Must follow this exact order!)

### 1. Import Stages (12 records)

**File:** `01-stages-template.csv`

- Go to Supabase Dashboard → Table Editor
- Select `stages` table
- Click "Insert" → "Import data from CSV"
- Upload file
- Verify 12 records imported

### 2. Import Users (13 records)

**File:** `02-users-template.csv`

- Select `users` table
- Click "Insert" → "Import data from CSV"
- Upload file
- Verify 13 records imported
- ⚠️ **Note:** `can_manage_prospects` and `can_manage_projects` default to false
  - Update these manually after import based on user roles

### 3. Import Companies (14 records)

**File:** `03-companies-template.csv`

- Select `companies` table
- Click "Insert" → "Import data from CSV"
- Upload file
- Verify 14 records imported

### 4. Import Contacts (31 records)

**File:** `04-contacts-template.csv`

- Select `contacts` table
- Click "Insert" → "Import data from CSV"
- Upload file
- Verify 31 records imported

### 5. Import Engagements (54 records)

**File:** `05-engagements.csv`

- Select `engagements` table
- Click "Insert" → "Import data from CSV"
- Upload file
- Verify 54 records imported

### 6. Import Engagement Parties (50 records)

**File:** `06-engagement-parties.csv`

- Select `engagement_parties` table
- Click "Insert" → "Import data from CSV"
- Upload file
- Verify 50 records imported

## 🔄 Post-Import Tasks

### Run Auto-Complete Script

After all CSV imports are complete, execute the SQL script to mark tasks as complete for stages already passed by projects:

```sql
-- Run this in Supabase SQL Editor
-- File: post-import-autocomplete-tasks.sql
```

This script:

- Only affects projects (not prospects)
- Marks tasks as complete for stages already passed
- Requires task templates to be set up first (if not done, can skip for now)

## ✅ Verification Checklist

### Check Record Counts

Run these queries in Supabase SQL Editor:

```sql
SELECT 'stages' as table_name, COUNT(*) as count FROM stages
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'engagements', COUNT(*) FROM engagements
UNION ALL
SELECT 'engagement_parties', COUNT(*) FROM engagement_parties;
```

Expected counts:

- stages: 12
- users: 13
- companies: 14
- contacts: 31
- engagements: 54
- engagement_parties: 50

### Verify Engagement Parties

Check that all engagements have customers:

```sql
SELECT
  e.name as engagement_name,
  e.type,
  COUNT(ep.id) as party_count,
  SUM(CASE WHEN ep.role = 'customer' THEN 1 ELSE 0 END) as customer_count
FROM engagements e
LEFT JOIN engagement_parties ep ON ep.engagement_id = e.id
GROUP BY e.id, e.name, e.type
HAVING SUM(CASE WHEN ep.role = 'customer' THEN 1 ELSE 0 END) = 0;
```

Should return 0 rows (all engagements should have a customer).

### Verify Projects Have User Roles

Check that all projects have necessary user roles:

```sql
SELECT
  e.name as project_name,
  e.project_number,
  SUM(CASE WHEN ep.role = 'project_manager' THEN 1 ELSE 0 END) as has_pm,
  SUM(CASE WHEN ep.role = 'superintendent' THEN 1 ELSE 0 END) as has_super
FROM engagements e
LEFT JOIN engagement_parties ep ON ep.engagement_id = e.id
WHERE e.type = 'project'
GROUP BY e.id, e.name, e.project_number;
```

### Test App Functionality

1. Log into the app
2. Navigate to Projects dashboard
3. Navigate to Prospects dashboard
4. Open a few project details
5. Verify data displays correctly

## ⚠️ Important Notes

### CSV Import Format Requirements

- UUIDs: Standard UUID format (lowercase with hyphens)
- Empty fields: Leave blank, NOT "NULL" string
- Boolean values: `true` or `false` (lowercase)
- Dates: `YYYY-MM-DD` format
- Timestamps: `YYYY-MM-DD HH:MM:SS` format

### If Import Fails

1. Check the error message for column mismatches
2. Verify CSV column headers match table columns exactly
3. Check for UUID format issues
4. Ensure no circular foreign key dependencies
5. Make sure previous tables were imported first

### Task Templates

- `engagement_tasks` table will be empty initially
- Auto-complete script will have nothing to complete without task templates
- Can add task templates later or skip for now

## 📝 Current Status

- [ ] 1. Import stages
- [ ] 2. Import users
- [ ] 3. Import companies
- [ ] 4. Import contacts
- [ ] 5. Import engagements
- [ ] 6. Import engagement_parties
- [ ] 7. Run post-import-autocomplete-tasks.sql
- [ ] 8. Verify data integrity
- [ ] 9. Test app login and navigation

---

**Ready to begin?** Start with Step 1: Import Stages CSV file.
