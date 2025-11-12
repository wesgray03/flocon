-- Migration: Create prospect_dashboard view for prospects page
-- Date: 2025-11-11
-- Purpose: Provide a consistent dashboard view pattern for prospects similar to project_dashboard
-- Background: Prospects page currently queries engagements directly. This view provides
-- pre-computed fields for customer, owner, architect, and financial summaries.

CREATE OR REPLACE VIEW prospect_dashboard AS
SELECT 
  e.id,
  e.name AS prospect_name,
  (SELECT c.name 
   FROM engagement_parties ep
   JOIN companies c ON ep.party_id = c.id
   WHERE ep.engagement_id = e.id 
   AND ep.party_type = 'company'
   AND ep.role = 'customer'
   AND ep.is_primary = true
   LIMIT 1) AS customer_name,
  (SELECT c.name 
   FROM engagement_parties ep
   JOIN contacts c ON ep.party_id = c.id
   WHERE ep.engagement_id = e.id 
   AND ep.party_type = 'contact'
   AND ep.role = 'prospect_contact'
   AND ep.is_primary = true
   LIMIT 1) AS contact_name,
  (SELECT u.name 
   FROM engagement_user_roles eur
   JOIN users u ON eur.user_id = u.id
   WHERE eur.engagement_id = e.id 
   AND eur.role IN ('sales_lead', 'project_lead')
   AND eur.is_primary = true
   ORDER BY CASE WHEN eur.role = 'sales_lead' THEN 1 ELSE 2 END
   LIMIT 1) AS owner_name,
  (SELECT c.name 
   FROM engagement_parties ep
   JOIN companies c ON ep.party_id = c.id
   WHERE ep.engagement_id = e.id 
   AND ep.party_type = 'company'
   AND ep.role = 'architect'
   AND ep.is_primary = true
   LIMIT 1) AS architect_name,
  e.bid_date,
  e.est_start_date,
  e.estimating_type,
  e.probability,
  e.probability_percent,
  e.stage_id,
  s.name AS stage_name,
  e.sharepoint_folder,
  -- Financial fields from trades
  COALESCE((SELECT SUM(estimated_amount) FROM engagement_trades WHERE engagement_id = e.id), 0) AS bid_amount,
  COALESCE((SELECT SUM(estimated_amount * (e.probability_percent / 100.0)) FROM engagement_trades WHERE engagement_id = e.id), 0) AS extended_amount,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN stages s ON s.id = e.stage_id
WHERE e.type = 'prospect';  -- Only include prospects, not projects

COMMENT ON VIEW prospect_dashboard IS 'Dashboard view for prospects (type=prospect) with computed parties, user roles, and financial summaries from trades. Projects are shown in project_dashboard view instead.';
