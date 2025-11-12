# Production Import - Quick Reference

## 🎯 Import Order

```
1. 01-stages-template.csv       → stages table (12 records)
2. 02-users-template.csv        → users table (13 records)
3. 03-companies-template.csv    → companies table (14 records)
4. 04-contacts-template.csv     → contacts table (31 records)
5. 05-engagements.csv           → engagements table (54 records)
6. 06-engagement-parties.csv    → engagement_parties table (50 records)
```

## 📁 File Location

`import-templates/parsed/`

## 🔧 How to Import Each File

1. Open Supabase Dashboard → Table Editor
2. Select the target table (e.g., `stages`)
3. Click **"Insert"** → **"Import data from CSV"**
4. Upload the CSV file
5. Verify record count matches expected
6. Move to next file

## ✅ After All Imports

### Run Post-Import Script

In Supabase SQL Editor:

- Execute: `post-import-autocomplete-tasks.sql`
- This marks tasks complete for passed stages (only affects projects)

### Run Verification Script

In Supabase SQL Editor:

- Execute: `verify-production-import.sql`
- Review for any ❌ FAIL statuses

## 🚨 Troubleshooting

### Import Fails?

- Check column headers match exactly
- Verify UUIDs are properly formatted
- Ensure previous dependencies were imported first
- Check for "NULL" strings (should be blank)

### Missing Data After Import?

- Run `verify-production-import.sql` to identify issues
- Check record counts match expected values
- Verify foreign key relationships

## 📊 Expected Record Counts

```
stages:             12
users:              13
companies:          14
contacts:           31
engagements:        54
engagement_parties: 50
```

## 🔗 Dependencies (Why Order Matters)

- **Users** → Referenced by engagements (owner_id, etc.)
- **Companies** → Referenced by contacts and engagement_parties
- **Contacts** → Referenced by engagement_parties
- **Stages** → Referenced by engagements (current_stage_id)
- **Engagements** → Referenced by engagement_parties
- **Engagement_parties** → Last (depends on all above)

## 📝 Post-Import To-Do

- [ ] Update user permissions (`can_manage_prospects`, `can_manage_projects`)
- [ ] Test app login
- [ ] Verify projects dashboard loads
- [ ] Verify prospects dashboard loads
- [ ] Check a few project detail pages

---

## 📚 Full Documentation

See `IMPORT-STEPS.md` for detailed step-by-step instructions.
