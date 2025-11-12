-- Migration: Create views for prospects and projects
-- Date: 2025-11-09
-- Purpose: Clean separation of concerns, simplified queries, QB sync

BEGIN;

-- View: Active prospects only
CREATE OR REPLACE VIEW public.v_prospects AS
SELECT 
  e.id,
  e.name,
  e.customer_id,
  c.name AS customer_name,
  e.address,
  e.city,
  e.state,
  e.manager,
  e.owner,
  e.sales_contact_id,
  sc.name AS sales_contact_name,
  sc.email AS sales_contact_email,
  sc.phone AS sales_contact_phone,
  e.pipeline_status,
  e.probability,
  e.expected_close_date,
  e.lead_source,
  e.bid_amount,
  e.est_start_date,
  e.lost_reason,
  e.scope_summary,
  e.notes,
  e.created_at,
  e.updated_at,
  -- Aggregated trade info
  (SELECT COUNT(*) FROM public.engagement_trades et WHERE et.engagement_id = e.id) AS trade_count,
  (SELECT SUM(et.estimated_amount) FROM public.engagement_trades et WHERE et.engagement_id = e.id) AS total_estimated
FROM public.engagements e
LEFT JOIN public.customers c ON c.id = e.customer_id
LEFT JOIN public.contacts sc ON sc.id = e.sales_contact_id
WHERE e.type = 'prospect'
ORDER BY 
  CASE e.pipeline_status
    WHEN 'verbal_commit' THEN 1
    WHEN 'negotiation' THEN 2
    WHEN 'proposal_sent' THEN 3
    WHEN 'proposal_prep' THEN 4
    WHEN 'qualified' THEN 5
    WHEN 'lead' THEN 6
    WHEN 'on_hold' THEN 7
    WHEN 'lost' THEN 8
  END,
  e.expected_close_date NULLS LAST,
  e.updated_at DESC;

-- View: Active projects (existing projects table functionality)
CREATE OR REPLACE VIEW public.v_projects AS
SELECT 
  e.id,
  e.qbid,
  e.project_number,
  e.name,
  e.customer_id,
  c.name AS customer_name,
  e.address,
  e.city,
  e.state,
  e.manager,
  e.owner,
  e.stage_id,
  s.name AS stage_name,
  e.contract_amount,
  e.bid_amount,
  e.start_date,
  e.end_date,
  e.est_start_date,
  e.sharepoint_folder,
  e.scope_summary,
  e.notes,
  e.converted_to_project_at,
  e.converted_by_user_id,
  u.name AS converted_by_name,
  e.created_at,
  e.updated_at,
  -- Aggregated trade info
  (SELECT COUNT(*) FROM public.engagement_trades et WHERE et.engagement_id = e.id) AS trade_count,
  (SELECT SUM(et.estimated_amount) FROM public.engagement_trades et WHERE et.engagement_id = e.id) AS total_estimated,
  (SELECT SUM(et.actual_cost) FROM public.engagement_trades et WHERE et.engagement_id = e.id) AS total_actual_cost
FROM public.engagements e
LEFT JOIN public.customers c ON c.id = e.customer_id
LEFT JOIN public.stages s ON s.id = e.stage_id
LEFT JOIN public.users u ON u.id = e.converted_by_user_id
WHERE e.type = 'project'
ORDER BY e.updated_at DESC;

-- View: Projects ready for QuickBooks sync (has QB ID)
CREATE OR REPLACE VIEW public.v_projects_for_qbo AS
SELECT 
  id,
  qbid,
  project_number,
  name,
  customer_id,
  contract_amount,
  start_date,
  end_date,
  stage_id,
  manager,
  owner,
  updated_at
FROM public.engagements
WHERE 
  type = 'project' 
  AND qbid IS NOT NULL
ORDER BY updated_at DESC;

-- View: Hot prospects (high probability, closing soon)
CREATE OR REPLACE VIEW public.v_hot_prospects AS
SELECT 
  e.id,
  e.name,
  c.name AS customer_name,
  e.pipeline_status,
  e.probability,
  e.expected_close_date,
  e.bid_amount,
  e.manager,
  e.owner,
  sc.name AS sales_contact_name,
  sc.phone AS sales_contact_phone,
  COALESCE(e.expected_close_date, CURRENT_DATE + INTERVAL '30 days') - CURRENT_DATE AS days_until_close,
  (SELECT SUM(et.estimated_amount) FROM public.engagement_trades et WHERE et.engagement_id = e.id) AS total_estimated
FROM public.engagements e
LEFT JOIN public.customers c ON c.id = e.customer_id
LEFT JOIN public.contacts sc ON sc.id = e.sales_contact_id
WHERE 
  e.type = 'prospect'
  AND e.pipeline_status NOT IN ('lost', 'on_hold')
  AND (
    e.probability >= 70
    OR e.pipeline_status IN ('verbal_commit', 'negotiation')
    OR e.expected_close_date <= CURRENT_DATE + INTERVAL '30 days'
  )
ORDER BY 
  e.probability DESC NULLS LAST,
  e.expected_close_date NULLS LAST;

-- View: Pipeline summary (for dashboard/reporting)
CREATE OR REPLACE VIEW public.v_pipeline_summary AS
SELECT 
  pipeline_status,
  COUNT(*) AS prospect_count,
  SUM(bid_amount) AS total_bid_amount,
  AVG(probability) AS avg_probability,
  SUM(bid_amount * probability / 100.0) AS weighted_value
FROM public.engagements
WHERE 
  type = 'prospect'
  AND pipeline_status NOT IN ('lost', 'won')
GROUP BY pipeline_status
ORDER BY 
  CASE pipeline_status
    WHEN 'verbal_commit' THEN 1
    WHEN 'negotiation' THEN 2
    WHEN 'proposal_sent' THEN 3
    WHEN 'proposal_prep' THEN 4
    WHEN 'qualified' THEN 5
    WHEN 'lead' THEN 6
    WHEN 'on_hold' THEN 7
  END;

-- View: Lost opportunities (for analysis)
CREATE OR REPLACE VIEW public.v_lost_prospects AS
SELECT 
  e.id,
  e.name,
  c.name AS customer_name,
  e.bid_amount,
  e.lost_reason,
  e.lead_source,
  e.manager,
  e.owner,
  e.updated_at AS lost_date,
  (SELECT SUM(et.estimated_amount) FROM public.engagement_trades et WHERE et.engagement_id = e.id) AS total_estimated
FROM public.engagements e
LEFT JOIN public.customers c ON c.id = e.customer_id
WHERE 
  e.type = 'prospect'
  AND e.pipeline_status = 'lost'
ORDER BY e.updated_at DESC;

COMMIT;

-- Usage examples:
--
-- Get all active prospects:
--   SELECT * FROM v_prospects;
--
-- Get all projects:
--   SELECT * FROM v_projects;
--
-- Get hot prospects for weekly sales meeting:
--   SELECT * FROM v_hot_prospects;
--
-- Pipeline health check:
--   SELECT * FROM v_pipeline_summary;
--
-- QuickBooks sync query:
--   SELECT * FROM v_projects_for_qbo WHERE updated_at > '2025-11-01';
