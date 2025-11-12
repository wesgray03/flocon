# Running Prospects Migrations - Quick Start

## Prerequisites

**Step 1: Set up the exec_sql helper function** (ONE TIME ONLY)

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard)
2. Select your **STAGING** database first
3. Copy/paste this entire file: `db/migrations/0000-setup-exec-sql-helper.sql`
4. Click **RUN**
5. Verify you see "Success" ✅

---

## Option 1: PowerShell Script (Easiest for Windows)

```powershell
# Run on STAGING first (recommended)
.\run-prospects-migration.ps1 staging

# After testing, run on PRODUCTION
.\run-prospects-migration.ps1 production
```

**What it does:**
- Runs all 6 migration files in correct order
- Stops if any migration fails
- Shows clear progress and errors
- Asks for confirmation before production

---

## Option 2: Node.js Script

```bash
# Install dependencies (if not already installed)
npm install @supabase/supabase-js

# Run on STAGING
node run-prospects-migration.js staging

# Run on PRODUCTION
node run-prospects-migration.js production
```

---

## Option 3: Manual (Most Control, Recommended for First Time)

**Best if you want to see exactly what's happening:**

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard)
2. Select **STAGING** database
3. Open each migration file in order and run manually:

```
1. db/migrations/0000-setup-exec-sql-helper.sql      ← Run this FIRST
2. db/migrations/2025-11-09-create-trades-table.sql
3. db/migrations/2025-11-09-convert-projects-to-engagements.sql
4. db/migrations/2025-11-09-create-engagement-trades.sql
5. db/migrations/2025-11-09-create-prospect-promotion-functions.sql
6. db/migrations/2025-11-09-create-prospect-project-views.sql
7. db/migrations/2025-11-09-setup-engagements-rls.sql
```

4. Copy/paste each file's content into SQL Editor
5. Click **RUN**
6. Wait for "Success" ✅ before moving to next file

---

## Troubleshooting

### Error: "function public.exec_sql does not exist"
**Solution:** Run `0000-setup-exec-sql-helper.sql` in Supabase SQL Editor first

### Error: "relation 'projects' does not exist"
**Solution:** Make sure you're running on the correct database (staging vs production)

### Error: "type 'engagement_type' already exists"
**Solution:** Migrations already ran - check if data looks correct

### Want to rollback?
See `PROSPECTS-MIGRATION-GUIDE.md` → "Rollback Plan" section

---

## Verification After Migration

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check engagements table exists
SELECT id, type, name FROM engagements LIMIT 5;

-- Check trades were seeded
SELECT code, name FROM trades;

-- Check views work
SELECT * FROM v_prospects LIMIT 1;
SELECT * FROM v_projects LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'engagements';
```

All should return data without errors ✅

---

## My Recommendation

**For your first run:**

1. Use **Option 3 (Manual)** on **STAGING** first
2. Verify everything works (see verification queries above)
3. Test creating a prospect in your UI
4. Once comfortable, use **Option 1 (PowerShell)** for **PRODUCTION**

This gives you maximum control and visibility on the first run.

---

## What Each Script Does

Both scripts:
- ✅ Read SQL files from `db/migrations/`
- ✅ Execute them via Supabase REST API
- ✅ Stop on first error (safe)
- ✅ Track which migrations succeeded
- ✅ Ask for confirmation on production

**PowerShell version:** Native to Windows, no dependencies  
**Node.js version:** Requires npm packages but more portable

---

## Need Help?

If you get stuck:
1. Check Supabase logs (Dashboard → Logs)
2. Review error message carefully
3. See `PROSPECTS-MIGRATION-GUIDE.md` for detailed docs
4. Try manual approach (Option 3) to see exact error

**Ready to go!** 🚀
