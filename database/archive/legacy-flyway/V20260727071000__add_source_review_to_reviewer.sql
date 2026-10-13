-- 来源绑定审核服务使用 source:review，权限层会规范化为 source.review。
-- 补齐权限点并授予系统 reviewer 角色，使来源绑定 Revision 可以由独立审核员处理。

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
    'source.review',
    '审核来源绑定',
    'source',
    '来源资料',
    'source',
    'review',
    '审核来源与人物、关系、支派、宗族或字辈的绑定变更',
    TRUE,
    'active',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM app_permission WHERE permission_code = 'source.review'
);

UPDATE app_permission
SET status = 'active',
    updated_at = NOW()
WHERE permission_code = 'source.review'
  AND status IS DISTINCT FROM 'active';

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
    NOW(),
    NOW()
FROM app_role role
JOIN app_permission permission ON permission.permission_code = 'source.review'
WHERE role.role_code = 'reviewer'
  AND NOT EXISTS (
      SELECT 1
      FROM app_role_permission existing
      WHERE existing.role_id = role.id
        AND existing.permission_id = permission.id
        AND existing.effect = 'allow'
        AND existing.status = 'active'
  );
