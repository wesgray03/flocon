-- Fix RLS policies for staging to allow public access
-- Run this in Supabase SQL Editor for staging database

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.contacts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.stages;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.managers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.owners;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.subcontractors;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.vendors;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.change_orders;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.pay_apps;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sov_lines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sov_line_progress;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.project_comments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.project_tasks;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.project_subcontractors;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.billings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.proposals;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.purchase_orders;

-- Create permissive policies that allow both authenticated AND anonymous access (for staging only!)
CREATE POLICY "Allow public access in staging" ON public.projects FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.contacts FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.stages FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.managers FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.owners FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.subcontractors FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.vendors FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.change_orders FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.pay_apps FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.sov_lines FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.sov_line_progress FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.project_comments FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.project_tasks FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.project_subcontractors FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.billings FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.proposals FOR ALL USING (true);
CREATE POLICY "Allow public access in staging" ON public.purchase_orders FOR ALL USING (true);