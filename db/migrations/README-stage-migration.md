# Database Migration: Stage Field Updates

## Overview
This migration updates the `project_dashboard` view to properly handle stage references using `stage_id` and `stage_order` instead of concatenated stage strings.

## Files Changed
- `db/migrations/2025-11-05-update-project-dashboard-stage-fields.sql` - Database migration
- `src/pages/index.tsx` - Updated to use new stage fields
- `src/pages/projects/[id].tsx` - Updated to use new stage fields

## How to Run Migration

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `db/migrations/2025-11-05-update-project-dashboard-stage-fields.sql`
4. Run the migration

### Option 2: Using Supabase CLI (if set up)
```bash
supabase db reset --linked
```

### Option 3: Manual SQL Execution
Connect to your PostgreSQL database and run:
```sql
-- Copy the contents from the migration file
```

## Expected Changes

### Before Migration
- `project_dashboard.stage` contains concatenated strings like "1. Contract Onboarding"
- Stage progression logic was complex and error-prone

### After Migration
- `project_dashboard.stage_id` contains proper UUID references to stages table
- `project_dashboard.stage_name` contains clean stage names like "Contract Onboarding"  
- `project_dashboard.stage_order` contains numeric order for progression logic
- Removed the problematic concatenated `stage` field

## Code Benefits
1. **Cleaner Stage Display**: No more "1. Contract Onboarding", just "Contract Onboarding"
2. **Robust Next Stage Logic**: Uses numeric `stage_order` for reliable progression
3. **Proper Relational Design**: Uses `stage_id` foreign key references
4. **Easier Maintenance**: Clear separation of concerns between display and logic

## Verification
After running the migration:
1. Check that projects display proper stage names without order numbers
2. Verify next stage progression works correctly
3. Ensure stage selection/updates save `stage_id` not concatenated strings

## Rollback (if needed)
If you need to rollback, you can recreate the old view structure, but it's recommended to fix any stage selection logic to use IDs instead.