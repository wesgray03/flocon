-- Migration: Create subcontractors and project_subcontractors tables
-- Date: 2025-11-05
-- Purpose: Track subcontractors and their assignments to projects via work orders

BEGIN;

-- Create subcontractors master table
CREATE TABLE IF NOT EXISTS subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create junction table for project-subcontractor assignments
CREATE TABLE IF NOT EXISTS project_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  work_order_number TEXT,
  assigned_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, subcontractor_id)
);

-- Create indexes for performance
CREATE INDEX idx_subcontractors_name ON subcontractors(name);
CREATE INDEX idx_project_subcontractors_project ON project_subcontractors(project_id);
CREATE INDEX idx_project_subcontractors_subcontractor ON project_subcontractors(subcontractor_id);

-- Create trigger to auto-update updated_at timestamp on subcontractors
CREATE OR REPLACE FUNCTION update_subcontractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subcontractors_updated_at
BEFORE UPDATE ON subcontractors
FOR EACH ROW
EXECUTE FUNCTION update_subcontractors_updated_at();

-- Create trigger to auto-update updated_at timestamp on project_subcontractors
CREATE OR REPLACE FUNCTION update_project_subcontractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_subcontractors_updated_at
BEFORE UPDATE ON project_subcontractors
FOR EACH ROW
EXECUTE FUNCTION update_project_subcontractors_updated_at();

COMMIT;

-- Example queries:
-- Get all subcontractors for a project:
-- SELECT s.* FROM subcontractors s
-- JOIN project_subcontractors ps ON s.id = ps.subcontractor_id
-- WHERE ps.project_id = '<project-id>';

-- Get all projects for a subcontractor:
-- SELECT p.* FROM projects p
-- JOIN project_subcontractors ps ON p.id = ps.project_id
-- WHERE ps.subcontractor_id = '<subcontractor-id>';
