# Fix Probability Data - Step by Step Guide

## Problem
After running the column rename migration, the data got mixed up:
- The `probability` field (should contain text like 'qualified', 'verbal_commit') has wrong data
- The `probability_percent` field (should contain numbers 0-100) may have wrong data
- Need to restore the original Pipeline Status values

## Solution: Re-import from CSV

### Step 1: Delete all prospects
Run this SQL in Supabase SQL Editor:

```sql
-- Delete existing prospects to start fresh
DELETE FROM engagement_trades 
WHERE engagement_id IN (SELECT id FROM engagements WHERE type = 'prospect');

DELETE FROM engagements WHERE type = 'prospect';
```

### Step 2: Import with correct column mapping
The updated `generate-full-import.py` script now uses the correct columns:
- `owner` (was `manager`) - gets Project Manager from CSV
- `sales` (was `owner`) - gets Sales from CSV  
- `probability` (was `pipeline_status`) - gets Pipeline Status mapped values
- `probability_percent` (was `probability`) - gets Probability % from CSV

Run the generated SQL:
```sql
-- Copy contents of db/migrations/2025-11-09-reimport-prospects-fixed.sql
-- and paste into Supabase SQL Editor
```

## Column Mapping Summary

| CSV Column | Old DB Column | New DB Column | Description |
|------------|---------------|---------------|-------------|
| Project Manager | manager | **owner** | Contact managing the project |
| Sales | owner | **sales** | Sales person |
| Pipeline Status | pipeline_status | **probability** | Status (qualified, won, etc.) |
| Probability | probability | **probability_percent** | Percentage 0-100 |

## Pipeline Status Value Mapping

The CSV has these Pipeline Status values that get mapped:
- **Landed** → `won`
- **Probable** → `verbal_commit`
- **Questionable** → `proposal_sent`
- **Doubtful** → `qualified`
- (anything else) → `lead`

## Files Updated

1. ✅ `generate-full-import.py` - Updated to use new column names
2. ✅ `db/migrations/2025-11-09-reimport-prospects-fixed.sql` - Generated import SQL
3. ✅ `src/pages/prospects/index.tsx` - UI already updated to use new names

## Verification

After re-importing, verify the data:

```sql
-- Check probability values (should be text statuses)
SELECT probability, COUNT(*) 
FROM engagements 
WHERE type = 'prospect' 
GROUP BY probability;

-- Check probability_percent values (should be numbers)
SELECT 
  MIN(probability_percent) as min_pct,
  MAX(probability_percent) as max_pct,
  AVG(probability_percent) as avg_pct
FROM engagements 
WHERE type = 'prospect';

-- Check owner/sales values
SELECT 
  owner,
  sales,
  COUNT(*) 
FROM engagements 
WHERE type = 'prospect' 
GROUP BY owner, sales
ORDER BY COUNT(*) DESC;
```

Expected results:
- `probability` should show: qualified, won, verbal_commit, proposal_sent, lead
- `probability_percent` should show numbers between 0-100
- `owner` should show Project Manager names
- `sales` should show Sales person names

## Quick Reference

Run these commands in order:

1. Open Supabase SQL Editor
2. Delete existing prospects (SQL from Step 1 above)
3. Run import SQL: `db/migrations/2025-11-09-reimport-prospects-fixed.sql`
4. Verify data (SQL queries from Verification section)
5. Refresh your Prospects page - should show correct data!
