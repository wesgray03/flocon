-- Migration: Create engagement_user_roles junction table
-- Date: 2025-11-10
-- Purpose: Manage user-role assignments for engagements (project owner, foreman, etc.)

BEGIN;

-- 1. Create the engagement_user_roles junction table
CREATE TABLE IF NOT EXISTS engagement_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'prospect_owner',    -- Owner during prospect/lead stage
    'project_owner',     -- Owner once converted to project
    'foreman',           -- On-site foreman
    'estimator',         -- Estimator assigned
    'project_admin',     -- Additional admin for this project
    'observer'           -- Read-only observer
  )),
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate user-role combinations
  CONSTRAINT unique_engagement_user_role UNIQUE (engagement_id, user_id, role)
);

-- Create unique partial index for primary role enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_engagement_user_roles_unique_primary
  ON engagement_user_roles(engagement_id, role)
  WHERE is_primary = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_engagement_user_roles_engagement 
  ON engagement_user_roles(engagement_id);
CREATE INDEX IF NOT EXISTS idx_engagement_user_roles_user 
  ON engagement_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_user_roles_role 
  ON engagement_user_roles(role);
CREATE INDEX IF NOT EXISTS idx_engagement_user_roles_primary 
  ON engagement_user_roles(engagement_id, role, is_primary) 
  WHERE is_primary = true;

-- Add comments for documentation
COMMENT ON TABLE engagement_user_roles IS 
  'Junction table linking engagements to users with specific roles';
COMMENT ON COLUMN engagement_user_roles.role IS 
  'User role on this engagement (prospect_owner, project_owner, foreman, etc.)';
COMMENT ON COLUMN engagement_user_roles.is_primary IS 
  'Whether this is the primary user for this role (enforced via unique index)';
COMMENT ON COLUMN engagement_user_roles.assigned_by IS 
  'User who assigned this role (audit trail)';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_engagement_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS engagement_user_roles_updated_at ON engagement_user_roles;
CREATE TRIGGER engagement_user_roles_updated_at
  BEFORE UPDATE ON engagement_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_user_roles_updated_at();

-- 2. Migrate existing data from engagements table

-- Migrate user_id (project owner)
INSERT INTO engagement_user_roles (engagement_id, user_id, role, is_primary, notes)
SELECT 
  id as engagement_id,
  user_id,
  'project_owner' as role,
  true as is_primary,
  'Migrated from engagements.user_id' as notes
FROM engagements
WHERE user_id IS NOT NULL
ON CONFLICT (engagement_id, user_id, role) DO NOTHING;

-- Migrate foreman_id
INSERT INTO engagement_user_roles (engagement_id, user_id, role, is_primary, notes)
SELECT 
  id as engagement_id,
  foreman_id as user_id,
  'foreman' as role,
  true as is_primary,
  'Migrated from engagements.foreman_id' as notes
FROM engagements
WHERE foreman_id IS NOT NULL
ON CONFLICT (engagement_id, user_id, role) DO NOTHING;

-- 3. Create helper function to get primary user for a role
CREATE OR REPLACE FUNCTION get_engagement_primary_user(
  p_engagement_id UUID,
  p_role TEXT
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_type TEXT,
  assigned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eur.user_id,
    u.name as user_name,
    u.email as user_email,
    u.user_type,
    eur.assigned_at
  FROM engagement_user_roles eur
  JOIN users u ON eur.user_id = u.id
  WHERE eur.engagement_id = p_engagement_id
    AND eur.role = p_role
    AND eur.is_primary = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_engagement_primary_user IS 
  'Helper function to retrieve the primary user for a specific role in an engagement';

-- 4. Create view for easy querying with user details
CREATE OR REPLACE VIEW engagement_user_roles_detailed AS
SELECT 
  eur.id,
  eur.engagement_id,
  eur.user_id,
  eur.role,
  eur.is_primary,
  eur.assigned_at,
  eur.assigned_by,
  eur.notes,
  eur.created_at,
  eur.updated_at,
  e.name as engagement_name,
  e.type as engagement_type,
  u.name as user_name,
  u.email as user_email,
  u.user_type,
  assigner.name as assigned_by_name
FROM engagement_user_roles eur
JOIN engagements e ON eur.engagement_id = e.id
JOIN users u ON eur.user_id = u.id
LEFT JOIN users assigner ON eur.assigned_by = assigner.id;

COMMENT ON VIEW engagement_user_roles_detailed IS 
  'Detailed view of engagement user roles with user and engagement information joined';

-- 5. Enable RLS on engagement_user_roles
ALTER TABLE engagement_user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can manage their engagements)
CREATE POLICY engagement_user_roles_select_policy ON engagement_user_roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY engagement_user_roles_insert_policy ON engagement_user_roles
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY engagement_user_roles_update_policy ON engagement_user_roles
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY engagement_user_roles_delete_policy ON engagement_user_roles
  FOR DELETE TO authenticated
  USING (true);

COMMIT;
