# Prospect Fields Refactoring Checklist

## Overview
Refactor prospect fields to use proper database relationships instead of storing data in notes field.

---

## 1. Contact Field → contacts table

### Database Schema
- [ ] Verify `engagements.contact_id` column exists (check if migration needed)
- [ ] Verify `contacts` table has proper structure
- [ ] Verify contact_type values in contacts table

### Code Changes
- [ ] Add `contact_id` to Prospect interface
- [ ] Add `contactOptions` state array
- [ ] Create `loadContacts()` function to load from contacts table
- [ ] Create `getOrCreateContactId(name: string)` helper function
- [ ] Update `loadProspects()` to fetch contact info via FK instead of parsing notes
- [ ] Update `openForEdit()` to populate contact from FK relationship
- [ ] Update `saveProspect()` to save contact_id instead of in notes
- [ ] Add contact autocomplete dropdown in modal
- [ ] Remove contact parsing from notes field
- [ ] Update contact display in table to use FK data

### Testing
- [ ] Create prospect with new contact
- [ ] Create prospect with existing contact  
- [ ] Edit prospect and change contact
- [ ] Verify contact autocomplete works
- [ ] Verify contact displays correctly in table

---

## 2. Manager → Owner (users table)

### Database Schema
- [x] `engagements.owner` column already exists (stores owner name as string)
- [ ] Verify we want to keep as string or change to FK? (Currently storing name)

### Code Changes
- [ ] Rename "Manager" label to "Owner" throughout UI
- [ ] Change form field from `manager` to match (already using `owner` in DB)
- [ ] Update `managerOptions` → keep using current owner loading logic
- [ ] Update table header "Manager" → "Owner"
- [ ] Update filter field label
- [ ] Update Prospect interface field name for clarity
- [ ] Update all code comments referencing "manager"

### Testing
- [ ] Verify "Owner" label appears in modal
- [ ] Verify "Owner" label appears in table header
- [ ] Verify owner autocomplete works
- [ ] Verify owner filtering works
- [ ] Verify owner sorting works

---

## 3. Architect → customers table with party_type

### Database Schema
- [ ] Verify `customers.party_type` column exists
- [ ] Add party_type values: 'GC', 'Architect', 'Owner', etc.
- [ ] Check if `engagements.architect_id` column exists (may need migration)

### Code Changes
- [ ] Add `architect_id` to Prospect interface
- [ ] Add `architectOptions` state array
- [ ] Create `loadArchitects()` function (SELECT * FROM customers WHERE party_type = 'Architect')
- [ ] Create `getOrCreateArchitectId(name: string)` helper function
- [ ] Update `loadProspects()` to fetch architect via FK
- [ ] Update `openForEdit()` to populate architect from FK
- [ ] Update `saveProspect()` to save architect_id
- [ ] Add architect autocomplete in modal
- [ ] Remove architect parsing from notes field
- [ ] Update architect display in table

### Testing
- [ ] Create prospect with new architect (creates customer with party_type='Architect')
- [ ] Create prospect with existing architect
- [ ] Edit prospect and change architect
- [ ] Verify architect autocomplete shows only architects
- [ ] Verify main customer dropdown filters by party_type='GC'

---

## 4. Customer party_type Support

### Database Schema
- [ ] Verify `customers.party_type` column exists and accepts:
  - 'GC' (General Contractor)
  - 'Architect'  
  - 'Owner'
  - Others as needed

### Code Changes
- [ ] Update `getOrCreateCustomerId()` to accept party_type parameter (default 'GC')
- [ ] Update `loadCustomers()` or create filtered version for GCs only
- [ ] Create separate `loadArchitects()` for party_type='Architect'
- [ ] Update customer autocomplete to show GCs only
- [ ] Ensure architect autocomplete shows Architects only

### Testing
- [ ] Verify customer dropdown shows only GCs
- [ ] Verify architect dropdown shows only Architects
- [ ] Verify creating new customer defaults to party_type='GC'
- [ ] Verify creating new architect sets party_type='Architect'

---

## 5. Probability Field (CSV Pipeline Status Mapping)

### CSV Values Analysis
From CSV import script, the status mapping is:
- **Landed** → won
- **Probable** → verbal_commit
- **Questionable** → proposal_sent  
- **Doubtful** → qualified
- (default) → lead

### Current Code Values
- lead
- qualified
- proposal_prep
- proposal_sent
- negotiation
- verbal_commit
- on_hold
- lost

### Required Changes
- [ ] Review actual CSV to confirm all unique "Probability" values
- [ ] Update dropdown options in modal to match CSV exactly:
  - [ ] Landed
  - [ ] Probable
  - [ ] Questionable
  - [ ] Doubtful
  - [ ] (others?)
- [ ] Rename database column from `pipeline_status` to `probability` (or keep as is?)
- [ ] Update all code references from `pipeline_status` to `probability`
- [ ] Update Prospect interface
- [ ] Update form state
- [ ] Update table header label
- [ ] Update filter label
- [ ] Update `getPipelineStatusColor()` function to match new values
- [ ] Update `formatPipelineStatus()` function
- [ ] Update CSV import script if values change

### Testing
- [ ] Verify dropdown shows correct Probability values
- [ ] Verify colors match for each probability value
- [ ] Verify probability displays correctly in table
- [ ] Verify probability filtering works
- [ ] Verify probability sorting works

---

## 6. Add Stage Field (Budget/Construction)

### Database Schema
- [ ] Check if `stages` table exists
- [ ] Check if `engagements.stage_id` column exists (may need migration)
- [ ] Create stages table if needed with columns:
  - id (uuid)
  - name (text)
  - order (integer)
- [ ] Insert initial stage values:
  - Budget (order: 1)
  - Construction (order: 2)

### Code Changes
- [ ] Add `stage_id` to Prospect interface
- [ ] Add `stage` (display name) to Prospect interface
- [ ] Add `stageOptions` state array
- [ ] Create `loadStages()` function
- [ ] Update `loadProspects()` to fetch stage via FK
- [ ] Add `stage` to form state
- [ ] Update `openForEdit()` to populate stage
- [ ] Update `saveProspect()` to save stage_id
- [ ] Create `getOrCreateStageId(name: string)` helper if needed
- [ ] Add stage dropdown to modal
- [ ] Add stage column to table display
- [ ] Add stage to table header (with click handler for sorting)
- [ ] Add stage filter input in filter row
- [ ] Update uniqueValues memo to include stage
- [ ] Add stage to Filters type
- [ ] Add stage to filters state
- [ ] Update filteredAndSortedProspects to filter by stage
- [ ] Add stage to SortKey type
- [ ] Handle stage sorting in sort logic

### Testing
- [ ] Verify stage dropdown shows Budget/Construction
- [ ] Verify stage saves correctly
- [ ] Verify stage displays in table
- [ ] Verify stage filtering works
- [ ] Verify stage sorting works
- [ ] Create prospect with Budget stage
- [ ] Create prospect with Construction stage
- [ ] Edit prospect and change stage

---

## 7. Update Modal UI

### Changes Needed
- [ ] Reorder fields logically:
  1. Project Name *
  2. Customer (GC)
  3. Contact (from contacts table)
  4. Owner (was Manager, from users)
  5. Architect (from customers where party_type='Architect')
  6. Bid Date
  7. Probability (was Pipeline Status)
  8. Probability % (auto-calculated or manual?)
  9. Stage (Budget/Construction)
  10. SharePoint Folder URL

### Testing
- [ ] Verify all fields render correctly
- [ ] Verify all autocompletes work
- [ ] Verify form validation
- [ ] Verify save functionality

---

## 8. Update Table Display

### Column Changes
- [ ] Rename "Manager" → "Owner"
- [ ] Rename "Pipeline Status" → "Probability"
- [ ] Add "Stage" column (between Probability and Extended?)
- [ ] Verify all columns display correctly

### Filter Row Changes
- [ ] Update Manager filter → Owner filter
- [ ] Update Pipeline Status filter → Probability filter
- [ ] Add Stage filter

### Testing
- [ ] Verify all column headers are correct
- [ ] Verify all filter inputs work
- [ ] Verify sorting on all columns works
- [ ] Verify data displays correctly

---

## 9. Database Migration (if needed)

### Potential Migrations Needed
- [ ] Add `engagements.contact_id` column (uuid FK to contacts)
- [ ] Add `engagements.architect_id` column (uuid FK to customers)
- [ ] Add `engagements.stage_id` column (uuid FK to stages)
- [ ] Rename `engagements.pipeline_status` to `probability` (or keep as is)
- [ ] Create `stages` table
- [ ] Insert initial stage data (Budget, Construction)
- [ ] Verify `customers.party_type` column exists

### Migration File
- [ ] Create migration SQL file
- [ ] Test in local/staging environment
- [ ] Run migration in staging
- [ ] Verify data integrity
- [ ] Run migration in production

---

## 10. Data Migration

### Migrate Existing Data
- [ ] Parse existing notes field to extract:
  - Contact names → create/link to contacts table
  - Architect names → create/link to customers with party_type='Architect'
- [ ] Update existing prospect records with new FKs
- [ ] Verify all data migrated correctly
- [ ] Optionally clean up notes field after migration

### Testing
- [ ] Verify all existing prospects show correct data
- [ ] Verify no data was lost
- [ ] Verify FKs are properly linked

---

## 11. Update Types/Interfaces

### TypeScript Updates
- [ ] Update Prospect interface with new fields
- [ ] Update Filters type
- [ ] Update SortKey type
- [ ] Update form state type
- [ ] Ensure all types are consistent

---

## 12. Final Testing

### Comprehensive Testing
- [ ] Create new prospect with all fields
- [ ] Edit existing prospect
- [ ] Delete prospect
- [ ] Filter by all fields
- [ ] Sort by all columns
- [ ] Verify autocomplete for:
  - Customer (GCs only)
  - Contact
  - Owner
  - Architect (Architects only)
  - Stage
- [ ] Verify probability values match CSV
- [ ] Verify stage values (Budget/Construction)
- [ ] Test on different screen sizes
- [ ] Test with empty/null values
- [ ] Test with special characters in names

---

## Priority Order

### Phase 1 (Simple renames, no DB changes)
1. Rename Manager → Owner in UI
2. Rename Pipeline Status → Probability in UI

### Phase 2 (Database schema changes)
3. Create stages table with Budget/Construction
4. Add stage_id column to engagements
5. Add contact_id column to engagements
6. Add architect_id column to engagements
7. Verify/add party_type to customers

### Phase 3 (Code implementation)
8. Implement Contact field with contacts table
9. Implement Architect field with customers table
10. Implement Stage field with stages table
11. Update Probability dropdown values
12. Update all autocompletes and dropdowns

### Phase 4 (Data migration)
13. Migrate existing notes data to proper FK relationships
14. Clean up/verify migrated data

### Phase 5 (Testing)
15. Comprehensive testing of all features
16. Bug fixes
17. Production deployment

---

## Notes

- **Duplicates**: Handling contact/architect duplicates can be deferred to later
- **Notes field**: After migration, notes field can be repurposed or kept for additional free-form notes
- **Probability % field**: Need to clarify if this auto-populates based on Probability selection or remains manual
- **CSV import**: May need to update import script after these changes
