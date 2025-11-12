-- Change engagement_subcontractors.company_id FK to RESTRICT on delete

DO $$ BEGIN
  -- Drop existing FK if it exists (likely named by default)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'engagement_subcontractors_company_id_fkey'
  ) THEN
    ALTER TABLE public.engagement_subcontractors
      DROP CONSTRAINT engagement_subcontractors_company_id_fkey;
  END IF;
END $$;

-- Recreate FK with ON DELETE RESTRICT (prevent deleting companies in use)
ALTER TABLE public.engagement_subcontractors
  ADD CONSTRAINT engagement_subcontractors_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES public.companies(id)
  ON DELETE RESTRICT;
