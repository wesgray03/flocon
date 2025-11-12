-- Complete Production Schema Export for Staging
-- Run this in Supabase SQL Editor for staging database
-- https://supabase.com/dashboard/project/hieokzpxehyelhbubbpb

-- Create custom types first
CREATE TYPE party_type AS ENUM ('gc', 'owner', 'architect', 'subcontractor', 'vendor');
CREATE TYPE po_status AS ENUM ('draft', 'sent', 'acknowledged', 'completed', 'cancelled');
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');

-- Create all tables
CREATE TABLE public.billings (
    billed_amount numeric(12,2) NOT NULL DEFAULT 0, 
    id uuid NOT NULL DEFAULT uuid_generate_v4(), 
    invoice_number text, 
    project_id uuid, 
    billed_date date DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE public.change_orders (
    date date, 
    project_id uuid, 
    number text, 
    amount numeric(12,2) NOT NULL DEFAULT 0, 
    co_number text, 
    created_at timestamp without time zone DEFAULT now(), 
    description text NOT NULL DEFAULT ''::text, 
    status text DEFAULT 'Pending'::text, 
    id uuid NOT NULL DEFAULT uuid_generate_v4(), 
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE public.contacts (
    email text, 
    customer_id uuid, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    updated_at timestamp with time zone DEFAULT now(), 
    created_at timestamp with time zone DEFAULT now(), 
    contact_type varchar(50) NOT NULL, 
    phone text, 
    name text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE public.customers (
    phone text, 
    email text, 
    address text, 
    notes text, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    name text NOT NULL, 
    party_type party_type NOT NULL DEFAULT 'gc'::party_type, 
    contact_name text, 
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE public.managers (
    name text NOT NULL, 
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    PRIMARY KEY (id)
);

CREATE TABLE public.owners (
    id uuid NOT NULL DEFAULT uuid_generate_v4(), 
    name text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE public.pay_apps (
    current_payment_due numeric(15,2) DEFAULT 0.00, 
    previous_payments numeric(15,2) DEFAULT 0.00, 
    balance_to_finish numeric(15,2) DEFAULT 0.00, 
    total_earned_less_retainage numeric(15,2) DEFAULT 0.00, 
    total_retainage numeric(15,2) DEFAULT 0.00, 
    retainage_stored_materials numeric(15,2) DEFAULT 0.00, 
    retainage_completed_work numeric(15,2) DEFAULT 0.00, 
    total_completed_and_stored numeric(15,2) DEFAULT 0.00, 
    updated_at timestamp with time zone NOT NULL DEFAULT now(), 
    created_at timestamp with time zone NOT NULL DEFAULT now(), 
    status text, 
    date_paid date, 
    date_submitted date, 
    period_end date, 
    period_start date, 
    amount numeric(15,2) DEFAULT 0.00, 
    description text NOT NULL, 
    pay_app_number text, 
    project_id uuid NOT NULL, 
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY (id)
);

CREATE TABLE public.project_comments (
    updated_at timestamp with time zone DEFAULT now(), 
    created_at timestamp with time zone DEFAULT now(), 
    comment_text text NOT NULL, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    user_id uuid NOT NULL, 
    project_id uuid NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE public.project_dashboard (
    contract_amt numeric, 
    stage_order smallint, 
    stage_name text, 
    end_date date, 
    start_date date, 
    owner text, 
    manager text, 
    customer_name text, 
    project_name text, 
    qbid text, 
    id uuid, 
    stage_id uuid, 
    sharepoint_folder text, 
    balance numeric, 
    billed_amt numeric, 
    total_amt numeric, 
    co_amt numeric
);

CREATE TABLE public.project_subcontractors (
    updated_at timestamp with time zone DEFAULT now(), 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    project_id uuid NOT NULL, 
    subcontractor_id uuid NOT NULL, 
    work_order_number text, 
    assigned_date date, 
    notes text, 
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE public.project_tasks (
    updated_at timestamp with time zone NOT NULL DEFAULT now(), 
    created_at timestamp with time zone NOT NULL DEFAULT now(), 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    name text NOT NULL, 
    stage_id uuid NOT NULL, 
    complete boolean NOT NULL DEFAULT false, 
    order_num integer,
    PRIMARY KEY (id)
);

CREATE TABLE public.projects (
    owner text, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    project_number text, 
    created_at timestamp with time zone NOT NULL DEFAULT now(), 
    notes text, 
    scope_summary text, 
    created_from_excel boolean NOT NULL DEFAULT false, 
    address text, 
    state text, 
    city text, 
    end_date date, 
    start_date date, 
    bid_amount numeric(14,2), 
    customer_id uuid, 
    name text NOT NULL, 
    manager text, 
    qbid text, 
    sharepoint_folder text, 
    stage_id uuid, 
    contract_amount numeric(12,2),
    PRIMARY KEY (id)
);

CREATE TABLE public.proposals (
    file_name text, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    project_id uuid, 
    name text NOT NULL, 
    proposal_date date, 
    bid_amount numeric(14,2), 
    material_cost numeric(14,2), 
    labor_cost numeric(14,2), 
    freight numeric(14,2), 
    tax numeric(14,2), 
    gp_pct numeric(5,2), 
    total numeric(14,2), 
    notes text, 
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE public.purchase_orders (
    created_at timestamp with time zone NOT NULL DEFAULT now(), 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    po_number text NOT NULL, 
    project_id uuid, 
    vendor_id uuid, 
    issue_date date, 
    material_amount numeric(14,2), 
    freight numeric(14,2), 
    tax numeric(14,2), 
    total numeric(14,2), 
    status po_status NOT NULL DEFAULT 'draft'::po_status, 
    notes text,
    PRIMARY KEY (id)
);

CREATE TABLE public.seed_projects_clean (
    project_name text, 
    owner_name text, 
    stage text, 
    customer_name text, 
    manager_name text, 
    finish_date date, 
    start_date date, 
    contract_amount numeric, 
    qbid text
);

CREATE TABLE public.seed_projects_raw (
    project_name text, 
    owner_name text, 
    stage text, 
    customer_name text, 
    manager_name text, 
    finish_date text, 
    start_date text, 
    contract_amt text, 
    qbid text
);

CREATE TABLE public.sov_line_progress (
    updated_at timestamp with time zone DEFAULT now(), 
    created_at timestamp with time zone DEFAULT now(), 
    retainage_percent numeric(5,2) DEFAULT 5.00, 
    retainage_amount numeric(15,2) DEFAULT 0.00, 
    total_completed_and_stored numeric(15,2), 
    balance_to_finish numeric(15,2), 
    stored_materials numeric(15,2) DEFAULT 0.00, 
    current_completed numeric(15,2) DEFAULT 0.00, 
    previous_completed numeric(15,2) DEFAULT 0.00, 
    scheduled_value numeric(15,2) NOT NULL, 
    sov_line_id uuid NOT NULL, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    pay_app_id uuid NOT NULL, 
    percent_complete numeric(5,2),
    PRIMARY KEY (id)
);

CREATE TABLE public.sov_lines (
    extended_cost numeric(14,2), 
    retainage_percent numeric(5,2) DEFAULT 5.00, 
    created_at timestamp with time zone NOT NULL DEFAULT now(), 
    notes text, 
    category text, 
    unit_cost numeric(14,4), 
    unit text, 
    quantity numeric(14,3), 
    division text, 
    description text NOT NULL, 
    line_code text, 
    project_id uuid, 
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY (id)
);

CREATE TABLE public.stages (
    name text NOT NULL, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    "order" smallint,
    PRIMARY KEY (id)
);

CREATE TABLE public.subcontractors (
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    updated_at timestamp with time zone DEFAULT now(), 
    created_at timestamp with time zone DEFAULT now(), 
    name text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE public.tasks (
    name text NOT NULL, 
    project_id uuid, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    created_at timestamp with time zone NOT NULL DEFAULT now(), 
    status task_status NOT NULL DEFAULT 'not_started'::task_status, 
    notes text, 
    due_date date, 
    category text, 
    assigned_to text,
    PRIMARY KEY (id)
);

CREATE TABLE public.users (
    updated_at timestamp with time zone DEFAULT now(), 
    auth_user_id uuid, 
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    name varchar(255) NOT NULL, 
    email varchar(255) NOT NULL, 
    user_type varchar(50) NOT NULL, 
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE public.vendors (
    id uuid NOT NULL DEFAULT gen_random_uuid(), 
    name text NOT NULL, 
    trade_type text NOT NULL, 
    created_at timestamp with time zone NOT NULL DEFAULT now(), 
    notes text, 
    address text, 
    email text, 
    phone text, 
    contact_name text,
    PRIMARY KEY (id)
);

-- Create indexes for commonly queried fields
CREATE INDEX idx_projects_qbid ON public.projects(qbid);
CREATE INDEX idx_projects_stage_id ON public.projects(stage_id);
CREATE INDEX idx_projects_customer_id ON public.projects(customer_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_contacts_customer_id ON public.contacts(customer_id);
CREATE INDEX idx_change_orders_project_id ON public.change_orders(project_id);
CREATE INDEX idx_pay_apps_project_id ON public.pay_apps(project_id);
CREATE INDEX idx_sov_lines_project_id ON public.sov_lines(project_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sov_line_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sov_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development (allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON public.billings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.change_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.contacts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.managers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.owners FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.pay_apps FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.project_comments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.project_subcontractors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.project_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.projects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.proposals FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.purchase_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.sov_line_progress FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.sov_lines FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.stages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.subcontractors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.vendors FOR ALL USING (auth.role() = 'authenticated');