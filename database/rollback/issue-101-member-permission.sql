-- Manual rollback for V2026071301__member_permission_scope_and_indexes.sql
--
-- Preconditions:
-- 1. Stop member-permission writes while this script runs.
-- 2. Take a database backup before execution.
-- 3. Confirm the migration audit table exists and contains the expected member_role IDs.

BEGIN;

-- Restore only records changed by this migration. Do not rewrite legitimate/new branch_subtree grants.
UPDATE member_role
SET scope_type = migration.previous_scope_type
FROM member_role_scope_migration_2026071301 migration
WHERE member_role.id = migration.member_role_id
  AND member_role.scope_type = migration.target_scope_type;

DROP INDEX IF EXISTS idx_clan_membership_clan_status_id;
DROP INDEX IF EXISTS idx_clan_membership_clan_user;
DROP INDEX IF EXISTS idx_member_role_membership_status;
DROP INDEX IF EXISTS idx_member_role_role_status;
DROP INDEX IF EXISTS idx_member_role_scope_status;
DROP INDEX IF EXISTS idx_branch_clan_parent;

DROP TABLE IF EXISTS member_role_scope_migration_2026071301;

COMMIT;
