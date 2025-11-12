-- Cleanup: Remove all imported prospects and their trades to start fresh

BEGIN;

-- Delete all engagement_trades for prospects
DELETE FROM engagement_trades 
WHERE engagement_id IN (
  SELECT id FROM engagements WHERE type = 'prospect'
);

-- Delete all prospects
DELETE FROM engagements 
WHERE type = 'prospect';

COMMIT;

-- Verify cleanup
SELECT COUNT(*) as remaining_prospects FROM engagements WHERE type = 'prospect';
SELECT COUNT(*) as remaining_prospect_trades FROM engagement_trades;
