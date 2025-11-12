# Prospects & Projects Migration Guide

## Overview
This migration converts the existing `projects` table into a unified `engagements` table that handles both **Prospects** (potential jobs, no contract yet) and **Projects** (won contracts, integrated with QuickBooks).

### Key Benefits
✅ **Single source of truth** - No data duplication between prospects and projects  
✅ **Preserves history** - When a prospect wins, it becomes a project with same ID  
✅ **Clean separation** - Different permissions for Sales (prospects) vs Ops (projects)  
✅ **QB-safe** - QuickBooks sync only touches projects with `qbid`, prospects are invisible  
✅ **Scalable** - Handles 100 prospects : 20 projects ratio with proper indexing  

---

## Database Changes Summary

### Tables Created/Modified

#### 1. **trades** (NEW)
Replaces numbered trade fields (06.61.13, 09.30.00, etc.) with proper reference table.
- CSI MasterFormat codes
- Trade names and divisions
- Pre-seeded with common trades

#### 2. **engagements** (RENAMED from `projects`)
Main table for both prospects and projects.

**New Fields:**
- `type` - enum: `prospect` | `project`
- `pipeline_status` - enum: lead → qualified → proposal_sent → negotiation → verbal_commit → won/lost
- `probability` - integer 0-100 (% chance of winning)
- `expected_close_date` - when we expect to win/lose
- `lead_source` - where the prospect came from
- `sales_contact_id` - FK to contacts table (main point of contact)
- `est_start_date` - planned start date (before actual start_date)
- `lost_reason` - why we lost the bid
- `converted_to_project_at` - timestamp of promotion
- `converted_by_user_id` - who promoted it

**Constraints:**
- Prospects MUST have `pipeline_status`
- Projects CANNOT have `pipeline_status`, `probability`, or `lead_source`
- Only projects can have `qbid` (prospects are NULL)

#### 3. **engagement_trades** (NEW)
Many-to-many junction table linking engagements to trades.
- `estimated_amount` - bid amount per trade
- `actual_cost` - real cost (for projects)
- Replaces direct columns like "06.61.13"

### Views Created

- `v_prospects` - Active prospects with contact info and trade summaries
- `v_projects` - Active projects (replaces old projects table queries)
- `v_projects_for_qbo` - Projects ready for QuickBooks sync (has qbid)
- `v_hot_prospects` - High-probability deals closing soon
- `v_pipeline_summary` - Dashboard metrics by pipeline stage
- `v_lost_prospects` - Lost bids for analysis
- `v_engagement_trade_summary` - Trade totals per engagement
- `v_engagement_trades_detail` - Detailed trade breakdown

### Functions (RPCs)

```sql
-- Promote prospect to project (with validation)
promote_prospect_to_project(engagement_id, qbid, contract_amount, initial_stage_id)

-- Mark prospect as lost
mark_prospect_lost(engagement_id, lost_reason)

-- Auto-update probabilities based on status
update_prospect_probability_by_status()

-- Revert project back to prospect (use with caution)
revert_project_to_prospect(engagement_id, pipeline_status)
```

### Row-Level Security (RLS)

**Role Permissions:**
- **Owner/Admin** → See everything (prospects + projects)
- **Sales** → See all prospects, can create/edit prospects, CANNOT promote to project
- **Ops/Foreman** → See all projects, can edit projects
- **Sales** cannot see projects (unless also ops role)
- **Ops** cannot see prospects (unless also admin)

---

## Migration Order

Run these migrations in **exact order**:

```bash
1. 2025-11-09-create-trades-table.sql
2. 2025-11-09-convert-projects-to-engagements.sql
3. 2025-11-09-create-engagement-trades.sql
4. 2025-11-09-create-prospect-promotion-functions.sql
5. 2025-11-09-create-prospect-project-views.sql
6. 2025-11-09-setup-engagements-rls.sql
```

### Using the Helper Script

```powershell
# Run all migrations in order
node run-prospects-migration.js
```

Or manually in Supabase SQL Editor:
1. Go to SQL Editor
2. Copy/paste each file in order
3. Run and verify success before next file

---

## Usage Examples

### Creating a New Prospect

```sql
INSERT INTO engagements (
  type,
  name,
  customer_id,
  sales_contact_id,
  pipeline_status,
  probability,
  expected_close_date,
  lead_source,
  bid_amount,
  manager,
  owner,
  address,
  city,
  state,
  scope_summary
) VALUES (
  'prospect',
  '1401 Church St Tower 1',
  'customer-uuid',
  'contact-uuid',
  'qualified',
  50,
  '2025-12-15',
  'repeat_customer',
  1822700.00,
  'Hastings',
  'Adam Builders',
  '1401 Church St',
  'Nashville',
  'TN',
  'Flooring package for new construction tower'
);
```

### Adding Trades to Prospect

```sql
-- Get trade IDs
SELECT id, code, name FROM trades;

-- Add trades with estimated amounts
INSERT INTO engagement_trades (engagement_id, trade_id, estimated_amount, notes)
VALUES 
  ('engagement-uuid', 'trade-uuid-milladen', 500000, 'Millwork package'),
  ('engagement-uuid', 'trade-uuid-hastings', 300000, 'Tile and flooring');
```

### Querying Prospects

```sql
-- All active prospects
SELECT * FROM v_prospects;

-- Hot prospects (closing soon or high probability)
SELECT * FROM v_hot_prospects;

-- Pipeline summary for dashboard
SELECT * FROM v_pipeline_summary;

-- Prospect with trade details
SELECT * FROM v_engagement_trades_detail WHERE engagement_id = 'uuid-here';
```

### Promoting Prospect to Project

```sql
-- When prospect wins and gets QB ID
SELECT promote_prospect_to_project(
  'prospect-uuid',
  'QB12345',           -- QuickBooks ID
  1822700.00,          -- Contract amount
  'stage-uuid-kickoff' -- Initial project stage
);
```

### Marking Prospect as Lost

```sql
SELECT mark_prospect_lost(
  'prospect-uuid',
  'Lost to competitor - underbid by $50k'
);
```

### Querying Projects (unchanged from before)

```sql
-- All projects (same as old projects table)
SELECT * FROM v_projects;

-- Projects for QuickBooks sync
SELECT * FROM v_projects_for_qbo;
```

---

## UI Integration Notes

### Radio Button Toggle (Already Exists)
Your existing radio button should switch between:
- **Prospects view** → Query `v_prospects`
- **Projects view** → Query `v_projects`

### Prospects Page Components Needed

1. **Prospect List/Grid**
   - Filter by pipeline_status
   - Sort by probability, expected_close_date
   - Color-code by status (green = hot, red = cold)

2. **Prospect Detail Form**
   - All standard fields (name, customer, address, etc.)
   - Pipeline status dropdown
   - Probability slider (0-100%)
   - Expected close date picker
   - Lead source dropdown
   - Sales contact lookup (from contacts table)
   - Trades selector (multi-select with amounts)

3. **Promotion Button**
   - "Convert to Project" button (admin/owner only)
   - Modal to confirm and set:
     - QuickBooks ID
     - Contract amount (pre-filled from bid_amount)
     - Initial project stage
   - Calls `promote_prospect_to_project()` RPC

4. **Lost Reason Dialog**
   - "Mark as Lost" button
   - Text area for reason
   - Calls `mark_prospect_lost()` RPC

### Projects Page (Minimal Changes)
- Query `v_projects` instead of `projects`
- Everything else stays the same
- Optional: Show "Originally a prospect, promoted on {date}" badge

---

## Data Migration Checklist

- [ ] **Backup production database** before running migrations
- [ ] Run migrations in **staging environment first**
- [ ] Verify all existing projects appear in `v_projects`
- [ ] Test creating a new prospect
- [ ] Test adding trades to prospect
- [ ] Test promoting prospect to project
- [ ] Test RLS with different user roles
- [ ] Update any hardcoded `projects` table references in code to `engagements` or views
- [ ] Update QuickBooks sync queries to use `v_projects_for_qbo`
- [ ] Test that QB sync doesn't see prospects

---

## Rollback Plan

If something goes wrong:

```sql
-- Rollback: Rename engagements back to projects
ALTER TABLE public.engagements RENAME TO projects;

-- Remove new columns
ALTER TABLE public.projects 
  DROP COLUMN type,
  DROP COLUMN pipeline_status,
  DROP COLUMN probability,
  DROP COLUMN expected_close_date,
  DROP COLUMN lead_source,
  DROP COLUMN sales_contact_id,
  DROP COLUMN est_start_date,
  DROP COLUMN lost_reason,
  DROP COLUMN converted_to_project_at,
  DROP COLUMN converted_by_user_id;

-- Drop new tables
DROP TABLE IF EXISTS public.engagement_trades CASCADE;
DROP TABLE IF EXISTS public.trades CASCADE;

-- Drop views and functions
DROP VIEW IF EXISTS v_prospects CASCADE;
DROP VIEW IF EXISTS v_hot_prospects CASCADE;
DROP VIEW IF EXISTS v_pipeline_summary CASCADE;
DROP FUNCTION IF EXISTS promote_prospect_to_project CASCADE;
DROP FUNCTION IF EXISTS mark_prospect_lost CASCADE;
```

---

## Next Steps

1. **Run migrations** (staging first!)
2. **Seed initial trades** (edit `2025-11-09-create-trades-table.sql` with your complete trade list)
3. **Update user roles** - Assign Sales vs Ops roles:
   ```sql
   UPDATE users SET user_type = 'Sales' WHERE email = 'valentina@example.com';
   UPDATE users SET user_type = 'Ops' WHERE email = 'matt@example.com';
   ```
4. **Build Prospects UI** - List, detail form, promotion button
5. **Update Projects UI** - Switch to `v_projects` view
6. **Test promotion workflow** end-to-end
7. **Update QB sync** to use `v_projects_for_qbo`

---

## Questions or Issues?

Common gotchas:
- **Foreign key errors?** Make sure child tables (proposals, comments, etc.) still reference the renamed table
- **RLS blocking access?** Check user roles and test with `SET role TO authenticated`
- **Views not updating?** Drop and recreate them
- **Need to add more pipeline stages?** Edit the enum:
  ```sql
  ALTER TYPE pipeline_status ADD VALUE 'new_stage' AFTER 'existing_stage';
  ```

---

## Field Mapping Reference

### From Excel to Database

| Excel Field | Database Column | Notes |
|-------------|-----------------|-------|
| Project | `name` | Text |
| Customer | `customer_id` | FK to customers table |
| Contact | `sales_contact_id` | FK to contacts table |
| Project Manager | `manager` | Text (for now) |
| Architect/Designer | `owner` | Text (for now) |
| Sales | `owner` | Text - salesperson name |
| Bid Date | `created_at` | Auto-set |
| Last Call | `updated_at` | Auto-updated |
| Stage | `pipeline_status` | Enum |
| Status | `pipeline_status` | Enum (Active → prospects not 'lost') |
| Pipeline Status | `pipeline_status` | Enum |
| Cat. Start | `est_start_date` | Date |
| Est. Start | `est_start_date` | Date |
| Probability | `probability` | Integer 0-100 |
| Revenue Est. | `bid_amount` | Numeric |
| Extended | (calculated) | SUM(engagement_trades.estimated_amount) |
| Trade codes (06.61.13, etc.) | `engagement_trades` table | Many-to-many with amounts |

---

**Ready to go!** 🚀
