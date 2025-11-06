-- Fix: Clean up stages table and ensure proper stage_id saving
-- Date: 2025-11-05
-- Purpose: Fix duplicate stages and ensure only stage_id is saved, not concatenated strings

-- STEP 1: First, let's see what's in your stages table
SELECT id, name, "order" FROM stages ORDER BY "order" NULLS LAST, name;

-- STEP 2: Clean up duplicate stages (keep the ones with proper order numbers)
-- Note: You may need to update any projects using the duplicate stage IDs first

-- Remove duplicates (keeping the ones with order numbers)
DELETE FROM stages 
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY name ORDER BY "order" NULLS LAST) as rn
        FROM stages
    ) t
    WHERE rn > 1
);

-- STEP 3: Ensure all remaining stages have proper order numbers
UPDATE stages 
SET "order" = 
    CASE 
        WHEN name = 'Contract Onboarding' THEN 1
        WHEN name = 'Product Submittals' THEN 3
        WHEN name = 'Material Procurement' THEN 4
        WHEN name = 'Installation Execution' THEN 6
        WHEN name = 'Punch List Execution' THEN 7
        WHEN name = 'Final Document Submission' THEN 8
        WHEN name = 'Final Payment Receipt' THEN 9
        WHEN name = 'Project Review' THEN 10
        WHEN name = 'Bonus Payment' THEN 11
        WHEN name = 'Project Closure' THEN 12
        ELSE "order"
    END
WHERE "order" IS NULL OR name IN (
    'Contract Onboarding', 'Product Submittals', 'Material Procurement', 
    'Installation Execution', 'Punch List Execution', 'Final Document Submission',
    'Final Payment Receipt', 'Project Review', 'Bonus Payment', 'Project Closure'
);

-- STEP 4: Verify clean stages
SELECT id, name, "order" FROM stages ORDER BY "order";