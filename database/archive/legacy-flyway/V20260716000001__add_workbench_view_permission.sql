-- Tree anomaly summaries and the editing workbench share one explicit read permission.
-- This migration is data-only and idempotent: it does not change business table schemas.

INSERT INTO app_permission (
    permission_code,
    permission_name,
    module_code,
    module_name,
    resource_code,
    action_code,
    description,
    system_permission,
    status,
    created_at,
    updated_at
)
SELECT
    'workbench.view',
    '查看修谱工作台',
    'workbench',
    '修谱工作台',
    'workbench',
    'view',
    '查看修谱问题、风险摘要及其只读定位信息',
    TRUE,
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM app_permission
    WHERE permission_code = 'workbench.view'
);

INSERT INTO app_role_permission (
    role_id,
    permission_id,
    effect,
    status,
    created_at,
    updated_at
)
SELECT
    role.id,
    permission.id,
    'allow',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM app_role role
JOIN app_permission permission
  ON permission.permission_code = 'workbench.view'
WHERE role.role_code IN (
    'cross_clan_admin',
    'clan_admin',
    'branch_admin',
    'editor',
    'reviewer'
)
  AND NOT EXISTS (
      SELECT 1
      FROM app_role_permission existing
      WHERE existing.role_id = role.id
        AND existing.permission_id = permission.id
        AND existing.effect = 'allow'
        AND existing.status = 'active'
  );
