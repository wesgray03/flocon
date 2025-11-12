-- Migration: Allow historical prospect fields on converted projects
-- Date: 2025-11-10
-- Purpose: Keep probability and lead_source data when converting prospect to project
--          These fields are hidden in the UI for projects but preserved for historical reference

BEGIN;

-- Drop the constraint that prevents projects from having probability/lead_source
ALTER TABLE public.engagements
  DROP CONSTRAINT IF EXISTS chk_project_no_prospect_fields;

-- Drop the constraint that requires probability (formerly pipeline_status) for prospects
-- and recreate it to allow projects to keep the value as historical data
ALTER TABLE public.engagements
  DROP CONSTRAINT IF EXISTS chk_prospect_has_pipeline_status;

-- Add a new constraint that only requires probability for prospects
-- (Projects can have it as historical data, but it's not required)
ALTER TABLE public.engagements
  ADD CONSTRAINT chk_prospect_has_pipeline_status 
    CHECK (
      (type = 'prospect' AND probability IS NOT NULL) OR 
      (type = 'project')
    );

-- Add comments explaining that these fields are historical for projects
COMMENT ON COLUMN public.engagements.probability IS 
  'Required for prospects (Doubtful, Possible, Probable, Definite). Preserved as historical data when converted to project.';

COMMENT ON COLUMN public.engagements.probability_percent IS 
  'Calculated percentage from probability level. Preserved as historical data when converted to project.';

COMMENT ON COLUMN public.engagements.lead_source IS 
  'How the prospect was generated. Preserved as historical data when converted to project.';

COMMIT;
