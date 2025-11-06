-- Migration: Create project_tasks table
-- Date: 2025-11-05
-- Purpose: Create a master task list associated with stages for tracking project progress

BEGIN;

-- Create the project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  complete BOOLEAN NOT NULL DEFAULT false,
  order_num INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on stage_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_tasks_stage_id ON project_tasks(stage_id);

-- Create index on order for sorting
CREATE INDEX IF NOT EXISTS idx_project_tasks_order ON project_tasks(order_num);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_project_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS project_tasks_updated_at ON project_tasks;
CREATE TRIGGER project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_tasks_updated_at();

-- Add comment to document the table
COMMENT ON TABLE project_tasks IS 'Master task list for each stage. Tasks are templates that can be tracked per project.';

COMMIT;
