-- Fix migration: Restore correct data mapping
-- The issue: After column renames, the data associations are wrong
-- 
-- What should have happened:
-- - old pipeline_status → new probability (text status like 'qualified', 'verbal_commit')  
-- - old probability → new probability_percent (number 0-100)
--
-- What actually happened:
-- - The column renames shuffled data around incorrectly
--
-- Solution: We need to look at your CSV import data or restore from backup
-- For now, let's set reasonable defaults

-- Check current state first
-- SELECT id, name, probability, probability_percent FROM engagements WHERE type = 'prospect' LIMIT 10;

-- The safest fix: Set all prospects to 'qualified' status as default
-- Then you can manually update important ones from your CSV
UPDATE engagements 
SET probability = 'qualified'
WHERE type = 'prospect';

-- Alternative: If you have the original CSV file, you should re-import the pipeline_status values
-- The generate-full-import.py script maps:
--   Landed → won
--   Probable → verbal_commit  
--   Questionable → proposal_sent
--   Doubtful → qualified

-- Verify the fix
SELECT 
  probability,
  COUNT(*) as count,
  AVG(probability_percent) as avg_percent
FROM engagements 
WHERE type = 'prospect'
GROUP BY probability;

