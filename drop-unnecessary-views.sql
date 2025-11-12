-- Drop unnecessary views from production
-- These views are replaced with direct queries using Supabase's automatic joins
-- Run this in Supabase SQL Editor after deploying the updated frontend code

-- Drop views (these are safe to drop as frontend now queries tables directly)
DROP VIEW IF EXISTS engagement_dashboard CASCADE;
DROP VIEW IF EXISTS engagement_parties_detailed CASCADE;
DROP VIEW IF EXISTS engagement_user_roles_detailed CASCADE;

-- Drop helper function (not used by frontend)
DROP FUNCTION IF EXISTS get_engagement_primary_party(UUID, TEXT) CASCADE;

-- Success message
SELECT 'Unnecessary views dropped - frontend now queries tables directly' as status;
