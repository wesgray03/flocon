-- Fix duplicate users by keeping only the most recent one for each auth_user_id
-- and updating all references to use that user

-- Step 1: See what we're dealing with
SELECT auth_user_id, COUNT(*) as duplicate_count, MAX(created_at) as latest_created
FROM users
GROUP BY auth_user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 1b: Check for NULL auth_user_id records
SELECT id, name, email, created_at 
FROM users 
WHERE auth_user_id IS NULL
ORDER BY created_at DESC;

-- Step 2: Create a mapping of old user IDs to the kept user ID
CREATE TEMP TABLE user_id_mapping AS
WITH ranked_users AS (
  SELECT 
    id,
    auth_user_id,
    ROW_NUMBER() OVER (PARTITION BY auth_user_id ORDER BY created_at DESC) as rn
  FROM users
  WHERE auth_user_id IS NOT NULL  -- Only process users with valid auth_user_id
)
SELECT 
  old_user.id as old_id,
  keep_user.id as new_id
FROM ranked_users old_user
JOIN ranked_users keep_user 
  ON old_user.auth_user_id = keep_user.auth_user_id 
  AND keep_user.rn = 1
WHERE old_user.rn > 1;

-- Step 3: Update project_comments to use the kept user ID
UPDATE project_comments
SET user_id = mapping.new_id
FROM user_id_mapping mapping
WHERE project_comments.user_id = mapping.old_id;

-- Step 4: Now it's safe to delete the duplicate users
DELETE FROM users
WHERE id IN (SELECT old_id FROM user_id_mapping);

-- Step 5: Handle NULL auth_user_id records - delete them if they have no comments
DELETE FROM users
WHERE auth_user_id IS NULL
  AND id NOT IN (SELECT DISTINCT user_id FROM project_comments WHERE user_id IS NOT NULL);

-- Step 6: Verify cleanup - should return no rows
SELECT auth_user_id, COUNT(*) as count
FROM users
GROUP BY auth_user_id
HAVING COUNT(*) > 1;

-- Step 7: Add a unique constraint to prevent future duplicates (if it doesn't exist)
-- Note: This will allow one NULL, but prevent duplicate non-NULL values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_user_id_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_auth_user_id_unique UNIQUE (auth_user_id);
    END IF;
END $$;
