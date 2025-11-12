# View Refactoring Summary - 2025-11-12

## Overview

Replaced complex computed dashboard views with thin filter-only views for easier maintenance during active development.

## Changes Made

### Database Views

**Before:**

- `project_dashboard` - Complex view with subqueries computing parties, user roles, and financial data
- `prospect_dashboard` - Complex view with subqueries computing trades and probability

**After:**

- `projects_v` - Thin view: `SELECT * FROM engagements WHERE type = 'project'`
- `prospects_v` - Thin view: `SELECT * FROM engagements WHERE type = 'prospect'`

### Code Changes

**Files Updated:**

1. `src/domain/projects/useProjectsListCore.ts`
   - Changed from `project_dashboard` to `projects_v`
   - Load parties via `getPrimaryPartiesForEngagements()` (customer, project_manager, architect, superintendent)
   - Load user roles via `getPrimaryUserRolesForEngagements()` (project_lead, foreman)
   - Load financial data from `engagement_change_orders` and `engagement_pay_apps`
   - Compute totals (contract_amt, co_amt, total_amt, billed_amt, balance) in JavaScript
   - Load stage names from `stages` table with order prefix formatting

2. `src/domain/projects/useProjectCore.ts`
   - Changed from `project_dashboard` to `projects_v` with `SELECT *`
   - Get `contract_amount` and `type` directly from view
   - Load stage name/order from `stages` table separately

3. `src/pages/projects/[id].tsx`
   - Updated 3 reload locations (saveEdit, advanceStage, previousStage)
   - All changed from `project_dashboard` to `projects_v`
   - Load stage data from `stages` table after reload

### Migrations

1. **2025-11-12-replace-dashboard-views-with-thin-views.sql** ✅ Run
   - Drops `project_dashboard` and `prospect_dashboard`
   - Creates `projects_v` and `prospects_v`

2. **2025-11-12-cleanup-old-views.sql** (Optional cleanup)
   - Ensures any lingering `engagement_dashboard` view is removed
   - Idempotent - recreates thin views if needed

## Benefits

### Easier Maintenance

- Adding columns to `engagements` table automatically appears in thin views (SELECT \*)
- No view updates needed when adding party roles or user roles
- No view updates needed when changing financial calculations

### Consistent Pattern

- Projects and prospects now use same pattern
- Both load relationships in application code
- Easier to understand and debug

### Performance

- Minimal impact - already loading parties/roles separately
- Financial calculations moved from database to JavaScript (negligible difference for list views)
- Can optimize later with materialized views if needed

## Documentation Updates

- ✅ `CURRENT-SCHEMA.md` - Updated to reflect thin views
- ✅ `src/domain/projects/README.md` - Updated useProjectsListCore description
- ⚠️ Historical docs (SCHEMA-VERIFICATION-2025-11-11.md, SCHEMA-GUIDE.md, etc.) left as-is for reference

## Testing Completed

- ✅ TypeScript compilation - No errors
- ✅ Projects list page - Loads correctly, all columns display
- ✅ Project detail page - Loads, editing works, stage changes work
- ✅ Prospects page - Unaffected, still works

## Future Considerations

When schema stabilizes and you move to production:

- Consider materialized views if list page performance becomes an issue
- Could add indexes on frequently filtered/sorted columns
- Current approach optimizes for development speed over query performance

## Rollback Plan (if needed)

To revert to complex views:

1. Run `2025-11-11-filter-dashboard-view-by-type.sql` (recreates complex project_dashboard)
2. Revert code changes in useProjectsListCore.ts, useProjectCore.ts, projects/[id].tsx
3. Test thoroughly

---

**Status:** Complete and tested ✅  
**Date:** 2025-11-12  
**Migration Files:** 2025-11-12-replace-dashboard-views-with-thin-views.sql, 2025-11-12-cleanup-old-views.sql (optional)
