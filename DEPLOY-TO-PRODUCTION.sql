-- ============================================================================
-- PRODUCTION DEPLOYMENT - November 7, 2025
-- ============================================================================
-- Run this in Production Supabase SQL Editor:
-- https://supabase.com/dashboard/project/groxqyaoavmfvmaymhbe/sql
-- 
-- This script deploys the final missing piece: project_task_completion
-- All other tables (users, contacts, project_tasks, project_comments) are already deployed.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD RLS POLICIES FOR PROJECT_COMMENTS (if not already added)
-- ============================================================================

-- Enable RLS on project_comments if not already enabled
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public access in staging" ON project_comments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON project_comments;
DROP POLICY IF EXISTS "Users can view all comments" ON project_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON project_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON project_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON project_comments;

-- Policy: Allow authenticated users to view all project comments
CREATE POLICY "Users can view all comments"
  ON project_comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert comments
CREATE POLICY "Users can insert comments"
  ON project_comments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow users to update their own comments
CREATE POLICY "Users can update own comments"
  ON project_comments
  FOR UPDATE
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = project_comments.user_id));

-- Policy: Allow users to delete their own comments
CREATE POLICY "Users can delete own comments"
  ON project_comments
  FOR DELETE
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = project_comments.user_id));

-- ============================================================================
-- 2. ADD FOREIGN KEY FOR PROJECT_COMMENTS (if not already added)
-- ============================================================================

-- Check if foreign key already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_comments_user_id_fkey'
  ) THEN
    ALTER TABLE project_comments
    ADD CONSTRAINT project_comments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE PROJECT_TASK_COMPLETION TABLE (MAIN DEPLOYMENT)
-- ============================================================================

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

-- ============================================================================
-- 4. ADD RLS POLICIES FOR PROJECT_TASK_COMPLETION
-- ============================================================================

-- Enable RLS
ALTER TABLE project_task_completion ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all task completions
CREATE POLICY "Users can view all task completions"
  ON project_task_completion
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert task completions
CREATE POLICY "Users can insert task completions"
  ON project_task_completion
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update task completions
CREATE POLICY "Users can update task completions"
  ON project_task_completion
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete task completions
CREATE POLICY "Users can delete task completions"
  ON project_task_completion
  FOR DELETE
  USING (auth.role() = 'authenticated');

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after the migration to verify success:

-- 1. Check that table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'project_task_completion';

-- 2. Check that indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'project_task_completion';

-- 3. Check that complete column was removed from project_tasks
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project_tasks' 
  AND column_name = 'complete';
-- Should return 0 rows

-- 4. Check RLS policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'project_task_completion';

-- ============================================================================
-- DEPLOYMENT COMPLETE! 
-- ============================================================================
-- Next steps:
-- 1. Test the app at https://floconapp.com
-- 2. Check project status page - tasks should display correctly
-- 3. Try checking/unchecking tasks
-- 4. Verify tasks are per-project (not global)
-- ============================================================================
