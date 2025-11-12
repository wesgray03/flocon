# Import Schema from Staging to Production

## Method 1: Use pg_dump (Recommended)

### Step 1: Export schema from Staging

```bash
# Get schema-only dump from staging
pg_dump \
  "postgresql://postgres:[STAGING_PASSWORD]@[STAGING_PROJECT_REF].supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  --schema=public \
  > staging-schema.sql
```

### Step 2: Import to Production

- Open `staging-schema.sql`
- Copy contents
- Paste into Production SQL Editor in Supabase Dashboard
- Run

---

## Method 2: Run All Migration Files (Easier if you have them)

If you have all your migration files tracked in git/locally:

### In Production SQL Editor, run these in order:

```sql
-- Core tables
\i 2025-11-11-create-core-tables.sql
\i 2025-11-11-create-engagement-tables.sql
\i 2025-11-11-add-engagement-subcontractors.sql
\i 2025-11-11-add-company-extensions.sql

-- Relationship refactors
\i 2025-11-11-create-engagement-parties.sql
\i 2025-11-11-create-engagement-user-roles.sql
\i 2025-11-11-migrate-relationships.sql

-- Renames and cleanups
\i 2025-11-11-rename-project-tables.sql
\i 2025-11-11-rename-engagement-financials.sql
\i 2025-11-11-rename-user-roles.sql

-- Views
\i 2025-11-12-replace-dashboard-views-with-thin-views.sql
\i 2025-11-12-remove-vendor-subcontractor-views.sql

-- RLS policies
\i 2025-11-11-add-engagement-subcontractors-rls.sql
\i 2025-11-11-add-company-extension-rls.sql

-- Fixes
\i 2025-11-12-fix-converted-by-user-id.sql
```

---

## Method 3: Manual via Supabase Dashboard (Simplest)

### Step 1: In Staging Dashboard

1. Go to **Database → Schema**
2. Click **Export Schema**
3. Copy the generated SQL

### Step 2: In Production Dashboard

1. Go to **SQL Editor**
2. Paste the schema SQL
3. Click **Run**

---

## Method 4: Copy from migrations directory

Since you have all migrations tracked locally:

1. **Concatenate all migration files:**

```bash
cat migrations/*.sql > complete-schema.sql
```

2. **Run in Production:**

- Open `complete-schema.sql`
- Copy to Production SQL Editor
- Run

---

## After Schema Import: Verify

```sql
-- Check all tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should see: companies, contacts, engagements, engagement_parties,
-- engagement_user_roles, engagement_subcontractors, stages, users, etc.

-- Check views exist
SELECT viewname
FROM pg_views
WHERE schemaname = 'public';

-- Should see: projects_v, prospects_v
```

---

## Recommended Approach for You:

**Use Method 3** (Supabase Dashboard) - it's the simplest and handles everything automatically including:

- Table creation
- Indexes
- Foreign keys
- Views
- RLS policies
- Triggers
