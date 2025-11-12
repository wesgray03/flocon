-- Run this in Supabase SQL Editor to export current schema
-- Copy the results and save to CURRENT-SCHEMA.md for reference

-- List all tables and their columns
SELECT 
  t.table_name,
  string_agg(
    '  ' || c.column_name || ' ' || 
    c.data_type || 
    CASE 
      WHEN c.character_maximum_length IS NOT NULL 
      THEN '(' || c.character_maximum_length || ')'
      WHEN c.data_type = 'numeric' AND c.numeric_precision IS NOT NULL
      THEN '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
      ELSE ''
    END ||
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END,
    E',\n'
    ORDER BY c.ordinal_position
  ) as columns
FROM information_schema.tables t
JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;
