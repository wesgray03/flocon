-- Migration: Add comment mentions support
-- Date: 2025-11-08
-- Purpose: Enable @mentions in comments with user tagging

BEGIN;

-- Create comment_mentions table to track which users are mentioned in comments
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES project_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ, -- Track when notification was sent
  read_at TIMESTAMPTZ, -- Track when user viewed the mention (future feature)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate mentions in same comment
  UNIQUE(comment_id, mentioned_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX idx_comment_mentions_mentioned_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX idx_comment_mentions_notified ON comment_mentions(notified_at) WHERE notified_at IS NULL;

-- Add RLS policies
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view mentions
CREATE POLICY "Users can view all mentions"
  ON comment_mentions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can create mentions when creating comments
CREATE POLICY "Users can create mentions"
  ON comment_mentions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can delete mentions for their own comments
CREATE POLICY "Users can delete mentions for own comments"
  ON comment_mentions
  FOR DELETE
  USING (
    auth.uid() = (
      SELECT u.auth_user_id 
      FROM project_comments pc 
      JOIN users u ON u.id = pc.user_id 
      WHERE pc.id = comment_mentions.comment_id
    )
  );

COMMIT;
