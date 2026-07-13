-- Issue #101: close member-permission scope and paging risks.
-- Historical member-management code stored the UI's "branch and descendants" selection as `branch`.
-- Migrate those records to the explicit subtree semantic. New writes only persist `branch_subtree`.
UPDATE member_role
SET scope_type = 'branch_subtree'
WHERE scope_type = 'branch';

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
