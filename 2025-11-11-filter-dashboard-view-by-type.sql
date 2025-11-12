-- Migration: Rename engagement_dashboard back to project_dashboard and filter for projects only
-- Date: 2025-11-11
-- Purpose: Restore semantic naming - project_dashboard for projects, prospect_dashboard for prospects
-- Background: When we renamed the view from project_dashboard to engagement_dashboard,
-- we accidentally removed the type filter, causing prospects to appear on projects page.
-- This migration restores the original name and adds the type filter.

DROP VIEW IF EXISTS engagement_dashboard CASCADE;

CREATE OR REPLACE VIEW project_dashboard AS
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
   LIMIT 1) AS project_lead,
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
LEFT JOIN stages s ON s.id = e.stage_id
WHERE e.type = 'project';  -- Only include projects, not prospects

COMMENT ON VIEW project_dashboard IS 'Dashboard view for projects (type=project) with computed parties, user roles, and financial summaries. Prospects are shown in prospect_dashboard view instead.';
