-- Migration: Fix promote_prospect_to_project function - remove customer_id validation
-- Date: 2025-11-11
-- Purpose: Update function to work without customer_id column (customers are now in engagement_parties)

BEGIN;

-- Function to promote a prospect to a project
-- Updated to remove customer_id validation since customers are stored in engagement_parties
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
  v_has_customer BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Lock and validate the prospect exists
  SELECT 
    id, 
    type, 
    name, 
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
  
  -- Check if engagement has a customer in engagement_parties
  SELECT EXISTS (
    SELECT 1 
    FROM public.engagement_parties 
    WHERE engagement_id = p_engagement_id 
      AND role = 'customer'
      AND is_primary = true
  ) INTO v_has_customer;
  
  IF NOT v_has_customer THEN
    RAISE EXCEPTION 'Cannot promote: customer is required for projects (add via engagement_parties)';
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

COMMIT;

-- Note: The revert_project_to_prospect function doesn't need changes as it doesn't check customer_id
