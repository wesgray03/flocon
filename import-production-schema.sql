-- PRODUCTION SCHEMA IMPORT
-- Exported from Staging - Ready to run in Production
-- Run this after dropping all tables with reset-production-complete.sql

-- Step 1: Create ENUM types first
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_type') THEN
    CREATE TYPE party_type AS ENUM ('gc', 'architect', 'owner', 'vendor', 'subcontractor');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engagement_type') THEN
    CREATE TYPE engagement_type AS ENUM ('project', 'prospect');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
    CREATE TYPE lead_source AS ENUM ('Referral', 'Website', 'Cold Call', 'Trade Show', 'Repeat Customer', 'Other');
  END IF;
END $$;

-- Step 2: Create base tables (no foreign keys yet)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL,
  user_type character varying NOT NULL CHECK (user_type::text = ANY (ARRAY['Admin'::character varying, 'Office'::character varying, 'Field'::character varying]::text[])),
  auth_user_id uuid UNIQUE,
  can_manage_prospects boolean DEFAULT false,
  can_manage_projects boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "order" smallint,
  CONSTRAINT stages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_type text NOT NULL DEFAULT 'Contractor'::text CHECK (company_type = ANY (ARRAY['Contractor'::text, 'Architect'::text, 'Owner'::text, 'Vendor'::text, 'Subcontractor'::text])),
  party_type party_type NOT NULL DEFAULT 'gc'::party_type,
  is_customer boolean NOT NULL DEFAULT true,
  is_vendor boolean NOT NULL DEFAULT false,
  is_subcontractor boolean NOT NULL DEFAULT false,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  contact_type character varying NOT NULL CHECK (contact_type::text = ANY (ARRAY['Project Manager'::character varying, 'Superintendent'::character varying, 'Estimator'::character varying, 'Accounting'::character varying, 'Owner'::character varying, 'Architect'::character varying, 'Sales'::character varying, 'Other'::character varying]::text[])),
  email text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type engagement_type NOT NULL DEFAULT 'project'::engagement_type,
  project_number text,
  address text,
  city text,
  state text,
  bid_amount numeric,
  contract_amount numeric,
  start_date date,
  end_date date,
  est_start_date date,
  stage_id uuid,
  probability text,
  probability_percent integer CHECK (probability_percent >= 0 AND probability_percent <= 100),
  expected_close_date date,
  lead_source lead_source,
  estimating_type text DEFAULT 'Budget'::text CHECK (estimating_type = ANY (ARRAY['Budget'::text, 'Construction'::text])),
  bid_date date,
  lost_reason text,
  converted_to_project_at timestamp with time zone,
  converted_by_user_id uuid,
  sharepoint_folder text,
  created_from_excel boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT engagements_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_parties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL,
  party_type text NOT NULL CHECK (party_type = ANY (ARRAY['contact'::text, 'company'::text])),
  party_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['customer'::text, 'architect'::text, 'general_contractor'::text, 'project_manager'::text, 'prospect_contact'::text, 'superintendent'::text, 'foreman'::text, 'estimator'::text, 'owner'::text, 'sales_contact'::text, 'subcontractor'::text, 'other'::text])),
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT engagement_parties_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['sales_lead'::text, 'project_lead'::text, 'foreman'::text, 'estimator'::text, 'project_admin'::text, 'observer'::text])),
  is_primary boolean DEFAULT false,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT engagement_user_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_subcontractors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL,
  company_id uuid NOT NULL,
  work_order_number text,
  assigned_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT engagement_subcontractors_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stage_id uuid NOT NULL,
  order_num integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT engagement_tasks_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_task_completion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL,
  task_id uuid NOT NULL,
  complete boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT engagement_task_completion_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT engagement_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_change_orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  engagement_id uuid NOT NULL,
  customer_co_number text,
  description text NOT NULL DEFAULT ''::text,
  amount numeric NOT NULL DEFAULT 0,
  budget_amount numeric DEFAULT 0,
  current_status text NOT NULL DEFAULT 'Open'::text CHECK (current_status = ANY (ARRAY['Open'::text, 'Authorized'::text, 'Issued'::text, 'Closed'::text])),
  date_requested timestamp with time zone DEFAULT now(),
  date_authorized timestamp with time zone,
  date_issued timestamp with time zone,
  notes text,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT engagement_change_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_pay_apps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL,
  pay_app_number text,
  description text NOT NULL,
  amount numeric DEFAULT 0.00,
  period_start date,
  period_end date,
  date_submitted date,
  date_paid date,
  status text,
  previous_payments numeric DEFAULT 0.00,
  current_payment_due numeric DEFAULT 0.00,
  balance_to_finish numeric DEFAULT 0.00,
  total_earned_less_retainage numeric DEFAULT 0.00,
  total_retainage numeric DEFAULT 0.00,
  retainage_stored_materials numeric DEFAULT 0.00,
  retainage_completed_work numeric DEFAULT 0.00,
  total_completed_and_stored numeric DEFAULT 0.00,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT engagement_pay_apps_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_sov_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  engagement_id uuid,
  line_code text,
  description text NOT NULL,
  division text,
  category text,
  quantity numeric,
  unit text,
  unit_cost numeric,
  extended_cost numeric,
  retainage_percent numeric DEFAULT 5.00,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT engagement_sov_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_sov_line_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pay_app_id uuid NOT NULL,
  sov_line_id uuid NOT NULL,
  scheduled_value numeric NOT NULL,
  previous_completed numeric DEFAULT 0.00,
  current_completed numeric DEFAULT 0.00,
  stored_materials numeric DEFAULT 0.00,
  total_completed_and_stored numeric,
  percent_complete numeric,
  balance_to_finish numeric,
  retainage_percent numeric DEFAULT 5.00,
  retainage_amount numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT engagement_sov_line_progress_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.company_vendor_details (
  company_id uuid NOT NULL,
  account_number text,
  default_payment_terms text,
  w9_status text CHECK (w9_status = ANY (ARRAY['Not Requested'::text, 'Requested'::text, 'Received'::text, 'Expired'::text])),
  w9_received_date date,
  preferred_shipping_method text,
  is_preferred_vendor boolean DEFAULT false,
  vendor_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_vendor_details_pkey PRIMARY KEY (company_id)
);

CREATE TABLE IF NOT EXISTS public.company_subcontractor_details (
  company_id uuid NOT NULL,
  insurance_expiration date,
  insurance_provider text,
  insurance_policy_number text,
  license_number text,
  license_expiration date,
  scope text,
  compliance_status text DEFAULT 'Unknown'::text CHECK (compliance_status = ANY (ARRAY['Compliant'::text, 'Pending'::text, 'Non-Compliant'::text, 'Unknown'::text])),
  subcontractor_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_subcontractor_details_pkey PRIMARY KEY (company_id)
);

CREATE TABLE IF NOT EXISTS public.trades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  division text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trades_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.engagement_trades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL,
  trade_id uuid NOT NULL,
  estimated_amount numeric,
  actual_cost numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT engagement_trades_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  mentioned_user_id uuid NOT NULL,
  notified_at timestamp with time zone,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_mentions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.probability_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  percentage integer NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  order_index integer NOT NULL,
  color text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT probability_levels_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.migration_history (
  id serial NOT NULL,
  filename character varying NOT NULL UNIQUE,
  executed_at timestamp without time zone DEFAULT now(),
  checksum text,
  CONSTRAINT migration_history_pkey PRIMARY KEY (id)
);

-- Step 3: Add foreign key constraints
ALTER TABLE public.contacts 
  ADD CONSTRAINT contacts_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.engagements 
  ADD CONSTRAINT engagements_converted_by_user_id_fkey 
  FOREIGN KEY (converted_by_user_id) REFERENCES public.users(id);

ALTER TABLE public.engagement_parties 
  ADD CONSTRAINT engagement_parties_engagement_id_fkey 
  FOREIGN KEY (engagement_id) REFERENCES public.engagements(id);

ALTER TABLE public.engagement_user_roles 
  ADD CONSTRAINT engagement_user_roles_engagement_id_fkey 
  FOREIGN KEY (engagement_id) REFERENCES public.engagements(id);

ALTER TABLE public.engagement_user_roles 
  ADD CONSTRAINT engagement_user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.engagement_user_roles 
  ADD CONSTRAINT engagement_user_roles_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES public.users(id);

ALTER TABLE public.engagement_subcontractors 
  ADD CONSTRAINT engagement_subcontractors_engagement_id_fkey 
  FOREIGN KEY (engagement_id) REFERENCES public.engagements(id);

ALTER TABLE public.engagement_subcontractors 
  ADD CONSTRAINT engagement_subcontractors_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.engagement_task_completion 
  ADD CONSTRAINT project_task_completion_engagement_id_fkey 
  FOREIGN KEY (engagement_id) REFERENCES public.engagements(id);

ALTER TABLE public.engagement_task_completion 
  ADD CONSTRAINT project_task_completion_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES public.engagement_tasks(id);

ALTER TABLE public.engagement_comments 
  ADD CONSTRAINT project_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.engagement_change_orders 
  ADD CONSTRAINT change_orders_engagement_id_fkey 
  FOREIGN KEY (engagement_id) REFERENCES public.engagements(id);

ALTER TABLE public.company_vendor_details 
  ADD CONSTRAINT company_vendor_details_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.company_subcontractor_details 
  ADD CONSTRAINT company_subcontractor_details_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.engagement_trades 
  ADD CONSTRAINT engagement_trades_engagement_id_fkey 
  FOREIGN KEY (engagement_id) REFERENCES public.engagements(id);

ALTER TABLE public.engagement_trades 
  ADD CONSTRAINT engagement_trades_trade_id_fkey 
  FOREIGN KEY (trade_id) REFERENCES public.trades(id);

ALTER TABLE public.comment_mentions 
  ADD CONSTRAINT comment_mentions_comment_id_fkey 
  FOREIGN KEY (comment_id) REFERENCES public.engagement_comments(id);

ALTER TABLE public.comment_mentions 
  ADD CONSTRAINT comment_mentions_mentioned_user_id_fkey 
  FOREIGN KEY (mentioned_user_id) REFERENCES public.users(id);

-- Step 4: Create views
CREATE OR REPLACE VIEW public.projects_v AS
SELECT * FROM public.engagements WHERE type = 'project';

CREATE OR REPLACE VIEW public.prospects_v AS
SELECT * FROM public.engagements WHERE type = 'prospect';

-- Step 5: Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_task_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_pay_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_sov_line_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_vendor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subcontractor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.probability_levels ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies (allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.stages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.companies FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagements FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_parties FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_user_roles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_subcontractors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_task_completion FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_comments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_change_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_pay_apps FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_sov_lines FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_sov_line_progress FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.company_vendor_details FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.company_subcontractor_details FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.trades FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.engagement_trades FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.comment_mentions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.probability_levels FOR ALL TO authenticated USING (true);

-- Verification
SELECT 'Tables created:' as info, COUNT(*) as count FROM pg_tables WHERE schemaname = 'public';
SELECT 'Views created:' as info, COUNT(*) as count FROM pg_views WHERE schemaname = 'public';

-- Done! Ready for data import
