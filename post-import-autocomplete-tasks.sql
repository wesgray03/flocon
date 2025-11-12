-- Auto-complete tasks for engagements based on their current stage
-- Run this AFTER importing all data

-- This will create engagement_task_completion records for all tasks
-- up to and including the current stage of each engagement

-- NOTE: Production schema uses engagements.stage_id (not current_stage_id)
WITH stage_order AS (
  -- Get stage order numbers
  SELECT id, "order" as stage_order FROM stages
),
engagement_current_stage AS (
  -- Get each engagement's current stage order
  SELECT 
    e.id as engagement_id,
    e.stage_id as current_stage_id,
    so.stage_order as current_stage_order
  FROM engagements e
  JOIN stage_order so ON e.stage_id = so.id
  WHERE e.type = 'project' -- Only auto-complete for projects, not prospects
),
tasks_to_complete AS (
  -- Find all tasks for stages up to current stage
  SELECT 
    ecs.engagement_id,
    et.id as task_id,
    et.stage_id,
    so.stage_order
  FROM engagement_current_stage ecs
  JOIN engagement_tasks et ON true -- Get all tasks
  JOIN stage_order so ON et.stage_id = so.id
  WHERE so.stage_order < ecs.current_stage_order -- Tasks from previous stages
)
-- Insert task completion records
INSERT INTO engagement_task_completion (
  id,
  engagement_id,
  task_id,
  complete,
  completed_at,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  ttc.engagement_id,
  ttc.task_id,
  true as complete,
  NOW() as completed_at,
  NOW() as created_at
FROM tasks_to_complete ttc
WHERE NOT EXISTS (
  -- Don't create duplicates
  SELECT 1 FROM engagement_task_completion etc
  WHERE etc.engagement_id = ttc.engagement_id
    AND etc.task_id = ttc.task_id
);

-- Report what was done
SELECT 
  e.name as engagement_name,
  s.name as current_stage,
  COUNT(*) as tasks_completed
FROM engagement_task_completion etc
JOIN engagements e ON etc.engagement_id = e.id
JOIN stages s ON e.stage_id = s.id
WHERE etc.completed_at > NOW() - INTERVAL '1 minute' -- Just created
GROUP BY e.name, s.name
ORDER BY e.name;
