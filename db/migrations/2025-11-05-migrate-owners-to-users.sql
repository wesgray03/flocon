-- Migration: Migrate owners table data to users table
-- Date: 2025-11-05
-- Purpose: Consolidate owners table into users table with user_type='Owner'
-- This preserves existing owner data and sets up for unified user management

BEGIN;

-- Step 1: Copy all owners to users table with user_type='Owner'
-- Generate email from name if not already in users table
-- Only insert owners that don't already exist by name
INSERT INTO users (name, email, user_type)
SELECT 
  o.name,
  -- Generate email from name: lowercase, replace spaces with dots, add domain
  LOWER(REPLACE(o.name, ' ', '.')) || '@floorsunlimited.com' as email,
  'Owner' as user_type
FROM owners o
WHERE NOT EXISTS (
  SELECT 1 FROM users u 
  WHERE u.name = o.name
)
ON CONFLICT (email) DO NOTHING;

-- Step 2: For any owners with duplicate emails (rare), try adding a number
-- This handles edge cases where generated emails might conflict
DO $$
DECLARE
  owner_rec RECORD;
  counter INT;
  new_email TEXT;
BEGIN
  FOR owner_rec IN 
    SELECT o.name 
    FROM owners o
    WHERE NOT EXISTS (
      SELECT 1 FROM users u WHERE u.name = o.name
    )
  LOOP
    counter := 1;
    LOOP
      new_email := LOWER(REPLACE(owner_rec.name, ' ', '.')) || counter::TEXT || '@floorsunlimited.com';
      BEGIN
        INSERT INTO users (name, email, user_type)
        VALUES (owner_rec.name, new_email, 'Owner');
        EXIT; -- Success, exit the inner loop
      EXCEPTION WHEN unique_violation THEN
        counter := counter + 1;
        IF counter > 100 THEN
          RAISE EXCEPTION 'Could not generate unique email for owner: %', owner_rec.name;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Verify migration
-- This query shows what was migrated
DO $$
DECLARE
  owners_count INT;
  users_owner_count INT;
BEGIN
  SELECT COUNT(*) INTO owners_count FROM owners;
  SELECT COUNT(*) INTO users_owner_count FROM users WHERE user_type = 'Owner';
  
  RAISE NOTICE 'Migration complete: % owners from owners table, % Owner users in users table', 
    owners_count, users_owner_count;
END $$;

COMMIT;

-- Verification query to run manually after migration:
-- SELECT 
--   o.name as owner_name,
--   u.name as user_name,
--   u.email as user_email,
--   u.user_type
-- FROM owners o
-- LEFT JOIN users u ON o.name = u.name
-- ORDER BY o.name;
