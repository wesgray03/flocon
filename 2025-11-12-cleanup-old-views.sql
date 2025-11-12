-- Migration: Cleanup any remaining old dashboard views
-- Date: 2025-11-12
-- Purpose: Remove any lingering engagement_dashboard or other intermediate views
-- Background: We've moved from complex dashboard views to thin filter-only views (projects_v, prospects_v)

-- Drop any old views that may still exist
DROP VIEW IF EXISTS engagement_dashboard CASCADE;
DROP VIEW IF EXISTS project_dashboard CASCADE;
DROP VIEW IF EXISTS prospect_dashboard CASCADE;

-- Verify our current thin views exist (they should from previous migration)
-- This is idempotent - if they already exist, this just recreates them
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
