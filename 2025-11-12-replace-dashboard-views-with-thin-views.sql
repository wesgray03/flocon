-- Migration: Replace complex dashboard views with thin filter-only views
-- Date: 2025-11-12
-- Purpose: Simplify views during active development - easier maintenance, consistent patterns
-- Background: Complex project_dashboard and prospect_dashboard views have computed fields
-- that require updates when schema changes. During rapid development, thin views with
-- party/role loading in code is more maintainable and consistent.

-- Drop existing complex dashboard views
DROP VIEW IF EXISTS project_dashboard CASCADE;
DROP VIEW IF EXISTS prospect_dashboard CASCADE;

-- Create thin filter-only views
-- These simply filter by type - all party/role loading happens in TypeScript code
CREATE OR REPLACE VIEW projects_v AS
SELECT *
FROM engagements
WHERE type = 'project';

CREATE OR REPLACE VIEW prospects_v AS
SELECT *
FROM engagements
WHERE type = 'prospect';

-- Add comments
COMMENT ON VIEW projects_v IS 'Thin view for projects (type=project). All party and user role fields are loaded separately via engagement_parties and engagement_user_roles tables in application code for flexibility during development.';

COMMENT ON VIEW prospects_v IS 'Thin view for prospects (type=prospect). All party and user role fields are loaded separately via engagement_parties and engagement_user_roles tables in application code for flexibility during development.';
