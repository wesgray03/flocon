-- Migration: Drop legacy tables (managers, owners, customers)
-- Date: 2025-11-09
-- Purpose: Remove old tables that have been migrated to new structure
-- 
-- Data Migration Status:
-- ✓ managers → contacts (contact_type='Project Manager') - 31 records migrated
-- ✓ owners → users (user_type='Owner') - migrated
-- ✓ customers → companies (is_customer=true) - 30 records exist
--
-- Code Migration Status:
-- ✓ All code updated to use new tables (engagements, contacts, companies, users)

BEGIN;

-- Drop legacy managers table (migrated to contacts)
DROP TABLE IF EXISTS public.managers CASCADE;
RAISE NOTICE 'Dropped legacy table: managers (data migrated to contacts with contact_type=Project Manager)';

-- Drop legacy owners table (migrated to users)
DROP TABLE IF EXISTS public.owners CASCADE;
RAISE NOTICE 'Dropped legacy table: owners (data migrated to users with user_type=Owner)';

-- Drop legacy customers table (migrated to companies)
DROP TABLE IF EXISTS public.customers CASCADE;
RAISE NOTICE 'Dropped legacy table: customers (data migrated to companies with is_customer=true)';

-- Drop legacy projects table if it exists (migrated to engagements)
DROP TABLE IF EXISTS public.projects CASCADE;
RAISE NOTICE 'Dropped legacy table: projects (data exists in engagements, views use project_dashboard)';

COMMIT;

-- Verification:
-- All project data should be in engagements table
-- All customer data should be in companies table with is_customer=true
-- All manager data should be in contacts table with contact_type='Project Manager'
-- All owner data should be in users table with user_type='Owner'
