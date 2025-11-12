-- Migration: Fix promote_prospect_to_project function - remove non-existent columns
-- Date: 2025-11-11
-- Purpose: Update function to work with actual engagements schema (no customer_id, no pipeline_status)

-- Function to promote a prospect to a project
-- Simplified to only check type and update minimal fields
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
  v_engagement_type TEXT;
  v_user_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user exists in users table
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id)
  INTO v_user_exists;
  
  -- Lock and validate the prospect exists
  SELECT type
  INTO v_engagement_type
  FROM public.engagements
  WHERE id = p_engagement_id
  FOR UPDATE;
  
  -- Validation checks
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Engagement not found: %', p_engagement_id;
  END IF;
  
  IF v_engagement_type <> 'prospect' THEN
    RAISE EXCEPTION 'Cannot promote: engagement is already a project';
  END IF;
  
  -- Perform the promotion
  -- Only update fields that actually exist in the engagements table
  -- Keep prospect fields (probability_level_id, lead_source, lost_reason_id) for historical reference
  UPDATE public.engagements
  SET 
    type = 'project',
    contract_amount = COALESCE(p_contract_amount, contract_amount),
    stage_id = p_initial_stage_id,
    converted_to_project_at = now(),
    converted_by_user_id = CASE WHEN v_user_exists THEN v_user_id ELSE NULL END,
    updated_at = now()
  WHERE id = p_engagement_id;
  
  RETURN p_engagement_id;
END;
$$;

-- Function to revert a project back to prospect (for mistakes/testing)
CREATE OR REPLACE FUNCTION public.revert_project_to_prospect(
  p_engagement_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_type TEXT;
BEGIN
  -- Lock and validate
  SELECT type 
  INTO v_engagement_type
  FROM public.engagements
  WHERE id = p_engagement_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Engagement not found: %', p_engagement_id;
  END IF;
  
  IF v_engagement_type <> 'project' THEN
    RAISE EXCEPTION 'Cannot revert: engagement is not a project';
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
    contract_amount = NULL,
    project_number = NULL,
    converted_to_project_at = NULL,
    converted_by_user_id = NULL,
    updated_at = now()
  WHERE id = p_engagement_id;
  
  RETURN p_engagement_id;
END;
$$;
