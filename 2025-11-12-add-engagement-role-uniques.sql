-- Add unique and primary-role constraints for engagement_parties and engagement_user_roles
-- Safe to run after de-duplication scripts provided separately.

-- engagement_parties unique triple (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'engagement_parties_unique_party_role'
  ) THEN
    ALTER TABLE engagement_parties
      ADD CONSTRAINT engagement_parties_unique_party_role
      UNIQUE (engagement_id, party_id, role);
  END IF;
END$$;

-- one primary per role (partial unique index)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname='public' 
      AND indexname='engagement_parties_one_primary_per_role'
  ) THEN
    CREATE UNIQUE INDEX engagement_parties_one_primary_per_role
      ON engagement_parties (engagement_id, role)
      WHERE is_primary;
  END IF;
END$$;

-- engagement_user_roles unique triple
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'engagement_user_roles_unique_user_role'
  ) THEN
    ALTER TABLE engagement_user_roles
      ADD CONSTRAINT engagement_user_roles_unique_user_role
      UNIQUE (engagement_id, user_id, role);
  END IF;
END$$;

-- one primary user per role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname='public' 
      AND indexname='engagement_user_roles_one_primary_per_role'
  ) THEN
    CREATE UNIQUE INDEX engagement_user_roles_one_primary_per_role
      ON engagement_user_roles (engagement_id, role)
      WHERE is_primary;
  END IF;
END$$;
