-- Add ON DELETE CASCADE to all foreign keys referencing engagements so a project/prospect
-- can be deleted without manual cleanup. Idempotent: drops and recreates constraints.
-- Run in production after review.

DO $$
DECLARE
  stmt text;
BEGIN
  -- engagement_parties
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='engagement_parties' AND constraint_name='engagement_parties_engagement_id_fkey'
  ) THEN
    ALTER TABLE public.engagement_parties DROP CONSTRAINT engagement_parties_engagement_id_fkey;
  END IF;
  ALTER TABLE public.engagement_parties
    ADD CONSTRAINT engagement_parties_engagement_id_fkey
    FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;

  -- engagement_user_roles
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='engagement_user_roles' AND constraint_name='engagement_user_roles_engagement_id_fkey'
  ) THEN
    ALTER TABLE public.engagement_user_roles DROP CONSTRAINT engagement_user_roles_engagement_id_fkey;
  END IF;
  ALTER TABLE public.engagement_user_roles
    ADD CONSTRAINT engagement_user_roles_engagement_id_fkey
    FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;

  -- engagement_subcontractors
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='engagement_subcontractors' AND constraint_name='engagement_subcontractors_engagement_id_fkey'
  ) THEN
    ALTER TABLE public.engagement_subcontractors DROP CONSTRAINT engagement_subcontractors_engagement_id_fkey;
  END IF;
  ALTER TABLE public.engagement_subcontractors
    ADD CONSTRAINT engagement_subcontractors_engagement_id_fkey
    FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;

  -- engagement_task_completion
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='engagement_task_completion' AND constraint_name='project_task_completion_engagement_id_fkey'
  ) THEN
    ALTER TABLE public.engagement_task_completion DROP CONSTRAINT project_task_completion_engagement_id_fkey;
  END IF;
  ALTER TABLE public.engagement_task_completion
    ADD CONSTRAINT project_task_completion_engagement_id_fkey
    FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;

  -- engagement_comments
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='engagement_comments' AND constraint_name='project_comments_engagement_id_fkey'
  ) THEN
    ALTER TABLE public.engagement_comments DROP CONSTRAINT project_comments_engagement_id_fkey;
  END IF;
  -- Some environments may have engagement_comments referencing engagements via a different name; ensure clean add.
  BEGIN
    ALTER TABLE public.engagement_comments
      ADD CONSTRAINT project_comments_engagement_id_fkey
      FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
    -- Ignore if already exists with cascade
  END;

  -- engagement_change_orders
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='engagement_change_orders' AND constraint_name='change_orders_engagement_id_fkey'
  ) THEN
    ALTER TABLE public.engagement_change_orders DROP CONSTRAINT change_orders_engagement_id_fkey;
  END IF;
  ALTER TABLE public.engagement_change_orders
    ADD CONSTRAINT change_orders_engagement_id_fkey
    FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;

  -- engagement_trades (may already be CASCADE in creation)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='engagement_trades' AND constraint_name='engagement_trades_engagement_id_fkey'
  ) THEN
    -- Recreate to ensure cascade
    ALTER TABLE public.engagement_trades DROP CONSTRAINT engagement_trades_engagement_id_fkey;
    ALTER TABLE public.engagement_trades
      ADD CONSTRAINT engagement_trades_engagement_id_fkey
      FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;
  END IF;

  -- Financial tables
  -- engagement_sov_lines
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='engagement_sov_lines' AND column_name='engagement_id'
  ) THEN
    -- Drop any existing unnamed FK by searching pg_constraint
    FOR stmt IN
      SELECT 'ALTER TABLE public.engagement_sov_lines DROP CONSTRAINT ' || c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname='engagement_sov_lines' AND c.confrelid = 'public.engagements'::regclass
    LOOP
      EXECUTE stmt;
    END LOOP;
    ALTER TABLE public.engagement_sov_lines
      ADD CONSTRAINT engagement_sov_lines_engagement_id_fkey
      FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;
  END IF;

  -- engagement_sov_line_progress
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='engagement_sov_line_progress' AND column_name='engagement_id'
  ) THEN
    FOR stmt IN
      SELECT 'ALTER TABLE public.engagement_sov_line_progress DROP CONSTRAINT ' || c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname='engagement_sov_line_progress' AND c.confrelid = 'public.engagements'::regclass
    LOOP
      EXECUTE stmt;
    END LOOP;
    ALTER TABLE public.engagement_sov_line_progress
      ADD CONSTRAINT engagement_sov_line_progress_engagement_id_fkey
      FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;
  END IF;

  -- engagement_pay_apps
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='engagement_pay_apps' AND column_name='engagement_id'
  ) THEN
    FOR stmt IN
      SELECT 'ALTER TABLE public.engagement_pay_apps DROP CONSTRAINT ' || c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname='engagement_pay_apps' AND c.confrelid = 'public.engagements'::regclass
    LOOP
      EXECUTE stmt;
    END LOOP;
    ALTER TABLE public.engagement_pay_apps
      ADD CONSTRAINT engagement_pay_apps_engagement_id_fkey
      FOREIGN KEY (engagement_id) REFERENCES public.engagements(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Verification query (optional):
-- SELECT tc.table_name, kcu.column_name, rc.update_rule, rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'engagement_id';
