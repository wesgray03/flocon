# Companies Table Refactor Plan

## Overview
Rename `customers` table to `companies` and add support for multiple company types:
- **Contractor** (GC) - General Contractors (is_customer = true by default)
- **Architect** - Architecture/Design firms
- **Owner** - Property Owners/Developers

Vendors and Subcontractors stay in their own tables with different functionality.

## Database Changes

### 1. Rename Table
```sql
ALTER TABLE customers RENAME TO companies;
```

### 2. Update Columns
```sql
-- Rename party_type to company_type for clarity
ALTER TABLE companies RENAME COLUMN party_type TO company_type;

-- Add is_customer flag
ALTER TABLE companies ADD COLUMN is_customer BOOLEAN DEFAULT false;

-- Update existing records: Contractors (GC) are customers by default
UPDATE companies SET is_customer = true WHERE company_type = 'GC';

-- Add constraint for valid company types
ALTER TABLE companies DROP CONSTRAINT IF EXISTS customers_party_type_check;
ALTER TABLE companies ADD CONSTRAINT companies_company_type_check 
  CHECK (company_type IN ('Contractor', 'Architect', 'Owner'));

-- Update existing data to use new type names
UPDATE companies SET company_type = 'Contractor' WHERE company_type IN ('GC', 'gc');
UPDATE companies SET company_type = 'Architect' WHERE company_type IN ('Architect', 'architect');
UPDATE companies SET company_type = 'Owner' WHERE company_type IN ('Owner', 'owner');
```

### 3. Update Foreign Keys
All foreign keys referencing `customers` need to be updated:
- `engagements.customer_id` → references companies (already correct)
- `engagements.architect_id` → will reference companies (company_type='Architect')
- Any other tables with customer_id

### 4. Update RLS Policies
Rename policies from `customers_*` to `companies_*`

## UI Changes

### 1. Update All References
- Search and replace `customers` → `companies` in code
- Update `customerOptions` → `companyOptions` (or keep as is for GC-only)
- Update dropdown labels

### 2. Prospects Page Updates
- Customer dropdown: Filter companies where `is_customer = true`
- Architect dropdown: Filter companies where `company_type = 'Architect'`
- Add Owner field: Filter companies where `company_type = 'Owner'`

### 3. Company Master Data Modal
Update to show:
- Company Name
- Company Type (dropdown: Contractor, Architect, Owner)
- Is Customer checkbox (defaults to true for Contractors)
- Address, phone, email, etc.

## Benefits

1. **Single Source of Truth**: All companies in one table
2. **Flexible**: A company can be multiple types (e.g., Architect AND Customer)
3. **Better Reporting**: Easy to query all Architects or all Customers
4. **Relationships**: Can track relationships between companies (GC uses Architect X)
5. **Future-Proof**: Easy to add new company types without schema changes

## Migration Order

1. ✅ Rename `customers` to `companies`
2. ✅ Add `is_customer` column
3. ✅ Update `company_type` values
4. ✅ Update constraints
5. Update RLS policies
6. Update views (project_dashboard, etc.)
7. Update UI code (all references)
8. Update import scripts
9. Test thoroughly

## Alternative: Keep Both Flags
Instead of just `is_customer`, we could have:
- `is_customer` - Can be billed to
- `is_contractor` - General Contractor
- `is_architect` - Design firm
- `is_owner` - Property owner

This allows a company to be multiple types (e.g., Design-Build firm is both Contractor and Architect).

## Recommendation
Start with the simple approach (single `company_type` + `is_customer` flag), then add more flags later if needed.

Want me to proceed with creating the migration SQL?
