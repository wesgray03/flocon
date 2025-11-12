-- Migration: Fix converted_by_user_id not being set
-- Date: 2025-11-12
-- Purpose: Ensure converted_by_user_id is always set when user is authenticated

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
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
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
  UPDATE public.engagements
  SET 
    type = 'project',
    probability = NULL,
    probability_percent = NULL,
    lead_source = NULL,
    expected_close_date = NULL,
    lost_reason = NULL,
    contract_amount = COALESCE(p_contract_amount, contract_amount, bid_amount),
    stage_id = p_initial_stage_id,
    converted_to_project_at = now(),
    converted_by_user_id = v_user_id,  -- Always set if authenticated
    updated_at = now()
  WHERE id = p_engagement_id;
  
  RETURN p_engagement_id;
END;
$$;

COMMENT ON FUNCTION public.promote_prospect_to_project IS 'Promotes a prospect to project. Sets converted_by_user_id to authenticated user (auth.uid()).';
