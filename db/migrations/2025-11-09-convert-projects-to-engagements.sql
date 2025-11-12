-- Migration: Convert projects table to engagements (supports both prospects and projects)
-- Date: 2025-11-09
-- Purpose: Unified table for prospects (no contract) and projects (contracted)
-- Strategy: Single table with type flag - preserves history when promoting prospect→project

BEGIN;

-- 1) Create engagement type enum (skip if exists)
DO $$ BEGIN
  CREATE TYPE public.engagement_type AS ENUM ('prospect', 'project');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) Create prospect-specific enums (skip if exists)
DO $$ BEGIN
  CREATE TYPE public.pipeline_status AS ENUM (
    'lead',              -- Initial contact/inquiry
    'qualified',         -- Qualified lead, worth pursuing
    'proposal_prep',     -- Preparing proposal/estimate
    'proposal_sent',     -- Proposal submitted, awaiting response
    'negotiation',       -- In negotiations
    'verbal_commit',     -- Verbal agreement received
    'won',              -- Contract signed (ready to convert to project)
    'lost',             -- Did not win the bid
    'on_hold'           -- Paused/delayed by customer
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_source AS ENUM (
    'referral',
    'website',
    'repeat_customer',
    'trade_show',
    'cold_call',
    'architect',
    'gc_relationship',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3) Rename projects table to engagements (skip if already renamed)
DO $$ BEGIN
  ALTER TABLE public.projects RENAME TO engagements;
EXCEPTION
  WHEN undefined_table THEN null;  -- Already renamed
  WHEN others THEN null;
END $$;

-- 4) Add new columns for engagement system
ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS type engagement_type NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS pipeline_status pipeline_status NULL,  -- NULL for projects, required for prospects
  ADD COLUMN IF NOT EXISTS probability INTEGER NULL CHECK (probability >= 0 AND probability <= 100),  -- % chance of winning
  ADD COLUMN IF NOT EXISTS expected_close_date DATE NULL,  -- When we expect to win/lose
  ADD COLUMN IF NOT EXISTS lead_source lead_source NULL,
  ADD COLUMN IF NOT EXISTS sales_contact_id UUID NULL REFERENCES public.contacts(id),  -- Main contact (PM, estimator, etc.)
  ADD COLUMN IF NOT EXISTS est_start_date DATE NULL,  -- Estimated/planned start (may differ from actual start_date)
  ADD COLUMN IF NOT EXISTS lost_reason TEXT NULL,  -- Why we lost the bid
  ADD COLUMN IF NOT EXISTS converted_to_project_at TIMESTAMPTZ NULL,  -- When prospect became project
  ADD COLUMN IF NOT EXISTS converted_by_user_id UUID NULL REFERENCES public.users(id),  -- Who promoted it
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL DEFAULT now();  -- Track last update

-- Create trigger to auto-update updated_at (skip if exists)
DROP TRIGGER IF EXISTS trigger_update_engagements_updated_at ON public.engagements;

CREATE OR REPLACE FUNCTION update_engagements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_engagements_updated_at
BEFORE UPDATE ON public.engagements
FOR EACH ROW
EXECUTE FUNCTION update_engagements_updated_at();

-- 5) Update existing records to be projects (since they're from old projects table)
UPDATE public.engagements SET type = 'project' WHERE type IS NULL;

-- 6) Rename foreign key references (if they exist)
-- Note: This renames the constraint to reflect new table name
DO $$
BEGIN
  -- Rename FK from project_comments
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_comments_project_id_fkey') THEN
    ALTER TABLE public.project_comments 
      RENAME CONSTRAINT project_comments_project_id_fkey TO project_comments_engagement_id_fkey;
  END IF;
  
  -- Rename FK from project_tasks
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_tasks_project_id_fkey') THEN
    ALTER TABLE public.project_tasks 
      RENAME CONSTRAINT project_tasks_project_id_fkey TO project_tasks_engagement_id_fkey;
  END IF;
  
  -- Rename FK from project_task_completion
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_task_completion_project_id_fkey') THEN
    ALTER TABLE public.project_task_completion 
      RENAME CONSTRAINT project_task_completion_project_id_fkey TO project_task_completion_engagement_id_fkey;
  END IF;
  
  -- Rename FK from proposals
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'proposals_project_id_fkey') THEN
    ALTER TABLE public.proposals 
      RENAME CONSTRAINT proposals_project_id_fkey TO proposals_engagement_id_fkey;
  END IF;
  
  -- Rename FK from purchase_orders
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'purchase_orders_project_id_fkey') THEN
    ALTER TABLE public.purchase_orders 
      RENAME CONSTRAINT purchase_orders_project_id_fkey TO purchase_orders_engagement_id_fkey;
  END IF;
  
  -- Rename FK from pay_apps
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pay_apps_project_id_fkey') THEN
    ALTER TABLE public.pay_apps 
      RENAME CONSTRAINT pay_apps_project_id_fkey TO pay_apps_engagement_id_fkey;
  END IF;
  
  -- Rename FK from change_orders
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'change_orders_project_id_fkey') THEN
    ALTER TABLE public.change_orders 
      RENAME CONSTRAINT change_orders_project_id_fkey TO change_orders_engagement_id_fkey;
  END IF;
END $$;

-- 7) Optionally rename project_id columns to engagement_id for clarity
-- Uncomment these if you want full consistency (recommended for long-term maintainability)
-- ALTER TABLE public.project_comments RENAME COLUMN project_id TO engagement_id;
-- ALTER TABLE public.project_tasks RENAME COLUMN project_id TO engagement_id;
-- ALTER TABLE public.project_task_completion RENAME COLUMN project_id TO engagement_id;
-- ALTER TABLE public.proposals RENAME COLUMN project_id TO engagement_id;
-- ALTER TABLE public.purchase_orders RENAME COLUMN project_id TO engagement_id;
-- ALTER TABLE public.pay_apps RENAME COLUMN project_id TO engagement_id;
-- ALTER TABLE public.change_orders RENAME COLUMN project_id TO engagement_id;

-- 8) Create indexes for new columns (skip if exists)
CREATE INDEX IF NOT EXISTS idx_engagements_type ON public.engagements(type);
CREATE INDEX IF NOT EXISTS idx_engagements_pipeline_status ON public.engagements(pipeline_status) WHERE pipeline_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_engagements_expected_close ON public.engagements(expected_close_date) WHERE expected_close_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_engagements_sales_contact ON public.engagements(sales_contact_id);
CREATE INDEX IF NOT EXISTS idx_engagements_probability ON public.engagements(probability) WHERE probability IS NOT NULL;

-- 9) Add constraint: prospects must have pipeline_status, projects cannot have it
DO $$ BEGIN
  ALTER TABLE public.engagements
    ADD CONSTRAINT chk_prospect_has_pipeline_status 
      CHECK (
        (type = 'prospect' AND pipeline_status IS NOT NULL) OR 
        (type = 'project' AND pipeline_status IS NULL)
      );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 10) Add constraint: projects should not have probability or lead_source (they're historical at that point)
DO $$ BEGIN
  ALTER TABLE public.engagements
    ADD CONSTRAINT chk_project_no_prospect_fields
      CHECK (
        (type = 'prospect') OR 
        (type = 'project' AND probability IS NULL AND lead_source IS NULL)
      );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 11) Add constraint: only projects can have qbid (prospects aren't in QuickBooks yet)
DO $$ BEGIN
  ALTER TABLE public.engagements
    ADD CONSTRAINT chk_no_qbid_on_prospects
      CHECK (
        (type = 'prospect' AND qbid IS NULL) OR 
        (type = 'project')
      );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMIT;

-- Post-migration notes:
-- - All existing records are marked as 'project' type
-- - To add prospects, insert with type='prospect' and required pipeline_status
-- - Use promote_prospect_to_project() function (next migration) to convert
-- - Consider creating views: v_projects and v_prospects for clean UI separation
