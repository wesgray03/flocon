-- EXPORT STAGING SCHEMA TO PRODUCTION
-- Run this in STAGING database to get the complete schema

-- Export complete schema with all objects
-- Copy the output and run it in PRODUCTION

-- Get all table definitions
SELECT 
  'CREATE TABLE IF NOT EXISTS ' || tablename || E'\n' ||
  '(' || E'\n' ||
  string_agg(
    '  ' || column_name || ' ' || data_type ||
    CASE 
      WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
      WHEN numeric_precision IS NOT NULL THEN '(' || numeric_precision || ',' || numeric_scale || ')'
      ELSE ''
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
    ',' || E'\n'
  ) || E'\n' ||
  ');' || E'\n\n'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Get all indexes
SELECT 
  'CREATE INDEX IF NOT EXISTS ' || indexname || ' ON ' || tablename || 
  ' USING ' || indexdef || ';' || E'\n'
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Get all foreign keys
SELECT
  'ALTER TABLE ' || tc.table_name || 
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' FOREIGN KEY (' || kcu.column_name || ')' ||
  ' REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ')' ||
  CASE 
    WHEN rc.delete_rule = 'CASCADE' THEN ' ON DELETE CASCADE'
    WHEN rc.delete_rule = 'SET NULL' THEN ' ON DELETE SET NULL'
    WHEN rc.delete_rule = 'RESTRICT' THEN ' ON DELETE RESTRICT'
    ELSE ''
  END || ';' || E'\n'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Get all views
SELECT 
  'CREATE OR REPLACE VIEW ' || viewname || ' AS ' || E'\n' ||
  definition || E'\n\n'
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- Get RLS policies
SELECT
  'ALTER TABLE ' || tablename || ' ENABLE ROW LEVEL SECURITY;' || E'\n' ||
  'CREATE POLICY ' || policyname || ' ON ' || tablename || E'\n' ||
  '  FOR ' || cmd || E'\n' ||
  '  TO ' || roles || E'\n' ||
  '  USING (' || qual || ');' || E'\n\n'
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
