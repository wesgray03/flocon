-- Migration: Add foreign key from project_comments.user_id to users.id
-- Date: 2025-11-07
-- Purpose: Enable join between project_comments and users for Supabase queries

BEGIN;

ALTER TABLE project_comments
ADD CONSTRAINT project_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE SET NULL;

COMMIT;
