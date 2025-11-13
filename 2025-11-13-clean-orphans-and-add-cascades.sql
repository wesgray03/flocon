-- Clean up orphan child rows referencing engagements, then (re)apply ON DELETE CASCADE FKs.
-- Run this BEFORE the previous cascade migration if that failed due to violations.
-- Safe/idempotent: delete only rows whose engagement_id no longer exists.

-- 1. Report orphan counts (optional)
-- SELECT 'engagement_comments' AS table, COUNT(*) AS orphan_count FROM engagement_comments c WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = c.engagement_id)
-- UNION ALL SELECT 'engagement_parties', COUNT(*) FROM engagement_parties p WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = p.engagement_id)
-- UNION ALL SELECT 'engagement_user_roles', COUNT(*) FROM engagement_user_roles ur WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = ur.engagement_id)
-- UNION ALL SELECT 'engagement_subcontractors', COUNT(*) FROM engagement_subcontractors s WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = s.engagement_id)
-- UNION ALL SELECT 'engagement_task_completion', COUNT(*) FROM engagement_task_completion tc WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = tc.engagement_id)
-- UNION ALL SELECT 'engagement_change_orders', COUNT(*) FROM engagement_change_orders co WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = co.engagement_id)
-- UNION ALL SELECT 'engagement_trades', COUNT(*) FROM engagement_trades t WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = t.engagement_id)
-- UNION ALL SELECT 'engagement_sov_lines', COUNT(*) FROM engagement_sov_lines sl WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = sl.engagement_id)
-- UNION ALL SELECT 'engagement_sov_line_progress', COUNT(*) FROM engagement_sov_line_progress sp WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = sp.engagement_id)
-- UNION ALL SELECT 'engagement_pay_apps', COUNT(*) FROM engagement_pay_apps pa WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = pa.engagement_id)
;

DO $$
BEGIN
  RAISE NOTICE 'Deleting orphan engagement child rows...';

  -- Delete orphans in each table
  DELETE FROM engagement_comments c WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = c.engagement_id);
  DELETE FROM engagement_parties p WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = p.engagement_id);
  DELETE FROM engagement_user_roles ur WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = ur.engagement_id);
  DELETE FROM engagement_subcontractors s WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = s.engagement_id);
  DELETE FROM engagement_task_completion tc WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = tc.engagement_id);
  DELETE FROM engagement_change_orders co WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = co.engagement_id);
  DELETE FROM engagement_trades t WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = t.engagement_id);
  DELETE FROM engagement_sov_lines sl WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = sl.engagement_id);
  DELETE FROM engagement_sov_line_progress sp WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = sp.engagement_id);
  DELETE FROM engagement_pay_apps pa WHERE NOT EXISTS (SELECT 1 FROM engagements e WHERE e.id = pa.engagement_id);

  RAISE NOTICE 'Orphan cleanup complete.';
END $$;

-- Optionally re-run the cascade migration now, or redefine constraints with NOT VALID then VALIDATE.
-- Example (if you prefer NOT VALID first):
-- ALTER TABLE engagement_comments DROP CONSTRAINT IF EXISTS project_comments_engagement_id_fkey;
-- ALTER TABLE engagement_comments ADD CONSTRAINT project_comments_engagement_id_fkey FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE NOT VALID;
-- ALTER TABLE engagement_comments VALIDATE CONSTRAINT project_comments_engagement_id_fkey;