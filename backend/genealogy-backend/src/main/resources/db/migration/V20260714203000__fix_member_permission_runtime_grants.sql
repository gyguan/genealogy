-- Purpose:补齐成员权限页面运行时所需的 RBAC 权限点与内置管理员角色授权。
-- Issue/PR: Manual production-readiness fix after member permission runtime mismatch
-- Risk: low
-- Lock impact: 仅对 app_permission、app_role_permission 小表执行 upsert，不涉及业务大表扫描。
-- Data volume: 权限元数据表，预计行数较小。
-- Compatibility: 保留历史 member.update_role 权限，同时补齐当前后端校验使用的 member.view、member.grant_role、member.revoke_role 等点号权限。
-- Rollback/Compensation: 如需回滚，可通过更高版本迁移撤销新增授权或停用对应权限点。
-- Verification: 部署后确认 clan_admin 角色包含 member.view、member.grant_role、member.revoke_role、member.disable、member.invite。

-- 1. Ensure runtime member-management permission points exist in dot form.
insert into app_permission (
    permission_code,
    permission_name,
    module_code,
    module_name,
    resource_code,
    action_code,
    description,
    system_permission,
    status,
    created_by,
    created_at,
    updated_by,
    updated_at
)
values
    ('member.view', '查看成员权限', 'member', '成员权限', 'member', 'view', '查看宗族成员、角色和授权范围', true, 'active', null, now(), null, now()),
    ('member.invite', '邀请成员', 'member', '成员权限', 'member', 'invite', '邀请用户加入宗族并授予角色', true, 'active', null, now(), null, now()),
    ('member.grant_role', '授予成员角色', 'member', '成员权限', 'member', 'grant_role', '授予或调整成员角色授权', true, 'active', null, now(), null, now()),
    ('member.revoke_role', '撤销成员角色', 'member', '成员权限', 'member', 'revoke_role', '撤销成员角色授权', true, 'active', null, now(), null, now()),
    ('member.disable', '停用成员', 'member', '成员权限', 'member', 'disable', '停用或恢复宗族成员访问权限', true, 'active', null, now(), null, now())
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    module_code = excluded.module_code,
    module_name = excluded.module_name,
    resource_code = excluded.resource_code,
    action_code = excluded.action_code,
    description = excluded.description,
    system_permission = excluded.system_permission,
    status = excluded.status,
    updated_by = excluded.updated_by,
    updated_at = now();

-- 2. Grant member-management permissions to built-in full-admin roles.
insert into app_role_permission (
    role_id,
    permission_id,
    effect,
    status,
    created_by,
    created_at,
    updated_by,
    updated_at
)
select
    r.id,
    p.id,
    'allow',
    'active',
    null,
    now(),
    null,
    now()
from app_role r
join app_permission p
  on p.permission_code in (
      'member.view',
      'member.invite',
      'member.grant_role',
      'member.revoke_role',
      'member.disable'
  )
where r.role_code in ('cross_clan_admin', 'clan_admin')
on conflict (role_id, permission_id) do update
set effect = excluded.effect,
    status = excluded.status,
    updated_by = excluded.updated_by,
    updated_at = now();

-- 3. Keep legacy member.update_role compatible with the current grant-role runtime permission.
-- Existing custom roles that had member.update_role will also receive member.grant_role.
insert into app_role_permission (
    role_id,
    permission_id,
    effect,
    status,
    created_by,
    created_at,
    updated_by,
    updated_at
)
select
    legacy_grant.role_id,
    runtime_permission.id,
    'allow',
    'active',
    legacy_grant.created_by,
    coalesce(legacy_grant.created_at, now()),
    legacy_grant.updated_by,
    now()
from app_role_permission legacy_grant
join app_permission legacy_permission
  on legacy_permission.id = legacy_grant.permission_id
join app_permission runtime_permission
  on runtime_permission.permission_code = 'member.grant_role'
where legacy_permission.permission_code in ('member.update_role', 'member:update_role')
  and legacy_grant.effect = 'allow'
  and legacy_grant.status = 'active'
on conflict (role_id, permission_id) do update
set effect = excluded.effect,
    status = excluded.status,
    updated_by = excluded.updated_by,
    updated_at = now();
