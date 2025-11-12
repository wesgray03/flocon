-- Migration: Rename engagement_user_roles to match UI terminology
-- Date: 2025-11-11
-- Purpose: Rename 'project_owner' to 'project_lead' and 'prospect_owner' to 'sales_lead'

-- Step 1: Drop the existing CHECK constraint FIRST
ALTER TABLE engagement_user_roles 
DROP CONSTRAINT IF EXISTS engagement_user_roles_role_check;

-- Step 2: Update existing data (now that constraint is removed)
UPDATE engagement_user_roles 
SET role = 'project_lead' 
WHERE role = 'project_owner';

UPDATE engagement_user_roles 
SET role = 'sales_lead' 
WHERE role = 'prospect_owner';

-- Step 3: Add new CHECK constraint with updated role names
ALTER TABLE engagement_user_roles 
ADD CONSTRAINT engagement_user_roles_role_check 
CHECK (role IN ('sales_lead', 'project_lead', 'foreman', 'estimator', 'project_admin', 'observer'));

-- Note: The UI already uses "Project Lead" and "Sales Lead" 
-- This migration aligns the database with the UI terminology
