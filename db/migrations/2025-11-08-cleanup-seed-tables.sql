-- Migration: Clean up seed and legacy tables
-- Date: 2025-11-08
-- Purpose: Remove seed data tables and legacy tables that have been migrated
-- WARNING: Only run this AFTER verifying data migration is complete

BEGIN;

-- ============================================================================
-- SEED TABLES (used for initial data import)
-- ============================================================================

-- These tables were used to import data from Excel/CSV
-- They can be safely deleted once data is migrated to the main tables

DROP TABLE IF EXISTS public.seed_projects_raw CASCADE;
DROP TABLE IF EXISTS public.seed_projects_clean CASCADE;

RAISE NOTICE 'Dropped seed tables: seed_projects_raw, seed_projects_clean';

-- ============================================================================
-- LEGACY TABLES (migrated to new structure)
-- ============================================================================

-- managers table → migrated to contacts with contact_type='Project Manager'
-- Migration file: 2025-11-05-migrate-managers-to-contacts.sql
-- Verify before dropping:
-- SELECT COUNT(*) FROM managers;
-- SELECT COUNT(*) FROM contacts WHERE contact_type = 'Project Manager';

-- Uncomment to drop managers table (after verification):
-- DROP TABLE IF EXISTS public.managers CASCADE;
-- RAISE NOTICE 'Dropped legacy table: managers (migrated to contacts)';

-- owners table → migrated to users with user_type='Owner'
-- Migration file: 2025-11-05-migrate-owners-to-users.sql
-- Verify before dropping:
-- SELECT COUNT(*) FROM owners;
-- SELECT COUNT(*) FROM users WHERE user_type = 'Owner';

-- Uncomment to drop owners table (after verification):
-- DROP TABLE IF EXISTS public.owners CASCADE;
-- RAISE NOTICE 'Dropped legacy table: owners (migrated to users)';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify data was migrated before dropping legacy tables:

-- Check managers migration:
-- SELECT 
--   'managers' as source_table,
--   COUNT(*) as count
-- FROM managers
-- UNION ALL
-- SELECT 
--   'contacts (Project Manager)' as source_table,
--   COUNT(*) as count
-- FROM contacts
-- WHERE contact_type = 'Project Manager';

-- Check owners migration:
-- SELECT 
--   'owners' as source_table,
--   COUNT(*) as count
-- FROM owners
-- UNION ALL
-- SELECT 
--   'users (Owner)' as source_table,
--   COUNT(*) as count
-- FROM users
-- WHERE user_type = 'Owner';
