-- Fix projects table: Update stage_id values that contain concatenated strings
-- This updates any stage_id that looks like a concatenated string to the proper UUID

-- First, let's see projects with problematic stage_id values (non-UUID format)
SELECT id, name, stage_id 
FROM projects 
WHERE stage_id IS NOT NULL 
  AND stage_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY name;

-- Update projects that have concatenated stage values to use proper stage_id
UPDATE projects 
SET stage_id = (
    SELECT s.id 
    FROM stages s 
    WHERE s.name = REGEXP_REPLACE(projects.stage_id, '^\d+\.\s*', '', 'g')
    LIMIT 1
)
WHERE stage_id IS NOT NULL 
  AND stage_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
      SELECT 1 FROM stages s 
      WHERE s.name = REGEXP_REPLACE(projects.stage_id, '^\d+\.\s*', '', 'g')
  );

-- Show the fixed results
SELECT p.id, p.name, p.stage_id, s.name as stage_name, s."order" as stage_order
FROM projects p
LEFT JOIN stages s ON p.stage_id = s.id
WHERE p.stage_id IS NOT NULL
ORDER BY p.name;