-- Migration: Create prospect promotion functions
-- Date: 2025-11-09
-- Purpose: Safe promotion of prospects to projects with validation and audit trail

BEGIN;

-- Function to promote a prospect to a project
-- Validates required fields, updates type, preserves history
CREATE OR REPLACE FUNCTION public.promote_prospect_to_project(
  p_engagement_id UUID,
  p_qbid TEXT DEFAULT NULL,
  p_contract_amount NUMERIC DEFAULT NULL,
  p_initial_stage_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Lock and validate the prospect exists
  SELECT 
    id, 
    type, 
    name, 
    customer_id,
    pipeline_status
  INTO v_record
  FROM public.engagements
  WHERE id = p_engagement_id
  FOR UPDATE;
  
  -- Validation checks
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Engagement not found: %', p_engagement_id;
  END IF;
  
  IF v_record.type <> 'prospect' THEN
    RAISE EXCEPTION 'Cannot promote: engagement is already a project';
  END IF;
  
  IF v_record.pipeline_status <> 'won' THEN
    RAISE WARNING 'Promoting prospect with status "%" (expected "won")', v_record.pipeline_status;
  END IF;
  
  IF v_record.customer_id IS NULL THEN
    RAISE EXCEPTION 'Cannot promote: customer_id is required for projects';
  END IF;
  
  -- Perform the promotion
  UPDATE public.engagements
  SET 
    type = 'project',
    pipeline_status = NULL,          -- Clear prospect fields
    probability = NULL,
    lead_source = NULL,
    qbid = p_qbid,                   -- Set QB ID if provided
    contract_amount = COALESCE(p_contract_amount, contract_amount, bid_amount),  -- Use provided or fallback to bid
    stage_id = p_initial_stage_id,   -- Set initial project stage
    converted_to_project_at = now(),
    converted_by_user_id = v_user_id,
    updated_at = now()
  WHERE id = p_engagement_id;
  
  -- Log the promotion (optional: create audit log entry)
  -- You can add this later if you want detailed audit trail
  
  RETURN p_engagement_id;
END;
$$;

-- Function to revert a project back to prospect (for mistakes/testing)
-- Use with caution in production
CREATE OR REPLACE FUNCTION public.revert_project_to_prospect(
  p_engagement_id UUID,
  p_pipeline_status pipeline_status DEFAULT 'qualified'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Lock and validate
  SELECT id, type INTO v_record
  FROM public.engagements
  WHERE id = p_engagement_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Engagement not found: %', p_engagement_id;
  END IF;
  
  IF v_record.type <> 'project' THEN
    RAISE EXCEPTION 'Cannot revert: engagement is already a prospect';
  END IF;
  
  -- Check for project-specific data that would be lost
  IF EXISTS (SELECT 1 FROM public.pay_apps WHERE project_id = p_engagement_id) THEN
    RAISE EXCEPTION 'Cannot revert: project has pay app records';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.change_orders WHERE project_id = p_engagement_id) THEN
    RAISE EXCEPTION 'Cannot revert: project has change orders';
  END IF;
  
  -- Perform the reversion
  UPDATE public.engagements
  SET 
    type = 'prospect',
    pipeline_status = p_pipeline_status,
    qbid = NULL,  -- Clear QB ID
    converted_to_project_at = NULL,
    converted_by_user_id = NULL,
    updated_at = now()
  WHERE id = p_engagement_id;
  
  RETURN p_engagement_id;
END;
$$;

-- Function to bulk update prospect probability based on pipeline status
-- Useful for automatic scoring
CREATE OR REPLACE FUNCTION public.update_prospect_probability_by_status()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.engagements
  SET 
    probability = CASE pipeline_status
      WHEN 'lead' THEN 10
      WHEN 'qualified' THEN 25
      WHEN 'proposal_prep' THEN 40
      WHEN 'proposal_sent' THEN 50
      WHEN 'negotiation' THEN 70
      WHEN 'verbal_commit' THEN 90
      WHEN 'won' THEN 100
      WHEN 'lost' THEN 0
      WHEN 'on_hold' THEN probability  -- Don't change if on hold
      ELSE probability
    END,
    updated_at = now()
  WHERE 
    type = 'prospect'
    AND (
      probability IS NULL 
      OR ABS(probability - CASE pipeline_status
        WHEN 'lead' THEN 10
        WHEN 'qualified' THEN 25
        WHEN 'proposal_prep' THEN 40
        WHEN 'proposal_sent' THEN 50
        WHEN 'negotiation' THEN 70
        WHEN 'verbal_commit' THEN 90
        WHEN 'won' THEN 100
        WHEN 'lost' THEN 0
        ELSE probability
      END) > 5  -- Only update if significantly different
    );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- Function to mark prospect as lost with reason
CREATE OR REPLACE FUNCTION public.mark_prospect_lost(
  p_engagement_id UUID,
  p_lost_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.engagements
  SET 
    pipeline_status = 'lost',
    probability = 0,
    lost_reason = p_lost_reason,
    updated_at = now()
  WHERE 
    id = p_engagement_id
    AND type = 'prospect';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect not found or already a project: %', p_engagement_id;
  END IF;
  
  RETURN p_engagement_id;
END;
$$;

COMMIT;

-- Usage examples:
--
-- Promote a prospect to project:
--   SELECT promote_prospect_to_project(
--     'prospect-uuid-here',
--     'QB12345',           -- QuickBooks ID
--     1500000.00,          -- Contract amount
--     'stage-uuid-here'    -- Initial stage (e.g., "Kickoff")
--   );
--
-- Mark a prospect as lost:
--   SELECT mark_prospect_lost('prospect-uuid-here', 'Lost to competitor - price');
--
-- Update probabilities based on status:
--   SELECT update_prospect_probability_by_status();
