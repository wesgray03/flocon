-- Migration: Change probability column from ENUM to TEXT
-- This allows us to use the actual CSV Pipeline Status values
-- (Landed, Probable, Questionable, Doubtful) instead of being restricted to enum values

-- Step 1: Change the column type from enum to TEXT
ALTER TABLE engagements 
ALTER COLUMN probability TYPE TEXT;

-- Step 2: Verify the change
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'engagements' AND column_name = 'probability';
