# Engagements Relationships Analysis & Recommendations

**Date:** November 10, 2025  
**Issue:** Multiple overlapping FK columns in engagements table for contacts/companies

## Current Structure

### Engagements Table Foreign Keys

The `engagements` table currently has these relationship columns:

| Column               | Type | References  | Purpose                | Current Usage    |
| -------------------- | ---- | ----------- | ---------------------- | ---------------- |
| `company_id`         | UUID | companies   | Customer company       | ✓ Used (125/125) |
| `contact_id`         | UUID | contacts    | PM/Estimator contact   | Rarely used      |
| `architect_id`       | UUID | companies   | Architect company      | Rarely used      |
| `sales_contact_id`   | UUID | contacts    | Sales contact          | Rarely used      |
| `project_manager_id` | UUID | contacts(?) | Project manager        | Not used         |
| `owner`              | TEXT | -           | Owner name (free text) | ✓ Used           |
| `user_id`            | UUID | users(?)    | User reference         | Not used         |

### Problems with Current Design

1. **Redundancy**: Multiple columns for contacts (`contact_id`, `sales_contact_id`, `project_manager_id`)
2. **Inflexibility**: Can only have ONE of each type (one PM, one architect, etc.)
3. **Unclear Purpose**: Overlapping columns with unclear usage (`contact_id` vs `sales_contact_id`)
4. **Limited Roles**: Can't have multiple contacts with different roles per engagement
5. **Mixed Data Types**: `owner` is TEXT, others are UUIDs

### Sample Data

```json
{
  "name": "Hilton Garden Inn Opryland",
  "company_id": "0f4cfdf1-dcef-41a9-a85f-376a43953ddf", // ✓ USED
  "owner": "Ben Hall", // ✓ USED (text)
  "contact_id": null, // ✗ UNUSED
  "architect_id": null, // ✗ UNUSED
  "sales_contact_id": null, // ✗ UNUSED
  "project_manager_id": null // ✗ UNUSED
}
```

## Recommended Solution: Junction Tables

### Option 1: Single Junction Table (Recommended)

Create one flexible junction table to handle all engagement-contact/company relationships:

```sql
CREATE TABLE engagement_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL CHECK (party_type IN ('contact', 'company')),
  party_id UUID NOT NULL,  -- Can reference either contacts.id or companies.id
  role TEXT NOT NULL CHECK (role IN (
    'customer',
    'architect',
    'general_contractor',
    'project_manager',
    'estimator',
    'owner',
    'sales_contact',
    'other'
  )),
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one primary party per role per engagement
  CONSTRAINT unique_primary_role UNIQUE (engagement_id, role, is_primary) WHERE is_primary = true
);

CREATE INDEX idx_engagement_parties_engagement ON engagement_parties(engagement_id);
CREATE INDEX idx_engagement_parties_party ON engagement_parties(party_id);
CREATE INDEX idx_engagement_parties_role ON engagement_parties(role);
```

**Advantages:**

- ✅ Unlimited contacts/companies per engagement
- ✅ Multiple roles per contact (e.g., PM and estimator)
- ✅ Clear role definitions
- ✅ Can mark primary contact for each role
- ✅ Flexible for future role additions
- ✅ Single source of truth

**Example Usage:**

```sql
-- Add customer company
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
VALUES ('...', 'company', 'company-uuid', 'customer', true);

-- Add primary architect company
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
VALUES ('...', 'company', 'architect-company-uuid', 'architect', true);

-- Add project manager contact
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
VALUES ('...', 'contact', 'contact-uuid', 'project_manager', true);

-- Add additional estimator
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
VALUES ('...', 'contact', 'contact-uuid-2', 'estimator', false);
```

### Option 2: Separate Junction Tables

Create dedicated tables for each relationship type:

```sql
-- For contacts specifically
CREATE TABLE engagement_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('project_manager', 'estimator', 'owner', 'sales_contact')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(engagement_id, contact_id, role)
);

-- For companies specifically
CREATE TABLE engagement_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'architect', 'general_contractor', 'subcontractor')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(engagement_id, company_id, role)
);
```

**Advantages:**

- ✅ Strong type safety (FKs enforced)
- ✅ Clear separation of contacts vs companies
- ✅ Multiple of each type allowed

**Disadvantages:**

- ❌ Two tables to maintain
- ❌ Duplicate code patterns
- ❌ More complex queries (need to union)

## Migration Plan

### Phase 1: Create New Junction Table

```sql
-- Run the CREATE TABLE statement from Option 1
```

### Phase 2: Migrate Existing Data

```sql
BEGIN;

-- Migrate company_id to engagement_parties
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
SELECT
  id as engagement_id,
  'company' as party_type,
  company_id as party_id,
  'customer' as role,
  true as is_primary
FROM engagements
WHERE company_id IS NOT NULL;

-- Migrate architect_id to engagement_parties
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
SELECT
  id as engagement_id,
  'company' as party_type,
  architect_id as party_id,
  'architect' as role,
  true as is_primary
FROM engagements
WHERE architect_id IS NOT NULL;

-- Migrate contact_id to engagement_parties
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
SELECT
  id as engagement_id,
  'contact' as party_type,
  contact_id as party_id,
  'project_manager' as role,  -- Assuming contact_id was for PM
  true as is_primary
FROM engagements
WHERE contact_id IS NOT NULL;

-- Migrate owner (need to find/create user/contact first)
-- This is complex because 'owner' is currently TEXT, not a FK
-- Would need to match against users table or create contacts

COMMIT;
```

### Phase 3: Update Application Code

Update all queries that use `company_id`, `contact_id`, etc. to use the junction table:

```typescript
// OLD CODE
const { data } = await supabase
  .from('engagements')
  .select('*, companies(name), contacts(name)')
  .eq('id', engagementId)
  .single();

// NEW CODE
const { data } = await supabase
  .from('engagements')
  .select(
    `
    *,
    engagement_parties!inner(
      role,
      is_primary,
      party_type,
      contacts:party_id(name, email, phone),
      companies:party_id(name, company_type)
    )
  `
  )
  .eq('id', engagementId)
  .single();

// Helper to get specific party
const customer = data.engagement_parties.find(
  (ep) => ep.role === 'customer' && ep.party_type === 'company'
);
const architect = data.engagement_parties.find(
  (ep) => ep.role === 'architect' && ep.party_type === 'company'
);
const pm = data.engagement_parties.find(
  (ep) => ep.role === 'project_manager' && ep.party_type === 'contact'
);
```

### Phase 4: Create Helper Functions

```sql
-- Function to get primary party for a role
CREATE OR REPLACE FUNCTION get_engagement_primary_party(
  p_engagement_id UUID,
  p_role TEXT
)
RETURNS TABLE (
  party_id UUID,
  party_type TEXT,
  party_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ep.party_id,
    ep.party_type,
    CASE
      WHEN ep.party_type = 'contact' THEN c.name
      WHEN ep.party_type = 'company' THEN co.name
    END as party_name
  FROM engagement_parties ep
  LEFT JOIN contacts c ON ep.party_id = c.id AND ep.party_type = 'contact'
  LEFT JOIN companies co ON ep.party_id = co.id AND ep.party_type = 'company'
  WHERE ep.engagement_id = p_engagement_id
    AND ep.role = p_role
    AND ep.is_primary = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### Phase 5: Drop Old Columns (after verification)

```sql
-- Only after confirming all data is migrated and app works
ALTER TABLE engagements
  DROP COLUMN contact_id,
  DROP COLUMN architect_id,
  DROP COLUMN sales_contact_id,
  DROP COLUMN project_manager_id;

-- Keep company_id for now or migrate it too
-- Keep owner for now (might want to migrate to user_id)
```

## Recommendation

**I recommend Option 1 (Single Junction Table)** because:

1. **Most Flexible**: Can add new roles without schema changes
2. **Simpler Maintenance**: One table to manage
3. **Future-Proof**: Easy to extend with new party types
4. **DRY Principle**: Don't Repeat Yourself
5. **Common Pattern**: Used by many CRM/ERP systems

## Current vs Proposed Comparison

| Aspect              | Current    | Proposed           |
| ------------------- | ---------- | ------------------ |
| Multiple architects | ❌ No      | ✅ Yes             |
| Multiple PMs        | ❌ No      | ✅ Yes             |
| Contact roles       | ❌ Unclear | ✅ Clear & defined |
| Query complexity    | Simple     | Moderate           |
| Flexibility         | Low        | High               |
| Data integrity      | Weak       | Strong             |
| Maintenance         | Hard       | Easy               |

## Next Steps

1. **Review this document** with team
2. **Decide on Option 1 or 2**
3. **Create migration SQL file**
4. **Test on staging environment**
5. **Update application code**
6. **Deploy to production**

## Questions to Answer

1. What roles do we actually need?
   - Current: customer, architect, PM, estimator, sales contact, owner
   - Future: subcontractors, inspectors, other?

2. Should `owner` become a FK to users table?
   - Currently it's free text ("Ben Hall")
   - Better as FK to users for proper permissions

3. Can an engagement have multiple customers?
   - Or is customer always 1:1 with engagement?

4. Do we need historical tracking?
   - E.g., "PM changed from X to Y on this date"
