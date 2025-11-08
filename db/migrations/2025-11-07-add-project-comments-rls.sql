-- Migration: Add RLS policies for project_comments
-- Date: 2025-11-07
-- Purpose: Enable Row Level Security and create policies for project_comments table

BEGIN;

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

COMMIT;

-- Verify policies
-- SELECT * FROM pg_policies WHERE tablename = 'project_comments';
