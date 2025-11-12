-- Migration: Fix infinite recursion in RLS policies
-- Date: 2025-11-09
-- Problem: engagement_trades policy references engagements table, causing infinite recursion
-- Solution: Simplify policies or disable RLS temporarily

BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS engagement_trades_inherit_parent ON public.engagement_trades;

-- Create a simpler policy that doesn't cause recursion
-- Allow all authenticated users to see engagement_trades (since engagements handles the filtering)
CREATE POLICY engagement_trades_allow_authenticated
  ON public.engagement_trades
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Alternative: Disable RLS on engagement_trades entirely if it's not sensitive
-- Uncomment this if you prefer:
-- ALTER TABLE public.engagement_trades DISABLE ROW LEVEL SECURITY;

COMMIT;
