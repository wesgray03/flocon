-- Fix stages table: Remove duplicates and set proper order values
-- Run this via Supabase SQL editor or your database client

-- First, let's see what we have
SELECT id, name, "order"
FROM stages 
ORDER BY name;

-- Delete duplicate stages (keep one with lowest id for each name)
DELETE FROM stages s1 
WHERE EXISTS (
    SELECT 1 FROM stages s2 
    WHERE s2.name = s1.name 
    AND s2.id < s1.id
);

-- Update NULL order values based on standard stage progression
UPDATE stages SET "order" = 1 WHERE name = 'Project Setup' AND "order" IS NULL;
UPDATE stages SET "order" = 2 WHERE name = 'Contract Onboarding' AND "order" IS NULL;
UPDATE stages SET "order" = 3 WHERE name = 'Product Submittals' AND "order" IS NULL;
UPDATE stages SET "order" = 4 WHERE name = 'Material Procurement' AND "order" IS NULL;
UPDATE stages SET "order" = 5 WHERE name = 'Installation Execution' AND "order" IS NULL;
UPDATE stages SET "order" = 6 WHERE name = 'Punch List Execution' AND "order" IS NULL;
UPDATE stages SET "order" = 7 WHERE name = 'Project Review' AND "order" IS NULL;
UPDATE stages SET "order" = 8 WHERE name = 'Final Document Submission' AND "order" IS NULL;
UPDATE stages SET "order" = 9 WHERE name = 'Final Payment Receipt' AND "order" IS NULL;
UPDATE stages SET "order" = 10 WHERE name = 'Project Closure' AND "order" IS NULL;
UPDATE stages SET "order" = 11 WHERE name = 'Bonus Payment' AND "order" IS NULL;

-- Remove concatenated stages (that have format like "3. Product Submittals")
DELETE FROM stages WHERE name ~ '^\d+\.\s+';

-- Show the cleaned result
SELECT id, name, "order" 
FROM stages 
ORDER BY "order", name;