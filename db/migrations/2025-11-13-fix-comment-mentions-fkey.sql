-- Migration: Fix comment_mentions foreign key to reference engagement_comments
-- Date: 2025-11-13
-- Purpose: Update foreign key after table rename from project_comments to engagement_comments

BEGIN;

-- Drop the old foreign key constraint
ALTER TABLE comment_mentions
DROP CONSTRAINT IF EXISTS comment_mentions_comment_id_fkey;

-- Add the new foreign key constraint pointing to engagement_comments
ALTER TABLE comment_mentions
ADD CONSTRAINT comment_mentions_comment_id_fkey
FOREIGN KEY (comment_id) 
REFERENCES engagement_comments(id) 
ON DELETE CASCADE;

-- Update the RLS policy that references the old table name
DROP POLICY IF EXISTS "Users can delete mentions for own comments" ON comment_mentions;

CREATE POLICY "Users can delete mentions for own comments"
  ON comment_mentions
  FOR DELETE
  USING (
    auth.uid() = (
      SELECT u.auth_user_id 
      FROM engagement_comments ec 
      JOIN users u ON u.id = ec.user_id 
      WHERE ec.id = comment_mentions.comment_id
    )
  );

COMMIT;
