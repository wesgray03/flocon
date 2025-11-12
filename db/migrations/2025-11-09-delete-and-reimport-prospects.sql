-- Quick fix: Delete all prospects and re-import with correct column mapping
-- This will fix the mixed-up probability/probability_percent data

-- Step 1: Delete all existing prospects (but keep their trades for reference)
DELETE FROM engagement_trades 
WHERE engagement_id IN (SELECT id FROM engagements WHERE type = 'prospect');

DELETE FROM engagements WHERE type = 'prospect';

-- Step 2: Now re-run your CSV import
-- Run: python generate-full-import.py > db/migrations/2025-11-09-reimport-prospects.sql
-- Then execute that SQL file in Supabase

-- Or if you want to keep it simple, just run:
-- python generate-full-import.py | psql YOUR_DATABASE_URL
