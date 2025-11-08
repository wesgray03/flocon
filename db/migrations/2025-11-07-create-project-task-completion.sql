-- Migration: Create project_task_completion table
-- Date: 2025-11-07
-- Purpose: Track task completion on a per-project basis instead of globally

BEGIN;

-- Create the project_task_completion junction table
CREATE TABLE IF NOT EXISTS project_task_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure one record per project-task combination
  UNIQUE(project_id, task_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_task_completion_project_id ON project_task_completion(project_id);
CREATE INDEX IF NOT EXISTS idx_project_task_completion_task_id ON project_task_completion(task_id);
CREATE INDEX IF NOT EXISTS idx_project_task_completion_complete ON project_task_completion(complete);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_project_task_completion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Set completed_at timestamp when marking as complete
  IF NEW.complete = true AND OLD.complete = false THEN
    NEW.completed_at = now();
  ELSIF NEW.complete = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS project_task_completion_updated_at ON project_task_completion;
CREATE TRIGGER project_task_completion_updated_at
  BEFORE UPDATE ON project_task_completion
  FOR EACH ROW
  EXECUTE FUNCTION update_project_task_completion_updated_at();

-- Remove the complete column from project_tasks since it's now per-project
-- WARNING: This will lose any existing completion data
ALTER TABLE project_tasks DROP COLUMN IF EXISTS complete;

-- Add comment to document the table
COMMENT ON TABLE project_task_completion IS 'Tracks task completion status per project';

COMMIT;
