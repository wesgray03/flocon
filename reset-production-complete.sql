-- COMPLETE PRODUCTION RESET
-- ⚠️ WARNING: THIS WILL DELETE ALL TABLES, VIEWS, AND DATA!
-- ⚠️ Make sure you have a backup before running this!

-- This drops everything so you can reimport fresh schema from staging

-- Step 1: Drop all views first (they depend on tables)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
    RAISE NOTICE 'Dropped view: %', r.viewname;
  END LOOP;
END $$;

-- Step 2: Drop all tables in public schema
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    RAISE NOTICE 'Dropped table: %', r.tablename;
  END LOOP;
  RAISE NOTICE '✅ All tables dropped!';
END $$;

-- Step 3: Verify everything is gone
SELECT 'Tables remaining:' as info, COUNT(*) as count 
FROM pg_tables 
WHERE schemaname = 'public';

SELECT 'Views remaining:' as info, COUNT(*) as count 
FROM pg_views 
WHERE schemaname = 'public';

-- If both counts are 0, you're ready to reimport schema! ✅
