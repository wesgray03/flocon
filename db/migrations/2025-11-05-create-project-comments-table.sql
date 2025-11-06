-- Migration: Create project comments table
-- Date: 2025-11-05
-- Purpose: Track comments/notes on projects with user attribution

BEGIN;

-- Create project_comments table
CREATE TABLE IF NOT EXISTS project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  comment_text TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_project_comments_project ON project_comments(project_id);
CREATE INDEX idx_project_comments_user ON project_comments(user_id);
CREATE INDEX idx_project_comments_created_at ON project_comments(created_at DESC);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_comments_updated_at
BEFORE UPDATE ON project_comments
FOR EACH ROW
EXECUTE FUNCTION update_project_comments_updated_at();

COMMIT;

-- Example query to get comments with user info:
-- SELECT 
--   pc.id,
--   pc.comment_text,
--   pc.created_at,
--   u.name as user_name,
--   u.user_type
-- FROM project_comments pc
-- JOIN users u ON pc.user_id = u.id
-- WHERE pc.project_id = '<project-id>'
-- ORDER BY pc.created_at DESC;
