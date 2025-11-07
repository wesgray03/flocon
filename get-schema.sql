-- Run this query in Production Supabase SQL Editor to get complete schema
-- Copy the output and run it in Staging

-- Get all table creation statements
SELECT 
    'CREATE TABLE public.' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' AND character_maximum_length IS NOT NULL 
            THEN 'varchar(' || character_maximum_length || ')'
            WHEN data_type = 'character' AND character_maximum_length IS NOT NULL 
            THEN 'char(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL
            THEN 'numeric(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN data_type = 'USER-DEFINED' AND udt_name IS NOT NULL
            THEN udt_name
            ELSE data_type
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END ||
        CASE 
            WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ', '
    ) || ');' AS create_statement
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE 'sql_%'
GROUP BY table_name
ORDER BY table_name;