-- Helper function to execute raw SQL from Node.js migration scripts
-- Run this ONCE in Supabase SQL Editor before running migrations

-- Drop existing function if it exists (safe to run multiple times)
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Create the exec_sql function
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'SQL execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Test it
SELECT exec_sql('SELECT 1');
