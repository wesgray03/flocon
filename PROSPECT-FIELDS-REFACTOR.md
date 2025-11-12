# Prospect Fields Refactor Checklist

## Database Schema Changes

### 1. Contact Field → contacts table
- [ ] Update modal to use contacts table instead of text field
- [ ] Add autocomplete from contacts table
- [ ] Implement getOrCreateContactId() function
- [ ] Handle contact creation if not exists
- [ ] Link prospect to contact via contact_id FK (may already exist)
- [ ] Remove contact from notes field parsing

### 2. Manager → Owner (users table)
- [ ] Rename "Manager" field to "Owner" in UI
- [ ] Change field name from `manager` to `owner` in form state
- [ ] Update database column (engagements.manager → already using engagements.owner)
- [ ] Use users table with user_type filter
- [ ] Update all references in code (labels, variables, etc.)
- [ ] Update autocomplete to use users/owners data

### 3. Architect → customers table with party_type
- [ ] Update architect field to reference customers table
- [ ] Add party_type filter for 'Architect'
- [ ] Implement getOrCreateArchitectId() function
- [ ] Store architect_id FK in engagements table (need to check schema)
- [ ] Remove architect from notes field parsing
- [ ] Add autocomplete from customers WHERE party_type='Architect'

### 4. Customer Types in customers table
- [ ] Verify party_type column exists (should already exist)
- [ ] Support these party_types:
  - [ ] GC (General Contractor)
  - [ ] Architect
  - [ ] Owner
  - [ ] (others as needed)
- [ ] Update customer creation to accept party_type parameter
- [ ] Filter customer dropdown by party_type='GC' for main customer field

### 5. Pipeline Status - Match CSV Values
Current values in code:
- lead
- qualified
- proposal_prep
- proposal_sent
- negotiation
- verbal_commit
- on_hold
- lost

**Need to verify CSV values and update dropdown to match exactly**
- [ ] Review CSV file for actual pipeline_status values
- [ ] Update dropdown options in modal
- [ ] Update getPipelineStatusColor() to match new values
- [ ] Update formatPipelineStatus() if needed

### 6. Add Stage Field (New)
- [ ] Add stage field to engagements table (if not exists)
- [ ] Create stages table with initial values:
  - [ ] Budget
  - [ ] Construction
- [ ] Add stage dropdown to modal
- [ ] Add stage column to table display
- [ ] Add stage to filters
- [ ] Add stage to sorting
- [ ] Load stages from database in loadOptions()

## Code Changes

### Form State Updates
- [ ] Add `contact_id` to form state
- [ ] Add `architect_id` to form state  
- [ ] Rename `manager` to `owner` in form state
- [ ] Add `stage` to form state
- [ ] Remove architect/contact from notes parsing

### Database Functions
- [ ] Create getOrCreateContactId()
- [ ] Create getOrCreateArchitectId() 
- [ ] Update getOrCreateCustomerId() to accept party_type parameter
- [ ] Update saveProspect() to handle all new FK relationships

### UI Updates
- [ ] Update modal labels (Manager → Owner)
- [ ] Add Contact autocomplete from contacts table
- [ ] Add Architect autocomplete from customers WHERE party_type='Architect'
- [ ] Update Customer autocomplete to filter by party_type='GC'
- [ ] Add Stage dropdown
- [ ] Update pipeline_status dropdown options
- [ ] Add stage column to table headers
- [ ] Add stage filter input

### Data Loading
- [ ] Add loadContacts() or update loadOptions()
- [ ] Add loadArchitects() or update loadOptions()
- [ ] Add loadStages() or update loadOptions()
- [ ] Update uniqueValues memo to include stage

### Display Updates
- [ ] Update table to show stage column
- [ ] Remove parsing of contact/architect from notes
- [ ] Update openForEdit() to load contact/architect from FKs
- [ ] Update prospect interface to include stage, contact_id, architect_id

## Migration Needs

- [ ] Check if engagements.architect_id column exists (may need migration)
- [ ] Check if engagements.stage_id column exists (may need migration)
- [ ] Check if stages table exists (may need migration)
- [ ] Verify contacts table structure
- [ ] Verify customers.party_type column exists

## Testing Checklist

- [ ] Create new prospect with all fields
- [ ] Edit existing prospect
- [ ] Auto-create contact if doesn't exist
- [ ] Auto-create architect (as customer) if doesn't exist
- [ ] Verify stage selection works
- [ ] Verify pipeline status options match CSV
- [ ] Test filtering by stage
- [ ] Test sorting by stage
- [ ] Verify all autocompletes work
- [ ] Test duplicate handling (contacts, architects)

## Notes
- Manager field is already stored as `owner` in engagements table, just need UI rename
- Contact and Architect currently in notes field, need to migrate to FK relationships
- Need to verify actual pipeline_status values from CSV before updating dropdown
- May need database migrations for new columns (architect_id, stage_id)
