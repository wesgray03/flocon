-- Step 1: See what's currently in your project_dashboard view
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_dashboard'
AND column_name LIKE '%stage%'
ORDER BY ordinal_position;

-- Step 2: See sample data to understand what's duplicated
SELECT 
    id,
    project_name,
    stage,           -- Old concatenated field?
    stage_id,        -- UUID reference?
    stage_name,      -- Clean name?
    stage_order,     -- Numeric order?
    new_stage_id     -- Duplicate of stage_id?
FROM project_dashboard 
WHERE stage IS NOT NULL OR stage_id IS NOT NULL
LIMIT 3;

-- Step 3: Check what stages table looks like
SELECT id, name, "order" FROM stages ORDER BY "order" LIMIT 5;

-- Step 4: See the current view definition
SELECT pg_get_viewdef('project_dashboard', true);