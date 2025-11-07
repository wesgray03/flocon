-- Recreate project_dashboard view in staging (from production definition)
-- Run this in Supabase SQL Editor for staging database

-- Drop the table first (it was created as a table by mistake)
DROP TABLE IF EXISTS public.project_dashboard;

-- Now create it as a view
CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT p.id,
    p.qbid,
    p.name AS project_name,
    c.name AS customer_name,
    p.manager,
    p.owner,
    p.start_date,
    p.end_date,
    p.stage_id,
    s.name AS stage_name,
    s."order" AS stage_order,
    COALESCE(p.contract_amount, 0::numeric) AS contract_amt,
    COALESCE(( SELECT sum(change_orders.amount) AS sum
           FROM change_orders
          WHERE change_orders.project_id = p.id), 0::numeric) AS co_amt,
    COALESCE(p.contract_amount, 0::numeric) + COALESCE(( SELECT sum(change_orders.amount) AS sum
           FROM change_orders
          WHERE change_orders.project_id = p.id), 0::numeric) AS total_amt,
    COALESCE(( SELECT sum(pay_apps.amount) AS sum
           FROM pay_apps
          WHERE pay_apps.project_id = p.id), 0::numeric) AS billed_amt,
    COALESCE(p.contract_amount, 0::numeric) + COALESCE(( SELECT sum(change_orders.amount) AS sum
           FROM change_orders
          WHERE change_orders.project_id = p.id), 0::numeric) - COALESCE(( SELECT sum(pay_apps.amount) AS sum
           FROM pay_apps
          WHERE pay_apps.project_id = p.id), 0::numeric) AS balance,
    p.sharepoint_folder
   FROM projects p
     LEFT JOIN customers c ON p.customer_id = c.id
     LEFT JOIN stages s ON p.stage_id = s.id;