-- Migration: Add follow-up tracking to comments
-- Date: 2025-11-20
-- Purpose: Allow comments to be marked as follow-ups and track last contact date

BEGIN;

-- Add is_follow_up flag to engagement_comments
ALTER TABLE engagement_comments
ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT false;

-- Add index for querying follow-up comments
CREATE INDEX IF NOT EXISTS idx_engagement_comments_follow_up 
ON engagement_comments(engagement_id, is_follow_up, created_at DESC);

-- Add comment
COMMENT ON COLUMN engagement_comments.is_follow_up IS 'Whether this comment represents a follow-up contact (call, email, meeting, etc.)';

COMMIT;
