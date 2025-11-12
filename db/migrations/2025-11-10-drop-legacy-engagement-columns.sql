-- Migration: Drop legacy engagement party FK columns now replaced by engagement_parties junction table
-- Date: 2025-11-10
-- Purpose: Remove obsolete columns (company_id, contact_id, architect_id, sales_contact_id, project_manager_id) from engagements
-- Preconditions:
--   1. engagement_parties table and engagement_parties_detailed view are live (see 2025-11-10-create-engagement-parties.sql)
--   2. Frontend code paths no longer rely on these columns for display or writes (verified via grep/code review)
--   3. All necessary primary party relationships have been migrated (initial migration inserted them)
--   4. No downstream views still selecting these columns (ensure project_dashboard / prospect views updated)
-- Safety:
--   - Wrapped in a transaction.
--   - Each DROP COLUMN uses IF EXISTS to avoid failure if already removed.
-- Rollback Strategy:
--   - If needed, recreate the columns and re-populate from engagement_parties (reverse of initial migration)
--   - Example recreation snippet provided at end (commented out).

BEGIN;

ALTER TABLE engagements
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS contact_id,
  DROP COLUMN IF EXISTS architect_id,
  DROP COLUMN IF EXISTS sales_contact_id,
  DROP COLUMN IF EXISTS project_manager_id;

-- Optional: verify no lingering references
-- SELECT viewname, definition FROM pg_views WHERE definition ILIKE '%company_id%' OR definition ILIKE '%contact_id%' OR definition ILIKE '%architect_id%' OR definition ILIKE '%sales_contact_id%' OR definition ILIKE '%project_manager_id%';

COMMIT;

-- Rollback (commented):
-- BEGIN;
-- ALTER TABLE engagements ADD COLUMN company_id UUID NULL;
-- ALTER TABLE engagements ADD COLUMN contact_id UUID NULL;
-- ALTER TABLE engagements ADD COLUMN architect_id UUID NULL;
-- ALTER TABLE engagements ADD COLUMN sales_contact_id UUID NULL;
-- ALTER TABLE engagements ADD COLUMN project_manager_id UUID NULL;
-- -- Repopulate from engagement_parties (example for customer)
-- -- UPDATE engagements e SET company_id = ep.party_id FROM engagement_parties ep WHERE ep.engagement_id = e.id AND ep.role='customer' AND ep.is_primary;
-- COMMIT;
