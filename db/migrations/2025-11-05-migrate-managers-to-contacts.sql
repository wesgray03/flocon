-- Migration: Migrate managers table data to contacts as Project Managers
-- Date: 2025-11-05
-- Purpose: Consolidate managers (legacy) into contacts with contact_type='Project Manager'

BEGIN;

-- Insert managers as contacts with NULL customer_id (to be assigned later)
-- Generate a placeholder email if needed to avoid duplicates (best-effort)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'managers'
  ) THEN

    INSERT INTO contacts (customer_id, name, email, phone, contact_type)
    SELECT 
      NULL::uuid AS customer_id,
      m.name,
      LOWER(REPLACE(COALESCE(m.name,'unknown'), ' ', '.')) || '@contact.local' AS email,
      NULL::text AS phone,
      'Project Manager' AS contact_type
    FROM managers m
    WHERE COALESCE(m.name,'') <> ''
    ON CONFLICT DO NOTHING;

  END IF;
END $$;

COMMIT;
