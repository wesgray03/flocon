-- Migration: Rename project_id to engagement_id in related tables
-- Date: 2025-11-10
-- Description:
--   Rename project_id column to engagement_id in sov_lines, pay_apps, and change_orders tables
--   to maintain consistency with the engagements table naming

-- Rename in sov_lines table
ALTER TABLE sov_lines 
RENAME COLUMN project_id TO engagement_id;

-- Rename in pay_apps table
ALTER TABLE pay_apps 
RENAME COLUMN project_id TO engagement_id;

-- Rename in change_orders table
ALTER TABLE change_orders 
RENAME COLUMN project_id TO engagement_id;

-- Update comments
COMMENT ON COLUMN sov_lines.engagement_id IS 'FK to engagements table (was project_id)';
COMMENT ON COLUMN pay_apps.engagement_id IS 'FK to engagements table (was project_id)';
COMMENT ON COLUMN change_orders.engagement_id IS 'FK to engagements table (was project_id)';
