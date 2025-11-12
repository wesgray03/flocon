-- Migration: Update engagement_dashboard view to rename 'owner' column to 'project_lead'
-- Date: 2025-11-11
-- Purpose: Align dashboard view column name with database role terminology

-- Note: The engagement_dashboard view computes the 'owner' column from engagement_user_roles
-- where role='project_lead'. We need to rename this computed column.

-- Step 1: Drop existing view
DROP VIEW IF EXISTS engagement_dashboard CASCADE;

-- Step 2: Recreate view with project_lead column
-- This recreates the view with the same logic but renames the column from 'owner' to 'project_lead'
CREATE OR REPLACE VIEW engagement_dashboard AS
SELECT 
  e.id,
  e.project_number,
  e.name AS project_name,
  (SELECT c.name 
   FROM engagement_parties ep
   JOIN companies c ON ep.party_id = c.id
   WHERE ep.engagement_id = e.id 
   AND ep.party_type = 'company'
   AND ep.role = 'customer'
   AND ep.is_primary = true
   LIMIT 1) AS customer_name,
  (SELECT u.name 
   FROM engagement_user_roles eur
   JOIN users u ON eur.user_id = u.id
   WHERE eur.engagement_id = e.id 
   AND eur.role = 'project_lead'
   AND eur.is_primary = true
   LIMIT 1) AS project_lead,  -- Renamed from 'owner'
  (SELECT u.name 
   FROM engagement_user_roles eur
   JOIN users u ON eur.user_id = u.id
   WHERE eur.engagement_id = e.id 
   AND eur.role = 'superintendent'
   AND eur.is_primary = true
   LIMIT 1) AS superintendent,
  (SELECT u.name 
   FROM engagement_user_roles eur
   JOIN users u ON eur.user_id = u.id
   WHERE eur.engagement_id = e.id 
   AND eur.role = 'foreman'
   AND eur.is_primary = true
   LIMIT 1) AS foreman,
  e.start_date,
  e.end_date,
  e.bid_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  COALESCE(e.contract_amount, 0) AS contract_amt,
  COALESCE((SELECT SUM(amount) FROM engagement_change_orders WHERE engagement_id = e.id), 0) AS co_amt,
  COALESCE(e.contract_amount, 0) + COALESCE((SELECT SUM(amount) FROM engagement_change_orders WHERE engagement_id = e.id), 0) AS total_amt,
  COALESCE((SELECT SUM(amount) FROM engagement_pay_apps WHERE engagement_id = e.id), 0) AS billed_amt,
  COALESCE(e.contract_amount, 0) + COALESCE((SELECT SUM(amount) FROM engagement_change_orders WHERE engagement_id = e.id), 0) - COALESCE((SELECT SUM(amount) FROM engagement_pay_apps WHERE engagement_id = e.id), 0) AS balance,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN stages s ON s.id = e.stage_id;

-- Add comment
COMMENT ON VIEW engagement_dashboard IS 'Dashboard view for engagements with computed parties, user roles, and financial summaries. Column "project_lead" maps to engagement_user_roles.role=''project_lead''.';

