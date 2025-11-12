# Column Rename Migration - Complete Summary

## Overview
Renamed database columns in `engagements` table to match UI terminology exactly.

## Changes Made

### 1. Database Column Renames (engagements table)

| Old Column Name    | New Column Name      | Description |
|-------------------|---------------------|-------------|
| `manager`         | `owner`             | Primary contact managing the engagement (from contacts table, Project Manager type) |
| `owner`           | `sales`             | Sales person assigned (from users table, Owner type) |
| `pipeline_status` | `probability`       | Status/probability of winning (lead, qualified, proposal_sent, etc.) |
| `probability`     | `probability_percent` | Percentage probability of winning (0-100) |

### 2. UI Changes (src/pages/prospects/index.tsx)

#### Type Definitions
- Updated `Filters` type: `manager` → `owner`, added `sales`, `status` → `probability`
- Updated `SortKey` type: `manager` → `owner`, added `sales`, `pipeline_status` → `probability`, `probability` → `probability_percent`
- Updated `Prospect` interface: removed `manager`, updated `owner`, added `sales`, `pipeline_status` → `probability`, `probability` → `probability_percent`

#### State & Data
- Renamed `managerOptions` → `ownerOptions` (still loads from contacts)
- Added `salesOptions` (loads from users)
- Updated filters state to use new naming
- Updated form state to use new naming
- Updated `uniqueValues` memo to use new field names
- Updated data transformation in `loadProspects()` to map DB columns correctly

#### Functions
- `getProbabilityStatusColor` → `getProbabilityColor`
- `formatProbabilityStatus` → `formatProbability`
- Updated `openForEdit()` to use new field names
- Updated `saveProspect()` to save to correct DB columns
- Updated filter logic to use new field names

#### UI Elements
- Table headers: "Manager" → "Owner", "Pipeline Status" → "Probability", "Probability" → "Prob %"
- Filter inputs: Updated to filter on new field names
- Table cells: Display new field names
- Modal form fields: "Manager" → "Owner", "Sales/Owner" → "Sales", "Pipeline Status" → "Probability" with new "Prob %" field
- Dropdown options: Updated to use `ownerOptions` and `salesOptions`
- Menu items: "Managers" → "Owners", added "Sales"

### 3. Data Mapping

The code now correctly maps:
- `engagements.manager` → UI displays as "Owner" → stored in `engagements.owner`
- `engagements.owner` → UI displays as "Sales" → stored in `engagements.sales`
- `engagements.pipeline_status` → UI displays as "Probability" → stored in `engagements.probability`
- `engagements.probability` → UI displays as "Prob %" → stored in `engagements.probability_percent`

## Migration Instructions

### Step 1: Run Database Migration

Copy the SQL from `db/migrations/2025-11-09-rename-manager-to-owner-sales.sql` and execute it in your Supabase SQL Editor:

```sql
-- Step 1: Rename probability to probability_percent first (no conflict)
ALTER TABLE engagements RENAME COLUMN probability TO probability_percent;
COMMENT ON COLUMN engagements.probability_percent IS 'Percentage probability of winning (0-100)';

-- Step 2: Rename pipeline_status to probability (no conflict)
ALTER TABLE engagements RENAME COLUMN pipeline_status TO probability;
COMMENT ON COLUMN engagements.probability IS 'Probability/status of winning the engagement (lead, qualified, proposal_sent, etc.)';

-- Step 3: Swap manager/owner columns using temporary names
ALTER TABLE engagements RENAME COLUMN owner TO sales_temp;
ALTER TABLE engagements RENAME COLUMN manager TO owner;
ALTER TABLE engagements RENAME COLUMN sales_temp TO sales;

COMMENT ON COLUMN engagements.owner IS 'Owner (from contacts, Project Manager type) - Primary contact managing the engagement';
COMMENT ON COLUMN engagements.sales IS 'Sales (from users, Owner type) - Sales person assigned to the engagement';
```

### Step 2: Verify Migration

After running the migration, verify the columns were renamed:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'engagements' 
  AND column_name IN ('owner', 'sales', 'probability', 'probability_percent')
ORDER BY column_name;
```

Expected results:
- `owner` (text)
- `probability` (text)
- `probability_percent` (numeric)
- `sales` (text)

### Step 3: Test the UI

1. Open the Prospects page
2. Verify columns display correctly:
   - Owner (shows contacts/project managers)
   - Sales (shows users/owners)
   - Probability (shows status badges)
   - Prob % (shows percentage)
3. Test filters work on all columns
4. Test sorting works on all columns
5. Test editing a prospect:
   - Owner field shows autocomplete from contacts
   - Sales field shows autocomplete from users
   - Probability dropdown shows all statuses
   - Prob % field accepts numbers 0-100
6. Test saving edits persist correctly

## Rollback Instructions

If you need to rollback the database changes:

```sql
-- Rollback in reverse order
ALTER TABLE engagements RENAME COLUMN sales TO owner_temp;
ALTER TABLE engagements RENAME COLUMN owner TO manager;
ALTER TABLE engagements RENAME COLUMN owner_temp TO owner;

ALTER TABLE engagements RENAME COLUMN probability TO pipeline_status;
ALTER TABLE engagements RENAME COLUMN probability_percent TO probability;
```

Then revert the UI changes by checking out the previous commit.

## Files Modified

### Created
- `db/migrations/2025-11-09-rename-manager-to-owner-sales.sql` - Migration SQL
- `show-rename-migration.js` - Helper script to display migration SQL
- `COLUMN-RENAME-SUMMARY.md` - This file

### Modified
- `src/pages/prospects/index.tsx` - Complete UI refactor for new column names

## Verification Checklist

- [ ] Database migration executed successfully
- [ ] No errors in Supabase SQL editor
- [ ] Columns verified in database
- [ ] Prospects page loads without errors
- [ ] All column headers display correctly
- [ ] All filters work correctly
- [ ] All sorting works correctly
- [ ] Edit modal opens with correct field labels
- [ ] Autocomplete works for Owner field (contacts)
- [ ] Autocomplete works for Sales field (users)
- [ ] Probability dropdown shows all options
- [ ] Prob % field accepts numbers
- [ ] Saving edits works correctly
- [ ] Data displays correctly after edit
- [ ] No console errors in browser

## Notes

- **Terminology is now consistent:** What we call "Owner" in the UI comes from the contacts table (Project Managers), and what we call "Sales" comes from the users table (Owners).
- **Data preservation:** The migration only renames columns; no data is lost.
- **Zero downtime:** The UI changes match the database changes exactly, so there's no period where they're out of sync.
- **Type safety:** All TypeScript types were updated to match the new schema.

## Next Steps (From PROSPECT-REFACTOR-CHECKLIST.md)

This migration completes:
- ✅ Section 2: Manager → Owner rename (UI and DB)
- ✅ Section 5: Pipeline Status → Probability rename (UI and DB)
- ✅ Phase 1: Simple UI renames

Still pending:
- [ ] Section 1: Contact Field → contacts table FK
- [ ] Section 3: Architect → customers table with party_type FK
- [ ] Section 4: Customer party_type support
- [ ] Section 6: Add Stage field (Budget/Construction)
- [ ] Phases 2-5: Database schema additions, code implementation, data migration, testing
