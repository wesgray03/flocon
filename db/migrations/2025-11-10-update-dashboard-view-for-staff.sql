-- Update project_dashboard view to include superintendent and foreman
DROP VIEW IF EXISTS project_dashboard CASCADE;

CREATE OR REPLACE VIEW project_dashboard AS
SELECT
  e.id,
  e.project_number,
  e.name AS project_name,
  u.name AS owner,
  e.user_id,
  e.superintendent_id,
  su.name AS superintendent,
  e.foreman_id,
  fo.name AS foreman,
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  e.contract_amount,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN stages s ON e.stage_id = s.id
LEFT JOIN users u ON e.user_id = u.id
LEFT JOIN users su ON e.superintendent_id = su.id
LEFT JOIN users fo ON e.foreman_id = fo.id
WHERE e.type = 'project';

COMMENT ON VIEW project_dashboard IS 'Project dashboard including superintendent and foreman from users table';
