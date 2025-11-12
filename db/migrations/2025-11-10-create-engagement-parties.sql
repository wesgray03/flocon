-- Migration: Create engagement_parties junction table
-- Date: 2025-11-10
-- Purpose: Replace multiple FK columns with flexible junction table for engagement relationships

-- Create the engagement_parties junction table
CREATE TABLE IF NOT EXISTS engagement_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL CHECK (party_type IN ('contact', 'company')),
  party_id UUID NOT NULL,  -- References either contacts.id or companies.id
  role TEXT NOT NULL CHECK (role IN (
    'customer',
    'architect', 
    'general_contractor',
    'project_manager',
    'estimator',
    'owner',
    'sales_contact',
    'subcontractor',
    'other'
  )),
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate party-role combinations
  CONSTRAINT unique_engagement_party_role UNIQUE (engagement_id, party_id, role)
);

-- Create unique partial index for primary role enforcement (separate from table definition)
CREATE UNIQUE INDEX IF NOT EXISTS idx_engagement_parties_unique_primary
  ON engagement_parties(engagement_id, role)
  WHERE is_primary = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagement_parties_engagement 
  ON engagement_parties(engagement_id);
CREATE INDEX IF NOT EXISTS idx_engagement_parties_party 
  ON engagement_parties(party_id);
CREATE INDEX IF NOT EXISTS idx_engagement_parties_role 
  ON engagement_parties(role);
CREATE INDEX IF NOT EXISTS idx_engagement_parties_primary 
  ON engagement_parties(engagement_id, role, is_primary) 
  WHERE is_primary = true;

-- Add comments for documentation
COMMENT ON TABLE engagement_parties IS 
  'Junction table linking engagements to contacts and companies with specific roles';
COMMENT ON COLUMN engagement_parties.party_type IS 
  'Type of party: contact or company';
COMMENT ON COLUMN engagement_parties.party_id IS 
  'UUID of the party (references contacts.id or companies.id depending on party_type)';
COMMENT ON COLUMN engagement_parties.role IS 
  'Role of the party in this engagement (customer, architect, PM, etc.)';
COMMENT ON COLUMN engagement_parties.is_primary IS 
  'Whether this is the primary contact/company for this role';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_engagement_parties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS engagement_parties_updated_at ON engagement_parties;
CREATE TRIGGER engagement_parties_updated_at
  BEFORE UPDATE ON engagement_parties
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_parties_updated_at();

-- Migrate existing data from engagements table

-- 1. Migrate company_id (customer companies)
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
SELECT 
  id as engagement_id,
  'company' as party_type,
  company_id as party_id,
  'customer' as role,
  true as is_primary
FROM engagements
WHERE company_id IS NOT NULL
ON CONFLICT (engagement_id, party_id, role) DO NOTHING;

-- 2. Migrate architect_id (architect companies)
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
SELECT 
  id as engagement_id,
  'company' as party_type,
  architect_id as party_id,
  'architect' as role,
  true as is_primary
FROM engagements
WHERE architect_id IS NOT NULL
ON CONFLICT (engagement_id, party_id, role) DO NOTHING;

-- 3. Migrate contact_id (project manager contacts)
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
SELECT 
  id as engagement_id,
  'contact' as party_type,
  contact_id as party_id,
  'project_manager' as role,
  true as is_primary
FROM engagements
WHERE contact_id IS NOT NULL
ON CONFLICT (engagement_id, party_id, role) DO NOTHING;

-- 4. Migrate sales_contact_id (sales contacts)
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
SELECT 
  id as engagement_id,
  'contact' as party_type,
  sales_contact_id as party_id,
  'sales_contact' as role,
  true as is_primary
FROM engagements
WHERE sales_contact_id IS NOT NULL
ON CONFLICT (engagement_id, party_id, role) DO NOTHING;

-- 5. Migrate project_manager_id (if different from contact_id)
INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)
SELECT 
  id as engagement_id,
  'contact' as party_type,
  project_manager_id as party_id,
  'project_manager' as role,
  true as is_primary
FROM engagements
WHERE project_manager_id IS NOT NULL
  AND (contact_id IS NULL OR project_manager_id != contact_id)
ON CONFLICT (engagement_id, party_id, role) DO NOTHING;

-- Create helper function to get primary party for a role
CREATE OR REPLACE FUNCTION get_engagement_primary_party(
  p_engagement_id UUID,
  p_role TEXT
)
RETURNS TABLE (
  party_id UUID,
  party_type TEXT,
  party_name TEXT,
  party_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.party_id,
    ep.party_type,
    CASE 
      WHEN ep.party_type = 'contact' THEN c.name
      WHEN ep.party_type = 'company' THEN co.name
      ELSE NULL
    END as party_name,
    CASE 
      WHEN ep.party_type = 'contact' THEN c.email
      WHEN ep.party_type = 'company' THEN co.email
      ELSE NULL
    END as party_email
  FROM engagement_parties ep
  LEFT JOIN contacts c ON ep.party_id = c.id AND ep.party_type = 'contact'
  LEFT JOIN companies co ON ep.party_id = co.id AND ep.party_type = 'company'
  WHERE ep.engagement_id = p_engagement_id
    AND ep.role = p_role
    AND ep.is_primary = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_engagement_primary_party IS 
  'Helper function to retrieve the primary contact or company for a specific role in an engagement';

-- Create view for easy querying of engagement parties
CREATE OR REPLACE VIEW engagement_parties_detailed AS
SELECT 
  ep.id,
  ep.engagement_id,
  ep.party_type,
  ep.party_id,
  ep.role,
  ep.is_primary,
  ep.notes,
  ep.created_at,
  ep.updated_at,
  e.name as engagement_name,
  CASE 
    WHEN ep.party_type = 'contact' THEN c.name
    WHEN ep.party_type = 'company' THEN co.name
  END as party_name,
  CASE 
    WHEN ep.party_type = 'contact' THEN c.email
    WHEN ep.party_type = 'company' THEN co.email
  END as party_email,
  CASE 
    WHEN ep.party_type = 'contact' THEN c.phone
    WHEN ep.party_type = 'company' THEN co.phone
  END as party_phone,
  CASE 
    WHEN ep.party_type = 'company' THEN co.company_type
  END as company_type
FROM engagement_parties ep
JOIN engagements e ON ep.engagement_id = e.id
LEFT JOIN contacts c ON ep.party_id = c.id AND ep.party_type = 'contact'
LEFT JOIN companies co ON ep.party_id = co.id AND ep.party_type = 'company';

COMMENT ON VIEW engagement_parties_detailed IS 
  'Detailed view of engagement parties with contact/company information joined';

-- Enable RLS on engagement_parties
ALTER TABLE engagement_parties ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can manage their engagements)
CREATE POLICY engagement_parties_select_policy ON engagement_parties
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY engagement_parties_insert_policy ON engagement_parties
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY engagement_parties_update_policy ON engagement_parties
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY engagement_parties_delete_policy ON engagement_parties
  FOR DELETE TO authenticated
  USING (true);

-- NOTES FOR FUTURE MIGRATION:
-- After verifying this works and updating application code, you can optionally:
-- 1. Drop old FK columns: contact_id, architect_id, sales_contact_id, project_manager_id
-- 2. Consider migrating 'owner' text field to user_id or creating contacts for owners
-- 3. Consider if company_id should remain or be fully replaced by engagement_parties

-- Example queries to verify:
-- SELECT * FROM engagement_parties_detailed WHERE engagement_id = 'some-uuid';
-- SELECT * FROM get_engagement_primary_party('some-uuid', 'customer');
