# Production Deployment Guide - Project Task Completion

**Date:** November 7, 2025  
**Migration:** `2025-11-07-create-project-task-completion.sql`

## Overview

This migration changes how project task completion is tracked. Previously, tasks were marked complete globally (affecting all projects). Now, each project tracks its own task completion independently.

## Database Changes

### New Table: `project_task_completion`

A junction table that tracks which tasks are complete for each project.

**Schema:**
```sql
CREATE TABLE project_task_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, task_id)
);
```

**Indexes:**
- `idx_project_task_completion_project_id` - For querying tasks by project
- `idx_project_task_completion_task_id` - For querying projects by task
- `idx_project_task_completion_complete` - For filtering by completion status

**Trigger:**
- `update_project_task_completion_updated_at()` - Auto-updates `updated_at` timestamp and sets `completed_at` when task is marked complete

### Modified Table: `project_tasks`

**Removed Column:**
- `complete` - No longer needed as completion is now per-project in `project_task_completion`

## Pre-Deployment Checklist

1. ✅ **Backup Database**
   ```bash
   # Create a full backup before running migration
   pg_dump -h <host> -U <user> -d <database> > backup_before_task_completion_migration.sql
   ```

2. ✅ **Review Migration File**
   - File: `db/migrations/2025-11-07-create-project-task-completion.sql`
   - Read through the entire migration
   - Understand that existing task completion data will be lost

3. ✅ **Data Loss Warning**
   - ⚠️ The `complete` column will be dropped from `project_tasks`
   - Any existing completion data will be lost
   - All tasks will start as "not complete" for all projects

## Deployment Steps

### Option 1: Using Supabase Dashboard (Recommended for Production)

1. Log into Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of `2025-11-07-create-project-task-completion.sql`
4. Paste into SQL Editor
5. Review the SQL carefully
6. Click "Run" to execute

### Option 2: Using Command Line

```bash
# Navigate to project directory
cd db/migrations

# Run migration (adjust connection string for production)
psql -h <production-host> -U <production-user> -d <production-db> -f 2025-11-07-create-project-task-completion.sql
```

### Option 3: Using Migration Script

```bash
# If you have a migration runner
npm run migrate:prod
# or
node run-migration.js 2025-11-07-create-project-task-completion.sql
```

## Post-Deployment Verification

Run these queries to verify the migration succeeded:

```sql
-- 1. Check that table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'project_task_completion';

-- 2. Check that indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'project_task_completion';

-- 3. Check that complete column was removed from project_tasks
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project_tasks' 
  AND column_name = 'complete';
-- Should return 0 rows

-- 4. Check that triggers were created
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'project_task_completion';

-- 5. Test inserting a completion record
INSERT INTO project_task_completion (project_id, task_id, complete)
VALUES (
  (SELECT id FROM projects LIMIT 1),
  (SELECT id FROM project_tasks LIMIT 1),
  true
);
-- Should succeed without errors

-- 6. Verify trigger sets completed_at
SELECT completed_at 
FROM project_task_completion 
WHERE complete = true 
LIMIT 1;
-- Should have a timestamp
```

## Row Level Security (RLS)

The migration includes RLS policies. Verify they're active:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'project_task_completion';

-- Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'project_task_completion';
```

Expected policies:
- `project_task_completion_select_policy` - SELECT for authenticated users
- `project_task_completion_insert_policy` - INSERT for authenticated users
- `project_task_completion_update_policy` - UPDATE for authenticated users
- `project_task_completion_delete_policy` - DELETE for authenticated users

## Rollback Plan

If issues occur, run this rollback:

```sql
BEGIN;

-- Restore the complete column to project_tasks
ALTER TABLE project_tasks 
ADD COLUMN complete BOOLEAN NOT NULL DEFAULT false;

-- Drop the new table (CASCADE will drop foreign keys)
DROP TABLE IF EXISTS project_task_completion CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_project_task_completion_updated_at CASCADE;

COMMIT;
```

⚠️ **Note:** Rolling back will lose all task completion data entered after the migration.

## Application Code Changes

The following files were updated to use the new schema:

### Backend/Database Queries:
1. `src/lib/hooks/useProjectTasks.ts` - Updated to use LEFT JOIN with `project_task_completion`
2. `src/components/project/StageTasksModal.tsx` - Updated task queries and toggle logic

### Key Changes:
- Queries now use `LEFT JOIN project_task_completion` to get per-project completion status
- `toggleTask` function inserts/updates records in `project_task_completion` instead of updating `project_tasks`
- All queries filter by `project_id` to ensure project-specific completion

## Testing Checklist

After deployment, test the following:

- [ ] View project status - tasks display correctly
- [ ] Check task checkbox - marks as complete
- [ ] Uncheck task checkbox - marks as incomplete  
- [ ] Check task in one project - doesn't affect other projects
- [ ] Auto-advance to next stage when all tasks complete
- [ ] Edit tasks modal - can add/remove/toggle tasks
- [ ] Navigate backward to previous stage
- [ ] Warning badge shows when prior tasks incomplete
- [ ] Multiple users can complete tasks simultaneously

## Support Contact

If issues arise during deployment:
- Review this document
- Check Supabase logs for errors
- Verify all queries in the application code
- Contact: [Your contact info]

## Notes

- This migration is **not reversible** without data loss
- Production deployment should be done during low-traffic hours
- Monitor application logs immediately after deployment
- Have rollback script ready if critical issues occur

---

**Deployed by:** _________________  
**Deployment Date:** _________________  
**Verified by:** _________________  
**Issues encountered:** _________________
