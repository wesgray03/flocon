-- Migration: Populate project_tasks table with seed data
-- Date: 2025-11-05
-- Purpose: Insert all stage tasks from the CSV import

-- FIRST: Run this query to see your exact stage names:
-- SELECT id, "order", name FROM stages ORDER BY "order";

-- Then uncomment and run the appropriate INSERT statements below based on your stage names

BEGIN;

-- 01. Contract Onboarding
INSERT INTO project_tasks (name, stage_id, order_num) 
SELECT name, stage_id, order_num FROM (VALUES
  ('Contract Draft Received', (SELECT id FROM stages WHERE "order" = 1), 1),
  ('Contract Reconciled (PM)', (SELECT id FROM stages WHERE "order" = 1), 2),
  ('Contract Signed (FUN)', (SELECT id FROM stages WHERE "order" = 1), 3),
  ('Contract Sent for Customer Signature', (SELECT id FROM stages WHERE "order" = 1), 4),
  ('Contract Returned and Executed', (SELECT id FROM stages WHERE "order" = 1), 5),
  ('GC Docs Completed', (SELECT id FROM stages WHERE "order" = 1), 6),
  ('Insurance on File', (SELECT id FROM stages WHERE "order" = 1), 7)
) AS t(name, stage_id, order_num);

-- 02. Project Setup
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Recap Created', (SELECT id FROM stages WHERE "order" = 2), 1),
  ('SOV Created', (SELECT id FROM stages WHERE "order" = 2), 2)
) AS t(name, stage_id, order_num);

-- 03. Product Submittal
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Samples Submitted', (SELECT id FROM stages WHERE "order" = 3), 1),
  ('Samples Approved', (SELECT id FROM stages WHERE "order" = 3), 2),
  ('Shop Drawing Submitted', (SELECT id FROM stages WHERE "order" = 3), 3),
  ('Shop Drawing Approved', (SELECT id FROM stages WHERE "order" = 3), 4),
  ('Submittal Literature Submitted', (SELECT id FROM stages WHERE "order" = 3), 5),
  ('Submital Literature Approved', (SELECT id FROM stages WHERE "order" = 3), 6)
) AS t(name, stage_id, order_num);

-- 04. Material Procurement
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Material Ordered', (SELECT id FROM stages WHERE "order" = 4), 1),
  ('Sundries Ordered', (SELECT id FROM stages WHERE "order" = 4), 2),
  ('Material Received', (SELECT id FROM stages WHERE "order" = 4), 3)
) AS t(name, stage_id, order_num);

-- 05. Installation Assignment
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Super Assigned', (SELECT id FROM stages WHERE "order" = 5), 1),
  ('Subcontractor Assigned', (SELECT id FROM stages WHERE "order" = 5), 2),
  ('Work Order Issued', (SELECT id FROM stages WHERE "order" = 5), 3)
) AS t(name, stage_id, order_num);

-- 06. Installation Execution
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Installation Started', (SELECT id FROM stages WHERE "order" = 6), 1),
  ('Installation Finished', (SELECT id FROM stages WHERE "order" = 6), 2)
) AS t(name, stage_id, order_num);

-- 07. Punch List Execution
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Punch List ReceIved', (SELECT id FROM stages WHERE "order" = 7), 1),
  ('Punch List Complete', (SELECT id FROM stages WHERE "order" = 7), 2)
) AS t(name, stage_id, order_num);

-- 08. Final Document Submission
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Final Billing Sent', (SELECT id FROM stages WHERE "order" = 8), 1),
  ('Warranty & Maintenance Sent', (SELECT id FROM stages WHERE "order" = 8), 2)
) AS t(name, stage_id, order_num);

-- 09. Final Payment Receipt
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Final Billing Received', (SELECT id FROM stages WHERE "order" = 9), 1),
  ('Final Lien Release Executed', (SELECT id FROM stages WHERE "order" = 9), 2)
) AS t(name, stage_id, order_num);

-- 10. Project Review
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('PM Review', (SELECT id FROM stages WHERE "order" = 10), 1),
  ('CFO Review', (SELECT id FROM stages WHERE "order" = 10), 2)
) AS t(name, stage_id, order_num);

-- 11. Bonus Payment
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Bonus Calculated', (SELECT id FROM stages WHERE "order" = 11), 1),
  ('Payment Scheduled', (SELECT id FROM stages WHERE "order" = 11), 2)
) AS t(name, stage_id, order_num);

-- 12. Project Closure
INSERT INTO project_tasks (name, stage_id, order_num)
SELECT name, stage_id, order_num FROM (VALUES
  ('Project Closed in QuickBooks', (SELECT id FROM stages WHERE "order" = 12), 1),
  ('Project Moved to Archive', (SELECT id FROM stages WHERE "order" = 12), 2)
) AS t(name, stage_id, order_num);

COMMIT;

-- Note: This migration uses the "order" column to match stages (1-12)
-- This is more reliable than matching by name which may have prefixes or formatting differences
