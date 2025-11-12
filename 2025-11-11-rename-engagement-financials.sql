-- Rename engagement-scoped financial tables to engagement_* prefix (idempotent)

DO $$
BEGIN
  -- SOV lines
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sov_lines'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'engagement_sov_lines'
  ) THEN
    EXECUTE 'ALTER TABLE public.sov_lines RENAME TO engagement_sov_lines';
  END IF;

  -- SOV line progress
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sov_line_progress'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'engagement_sov_line_progress'
  ) THEN
    EXECUTE 'ALTER TABLE public.sov_line_progress RENAME TO engagement_sov_line_progress';
  END IF;

  -- Pay apps
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pay_apps'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'engagement_pay_apps'
  ) THEN
    EXECUTE 'ALTER TABLE public.pay_apps RENAME TO engagement_pay_apps';
  END IF;

  -- Change orders
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'change_orders'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'engagement_change_orders'
  ) THEN
    EXECUTE 'ALTER TABLE public.change_orders RENAME TO engagement_change_orders';
  END IF;
END $$;
