-- Migration: Rename manager to owner and owner to sales in engagements table
-- This aligns the database column names with the UI terminology
-- Current: manager (contacts/Project Manager) -> New: owner
-- Current: owner (users/Owner) -> New: sales  

-- Current: pipeline_status -> New: probability
-- Current: probability (percentage) -> New: probability_percent

-- Note: We need to be careful with the order since we're swapping column names

-- Step 1: Rename probability to probability_percent first (no conflict)
ALTER TABLE engagements RENAME COLUMN probability TO probability_percent;
COMMENT ON COLUMN engagements.probability_percent IS 'Percentage probability of winning (0-100)';

-- Step 2: Rename pipeline_status to probability (no conflict)
ALTER TABLE engagements RENAME COLUMN pipeline_status TO probability;
COMMENT ON COLUMN engagements.probability IS 'Probability/status of winning the engagement (lead, qualified, proposal_sent, etc.)';

-- Step 3: Swap manager/owner columns using temporary names
-- First, rename owner to temp
ALTER TABLE engagements RENAME COLUMN owner TO sales_temp;

-- Then, rename manager to owner
ALTER TABLE engagements RENAME COLUMN manager TO owner;

-- Finally, rename temp to sales
ALTER TABLE engagements RENAME COLUMN sales_temp TO sales;

-- Add comments for clarity
COMMENT ON COLUMN engagements.owner IS 'Owner (from contacts, Project Manager type) - Primary contact managing the engagement';
COMMENT ON COLUMN engagements.sales IS 'Sales (from users, Owner type) - Sales person assigned to the engagement';
