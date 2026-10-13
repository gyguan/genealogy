-- Purpose: Manually repair member-management permissions for local or manually migrated databases.
-- Context: MemberPermissionController checks dot-form permissions such as member.view,
--          member.grant_role and member.revoke_role, while some seed data only created
--          legacy permissions such as member.update_role.
-- Scope: Safe to run multiple times. This script does not require Flyway and is intended
--        for execution from a database client.
-- Risk: Low. It only upserts app_permission rows and app_role_permission grants for
--       built-in admin roles.
-- Verification: Run the verification queries at the end and confirm demo_admin has
--               member.view and member.grant_role in each target clan.

begin;

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
--    Existing custom roles that had member.update_role will also receive member.grant_role.
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

commit;

-- Verification 1: clan_admin should include all member-management runtime permissions.
select
    r.role_code,
    p.permission_code,
    rp.effect,
    rp.status
from app_role r
join app_role_permission rp on rp.role_id = r.id
join app_permission p on p.id = rp.permission_id
where r.role_code in ('cross_clan_admin', 'clan_admin')
  and p.permission_code like 'member.%'
order by r.role_code, p.permission_code;

-- Verification 2: demo_admin should have effective clan_admin membership rows.
select
    c.id as clan_id,
    c.clan_name,
    u.username,
    r.role_code,
    cm.member_status,
    cm.scope_type,
    cm.scope_id
from app_user u
join clan_member cm on cm.user_id = u.id
join clan c on c.id = cm.clan_id
join app_role r on r.id = cm.role_id
where u.username = 'demo_admin'
order by c.id, r.role_code;
