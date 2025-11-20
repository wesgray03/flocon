-- Backfill auto-comments for prospects already marked as lost
-- This creates a comment for each lost prospect that doesn't already have one

-- First, delete any existing auto-generated lost comments
DELETE FROM engagement_comments
WHERE comment_text LIKE '%Prospect was marked as lost%'
  OR comment_text LIKE '%Job was marked as lost%';

-- Preview what we'll be creating
SELECT 
  e.id,
  e.name,
  e.updated_at as lost_date,
  lr.reason as lost_reason
FROM engagements e
LEFT JOIN lost_reasons lr ON lr.id = e.lost_reason_id
WHERE e.type = 'prospect'
  AND e.active = false
  AND e.lost_reason_id IS NOT NULL
ORDER BY e.updated_at DESC;

-- Now insert the comments (after deleting old ones above, this will recreate them all)
INSERT INTO engagement_comments (engagement_id, user_id, comment_text, is_follow_up, created_at)
SELECT 
  e.id as engagement_id,
  (SELECT id FROM users WHERE name = 'Josh Gebhardt' LIMIT 1) as user_id,
  'Prospect was marked as lost on ' || 
    TO_CHAR(NOW() AT TIME ZONE 'America/Chicago', 'Mon DD, YYYY') || ' at ' ||
    TO_CHAR(NOW() AT TIME ZONE 'America/Chicago', 'HH12:MI AM') || 
    '. The lost reason is ' || 
    COALESCE(lr.reason, 'Unknown') || '.' as comment_text,
  true as is_follow_up,
  NOW() as created_at
FROM engagements e
LEFT JOIN lost_reasons lr ON lr.id = e.lost_reason_id
WHERE e.type = 'prospect'
  AND e.active = false
  AND e.lost_reason_id IS NOT NULL;

-- Update last_call for all lost prospects since the comment is marked as follow-up
UPDATE engagements
SET last_call = CURRENT_DATE
WHERE type = 'prospect'
  AND active = false
  AND lost_reason_id IS NOT NULL;

-- Verify the results
SELECT 
  COUNT(*) as total_lost_prospects,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM engagement_comments ec 
    WHERE ec.engagement_id = e.id 
    AND ec.comment_text LIKE 'Prospect was marked as lost%'
  ) THEN 1 END) as with_comments,
  COUNT(*) - COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM engagement_comments ec 
    WHERE ec.engagement_id = e.id 
    AND ec.comment_text LIKE 'Prospect was marked as lost%'
  ) THEN 1 END) as without_comments
FROM engagements e
WHERE e.type = 'prospect'
  AND e.active = false
  AND e.lost_reason_id IS NOT NULL;
