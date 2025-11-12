# Current Engagements Table Schema (2025-11-11)

## Core Tables

### engagements

Main table for both prospects and projects.

## Actual Columns (verified from production database)

Based on query from live database, the engagements table has these columns:

```
address
bid_amount
city
contract_amount
converted_by_user_id
converted_to_project_at
created_at
created_from_excel
end_date
est_start_date
estimating_type
expected_close_date
id
lead_source
lost_reason
name
stage_id
start_date
state
Junction table for subcontractor assignments to engagements:

- `engagement_id` -> engagements.id
- `company_id` -> companies.id (where is_subcontractor = true)
- `work_order_number` TEXT NULL
- `assigned_date` DATE NULL
- `notes` TEXT NULL
- Unique constraint on `(engagement_id, company_id)`
- Foreign key on `company_id` is `ON DELETE RESTRICT`

Delete safety:
- BEFORE DELETE triggers on `companies` prevent deleting a company when referenced here
- UI guards prevent deleting in-use companies/contacts

RLS:
- Enabled with policies for authenticated users (SELECT, INSERT, UPDATE, DELETE)
- See migration: `2025-11-11-add-engagement-subcontractors-rls.sql`
```

## Columns that DO NOT EXIST (removed in migrations)

- ❌ `customer_id` - now stored in `engagement_parties` table with role='customer'
- ❌ `user_id` - now stored in `engagement_user_roles` table
- ❌ `pipeline_status` - removed/deprecated
- ❌ `company_id` - was consolidated
- ❌ `contact_id` - now in `engagement_parties`
- ❌ `architect_id` - now in `engagement_parties`
- ❌ `foreman_id` - now in `engagement_user_roles`

## Related Tables for Relationships

### companies

Unified table for all company entities (customers, vendors, subcontractors, architects, etc.)

- `is_subcontractor`: Boolean - can be assigned to projects
- A company can have multiple roles (e.g., both customer and vendor)

### company_vendor_details

Extension table for vendor-specific information:

- Migration: `2025-11-11-add-engagement-subcontractors-rls.sql`

### company_subcontractor_details

Extension table for subcontractor-specific information:

- `insurance_expiration`, `license_number`, `scope`, `compliance_status`, etc.

### engagement_parties

Stores relationships to companies and contacts:

- `role` values: 'customer', 'architect', 'prospect_contact', 'project_manager', etc.
- `party_type`: 'company' or 'contact'
- `party_id`: UUID reference to companies or contacts table

### engagement_user_roles

Stores relationships to users:

- `role` values: 'sales_lead', 'project_lead', 'foreman', 'estimator', 'project_admin', 'observer', 'superintendent'
- `user_id`: UUID reference to users table
- `is_primary`: boolean to identify the primary user for that role

> Role names updated in migration `2025-11-11-rename-user-roles.sql`: 'prospect_owner' → 'sales_lead', 'project_owner' → 'project_lead'

### engagement_subcontractors

Junction table for subcontractor (company) assignments to engagements:

- `engagement_id` -> engagements.id
- `company_id` -> companies.id (where `is_subcontractor = true`)
- `work_order_number` TEXT nullable
- `assigned_date` DATE nullable
- `notes` TEXT nullable
- Unique constraint on (`engagement_id`, `company_id`)

Fields like `status`, `trade_id`, and `subcontractor_id` from legacy schemas were removed during consolidation.

**RLS Policies:**

- Enabled with policies for authenticated users (SELECT, INSERT, UPDATE, DELETE)
- Migration: `2025-11-11-add-engagement-subcontractors-rls.sql`

### engagement_tasks (renamed from project_tasks)

Defines ordered tasks per stage.

- `id`, `name`, `stage_id`, `order_num`
- Previously named `project_tasks`; renamed via `2025-11-11-rename-project-tables.sql`.

### engagement_task_completion (renamed from project_task_completion)

Stores per-engagement completion state of tasks.

- `id`, `engagement_id`, `task_id`, `complete` (boolean)
- Previously named `project_task_completion`.

### engagement_comments (renamed from project_comments)

Threaded/comment records attached to engagements.

- `id`, `engagement_id`, `body`, `created_at`, etc. (schema unchanged by rename)

### projects_v

Thin filter-only view for projects: `SELECT * FROM engagements WHERE type = 'project'`.

All party fields (customer, project_manager, architect, owner, superintendent), user roles (project_lead, foreman, sales_lead), and financial calculations (contract_amt, co_amt, total_amt, billed_amt, balance) are loaded separately in application code via:

- `getPrimaryPartiesForEngagements()` for parties
- `getPrimaryUserRolesForEngagements()` for user roles
- Direct queries to `engagement_change_orders` and `engagement_pay_apps` for financials

### prospects_v

Thin filter-only view for prospects: `SELECT * FROM engagements WHERE type = 'prospect'`.

Same pattern as `projects_v` - all relationships loaded in application code.

> **Migration History**: Originally had complex computed views (`project_dashboard`, `prospect_dashboard`) with subqueries. Replaced with thin views in `2025-11-12-replace-dashboard-views-with-thin-views.sql` for easier maintenance during active development. When schema changes (add columns to engagements, add party roles, etc.), the thin views automatically include new data without needing view updates.

### Helper Views

#### vendors_view

Simplified view of companies where `is_vendor = true`, joined with vendor details:

```sql
SELECT
  c.id, c.name, c.company_type,
  vd.account_number, vd.default_payment_terms,
  vd.w9_status, vd.is_preferred_vendor
FROM companies c
LEFT JOIN company_vendor_details vd ON c.id = vd.company_id
WHERE c.is_vendor = true;
```

#### subcontractors_view

Simplified view of companies where `is_subcontractor = true`, joined with subcontractor details:

```sql
SELECT
  c.id, c.name, c.company_type,
  sd.insurance_expiration, sd.license_number,
  sd.scope, sd.compliance_status
FROM companies c
LEFT JOIN company_subcontractor_details sd ON c.id = sd.company_id
WHERE c.is_subcontractor = true;
```

### contacts

Contact records linked to companies:

- `company_id` -> companies.id
- Can be linked to engagements via engagement_parties

## Key Points for Development

1. **Customer lookups**: Query `engagement_parties` where `role = 'customer'`
2. **User role lookups**: Query `engagement_user_roles` where `role = 'sales_lead'` (prospects) or `role = 'project_lead'` (projects)
3. **No direct foreign keys**: Most relationships are now junction tables
4. **Type field**: 'prospect' or 'project' (determines which view the engagement appears in)
5. **Conversion tracking**: `converted_to_project_at` and `converted_by_user_id` are set when promoting prospect → project

## Row Level Security (RLS)

All new tables created in the consolidation have RLS enabled with policies for authenticated users:

- **engagement_subcontractors**: Full CRUD access for authenticated users
- **company_vendor_details**: Full CRUD access for authenticated users
- **company_subcontractor_details**: Full CRUD access for authenticated users

**Important:** When creating new tables related to companies or engagements:

1. Always enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Create policies for authenticated users (at minimum SELECT access)
3. Test queries after enabling RLS - 400 errors often indicate missing policies
4. Document RLS policies in this file for future reference
