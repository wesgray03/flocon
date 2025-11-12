# Production Data Import Guide

## Import Order (CRITICAL - Follow this order!)

1. **stages** - Must import first (referenced by engagements)
2. **users** - Must import before engagements (referenced by engagement_user_roles)
3. **companies** - Must import before engagements (referenced by engagement_parties)
4. **contacts** - Can import after companies (references companies)
5. **engagements** - Core data (references stages)
6. **engagement_parties** - Links engagements to companies/contacts
7. **engagement_user_roles** - Links engagements to users
8. **engagement_subcontractors** - Links engagements to subcontractor companies
9. **engagement_change_orders** - Project financial data
10. **engagement_pay_apps** - Project billing data
11. **engagement_sov_lines** - Schedule of values for projects
12. **engagement_comments** - Comments on engagements

## CSV Templates

All templates are in the `/import-templates` directory:

- `01-stages-template.csv`
- `02-users-template.csv`
- `03-companies-template.csv`
- `04-contacts-template.csv`
- `05-engagements-template.csv`
- `06-engagement-parties-template.csv`
- `07-engagement-user-roles-template.csv`
- `08-engagement-subcontractors-template.csv`
- `09-engagement-change-orders-template.csv`
- `10-engagement-pay-apps-template.csv`

## Pre-Import Checklist

- [ ] Backup production database
- [ ] Run all migrations on production
- [ ] Verify RLS policies are enabled
- [ ] Test with sample data first
- [ ] Have rollback plan ready

## Import Methods

### Option 1: Supabase Dashboard (Recommended for smaller datasets)

1. Go to Table Editor
2. Click table → Import → Upload CSV
3. Map columns
4. Verify data

### Option 2: SQL COPY Command (Recommended for large datasets)

```sql
\copy stages(id,name,order) FROM '/path/to/01-stages.csv' CSV HEADER;
```

### Option 3: Custom Import Script

Use the provided `import-data.js` script with Supabase client

## Post-Import Verification

Run these queries to verify:

```sql
-- Check record counts
SELECT 'stages' as table, COUNT(*) FROM stages
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'engagements', COUNT(*) FROM engagements
UNION ALL
SELECT 'engagement_parties', COUNT(*) FROM engagement_parties;

-- Verify relationships
SELECT COUNT(*) as projects_without_customer
FROM engagements e
LEFT JOIN engagement_parties ep ON e.id = ep.engagement_id AND ep.role = 'customer'
WHERE e.type = 'project' AND ep.id IS NULL;

-- Verify users are linked
SELECT COUNT(*) as projects_without_lead
FROM engagements e
LEFT JOIN engagement_user_roles eur ON e.id = eur.engagement_id AND eur.role = 'project_lead'
WHERE e.type = 'project' AND eur.id IS NULL;
```

## Troubleshooting

**Foreign Key Violations**: Import in the correct order
**UUID Issues**: Ensure UUIDs are valid or use `gen_random_uuid()` for new records
**RLS Errors**: Temporarily disable RLS for bulk import (re-enable after!)
**Date Format**: Use ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS`

## Important Notes

- All dates should be in `YYYY-MM-DD` format
- UUIDs must be valid v4 UUIDs
- Boolean values: `true`/`false` or `t`/`f` or `1`/`0`
- NULL values: leave empty or use `\N`
- Text with commas: wrap in double quotes
- Text with quotes: escape with double quotes `""`
