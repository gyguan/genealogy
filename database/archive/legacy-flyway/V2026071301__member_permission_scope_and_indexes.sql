-- Issue #101: close member-permission scope and paging risks.
--
-- Historical code sometimes stored the UI's "branch and descendants" selection as `branch`.
-- `branch` also has a legitimate least-privilege meaning: exactly one branch. Broadly converting
-- every row would silently expand editor/viewer access, so only the unambiguous branch_admin role
-- is migrated automatically. Other historical `branch` rows remain exact-branch grants and can be
-- reviewed/reassigned explicitly by a clan administrator.

CREATE TABLE IF NOT EXISTS member_role_scope_migration_2026071301 (
    member_role_id BIGINT PRIMARY KEY,
    previous_scope_type VARCHAR(32) NOT NULL,
    target_scope_type VARCHAR(32) NOT NULL,
    migration_reason VARCHAR(128) NOT NULL,
    migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO member_role_scope_migration_2026071301 (
    member_role_id,
    previous_scope_type,
    target_scope_type,
    migration_reason
)
SELECT
    member_role.id,
    member_role.scope_type,
    'branch_subtree',
    'branch_admin_requires_subtree'
FROM member_role
JOIN app_role ON app_role.id = member_role.role_id
WHERE member_role.scope_type = 'branch'
  AND app_role.role_code = 'branch_admin'
ON CONFLICT (member_role_id) DO NOTHING;

UPDATE member_role
SET scope_type = migration.target_scope_type
FROM member_role_scope_migration_2026071301 migration
WHERE member_role.id = migration.member_role_id
  AND member_role.scope_type = migration.previous_scope_type;

-- Member page: tenant/status ordering and unique membership lookup.
CREATE INDEX IF NOT EXISTS idx_clan_membership_clan_status_id
    ON clan_membership (clan_id, member_status, id);

CREATE INDEX IF NOT EXISTS idx_clan_membership_clan_user
    ON clan_membership (clan_id, user_id);

-- Grant aggregation, role filtering and target-scope filtering.
CREATE INDEX IF NOT EXISTS idx_member_role_membership_status
    ON member_role (membership_id, status);

CREATE INDEX IF NOT EXISTS idx_member_role_role_status
    ON member_role (role_id, status);

CREATE INDEX IF NOT EXISTS idx_member_role_scope_status
    ON member_role (scope_type, scope_id, status);

-- Recursive branch subtree traversal.
CREATE INDEX IF NOT EXISTS idx_branch_clan_parent
    ON branch (clan_id, parent_id);
