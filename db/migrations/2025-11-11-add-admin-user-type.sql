-- Migration: Add Admin user type
-- Date: 2025-11-11
-- Purpose: Add Admin role for highest level access (above Office and Field)

BEGIN;

-- Step 1: Drop the existing constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Step 2: Add new constraint with Admin included
-- Admin = Highest level access (future-proofing for advanced permissions)
-- Office = Back office staff
-- Field = Field workers (foremen, superintendents)
ALTER TABLE users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('Admin', 'Office', 'Field'));

COMMIT;

-- Usage notes:
-- - Admin: Reserved for highest level system access and permissions
-- - Office: Regular office staff with project/prospect management access
-- - Field: Field personnel (foremen, superintendents) with limited office access
