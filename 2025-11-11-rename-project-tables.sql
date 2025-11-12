-- Rename legacy project_* tables/views to engagement_*
-- Safe to run multiple times: guards with IF EXISTS

DO $$
BEGIN
  -- Tables
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'project_comments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'engagement_comments'
  ) THEN
    EXECUTE 'ALTER TABLE public.project_comments RENAME TO engagement_comments';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'project_tasks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'engagement_tasks'
  ) THEN
    EXECUTE 'ALTER TABLE public.project_tasks RENAME TO engagement_tasks';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'project_task_completion'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'engagement_task_completion'
  ) THEN
    EXECUTE 'ALTER TABLE public.project_task_completion RENAME TO engagement_task_completion';
  END IF;

  -- Views
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'project_dashboard'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'engagement_dashboard'
  ) THEN
    EXECUTE 'ALTER VIEW public.project_dashboard RENAME TO engagement_dashboard';
  END IF;
END $$;
