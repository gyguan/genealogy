-- Manual rollback for V2026071301__member_permission_scope_and_indexes.sql
--
-- Preconditions:
-- 1. Execute only during the rollback window before any new `branch_subtree` grants are created.
-- 2. Stop member-permission writes while this script runs.
-- 3. Take a database backup before execution.

BEGIN;

-- Restore the historical representation used before Issue #101.
UPDATE member_role
SET scope_type = 'branch'
WHERE scope_type = 'branch_subtree';

DROP INDEX IF EXISTS idx_clan_membership_clan_status_id;
DROP INDEX IF EXISTS idx_clan_membership_clan_user;
DROP INDEX IF EXISTS idx_member_role_membership_status;
DROP INDEX IF EXISTS idx_member_role_role_status;
DROP INDEX IF EXISTS idx_member_role_scope_status;
DROP INDEX IF EXISTS idx_branch_clan_parent;

COMMIT;
