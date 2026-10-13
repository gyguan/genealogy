-- Permission model seed update after P0 permission management rollout.
-- Keep legacy seed data compatible with the current RBAC runtime.

-- 1. Ensure runtime roles exist.
insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
values
    ('cross_clan_admin', '跨宗族管理员', '跨宗族运维和审计角色，可访问全部宗族空间', true, now(), now()),
    ('clan_admin', '宗族管理员', '管理本宗族空间、成员授权、支派、人物、关系、来源、审核和导出', true, now(), now()),
    ('branch_admin', '支派管理员', '管理授权支派及下级支派范围内的人物、关系、来源和支派数据', true, now(), now()),
    ('editor', '修谱编辑', '维护授权范围内的人物档案、世系关系、来源证据并提交审核', true, now(), now()),
    ('reviewer', '审核员', '查看待审内容，执行通过或驳回', true, now(), now()),
    ('viewer', '查看者', '仅可查看授权范围内的宗族、人物、关系和来源摘要', true, now(), now())
on conflict (role_code) do update
set role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();

-- 2. Seed fine-grained resource:action permissions.
with permissions(permission_code, sort_order, permission_type) as (
    values
        ('clan:view', 101, 'business'),
        ('clan:update', 102, 'business'),
        ('clan:manage_settings', 103, 'business'),
        ('clan:delete', 104, 'business'),
        ('member:invite', 201, 'system'),
        ('member:update_role', 202, 'system'),
        ('member:disable', 203, 'system'),
        ('member:transfer_owner', 204, 'system'),
        ('branch:view', 301, 'business'),
        ('branch:create', 302, 'business'),
        ('branch:update', 303, 'business'),
        ('branch:delete', 304, 'business'),
        ('person:view', 401, 'business'),
        ('person:create', 402, 'business'),
        ('person:update', 403, 'business'),
        ('person:delete', 404, 'business'),
        ('person:submit_review', 405, 'business'),
        ('relationship:view', 501, 'business'),
        ('relationship:create', 502, 'business'),
        ('relationship:update', 503, 'business'),
        ('relationship:delete', 504, 'business'),
        ('relationship:check_conflict', 505, 'business'),
        ('relationship:submit_review', 506, 'business'),
        ('source:view', 601, 'business'),
        ('source:create', 602, 'business'),
        ('source:update', 603, 'business'),
        ('source:delete', 604, 'business'),
        ('source:bind', 605, 'business'),
        ('attachment:view', 701, 'business'),
        ('attachment:upload', 702, 'business'),
        ('attachment:preview', 703, 'business'),
        ('attachment:download', 704, 'business'),
        ('attachment:delete', 705, 'business'),
        ('review_task:view', 801, 'business'),
        ('review_task:approve', 802, 'business'),
        ('review_task:reject', 803, 'business'),
        ('review_task:assign', 804, 'business'),
        ('export_task:create', 901, 'business'),
        ('export_task:approve', 902, 'business'),
        ('export_task:download', 903, 'business'),
        ('operation_log:view', 1001, 'system'),
        ('operation_log:export', 1002, 'system')
)
insert into app_permission (
    permission_code,
    permission_name,
    permission_type,
    resource_type,
    action_type,
    resource_code,
    action_code,
    module_code,
    permission_category,
    enabled,
    sort_order,
    description,
    system_permission,
    created_at,
    updated_at
)
select permission_code,
       permission_code,
       permission_type,
       split_part(permission_code, ':', 1),
       split_part(permission_code, ':', 2),
       split_part(permission_code, ':', 1),
       split_part(permission_code, ':', 2),
       split_part(permission_code, ':', 1),
       permission_type,
       true,
       sort_order,
       permission_code,
       true,
       now(),
       now()
from permissions
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    permission_type = excluded.permission_type,
    resource_type = excluded.resource_type,
    action_type = excluded.action_type,
    resource_code = excluded.resource_code,
    action_code = excluded.action_code,
    module_code = excluded.module_code,
    permission_category = excluded.permission_category,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    description = excluded.description,
    system_permission = excluded.system_permission,
    updated_at = now();

-- 3. Rebuild baseline role-permission grants for built-in roles.
delete from app_role_permission
where role_id in (
    select id from app_role
    where role_code in ('cross_clan_admin', 'clan_admin', 'branch_admin', 'editor', 'reviewer', 'viewer')
);

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in (
    'clan:view', 'clan:update', 'clan:manage_settings', 'clan:delete',
    'member:invite', 'member:update_role', 'member:disable', 'member:transfer_owner',
    'branch:view', 'branch:create', 'branch:update', 'branch:delete',
    'person:view', 'person:create', 'person:update', 'person:delete', 'person:submit_review',
    'relationship:view', 'relationship:create', 'relationship:update', 'relationship:delete', 'relationship:check_conflict', 'relationship:submit_review',
    'source:view', 'source:create', 'source:update', 'source:delete', 'source:bind',
    'attachment:view', 'attachment:upload', 'attachment:preview', 'attachment:download', 'attachment:delete',
    'review_task:view', 'review_task:approve', 'review_task:reject', 'review_task:assign',
    'export_task:create', 'export_task:approve', 'export_task:download',
    'operation_log:view', 'operation_log:export'
)
where r.role_code in ('cross_clan_admin', 'clan_admin')
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in (
    'clan:view', 'branch:view', 'branch:create', 'branch:update',
    'person:view', 'person:create', 'person:update', 'person:submit_review',
    'relationship:view', 'relationship:create', 'relationship:update', 'relationship:check_conflict', 'relationship:submit_review',
    'source:view', 'source:create', 'source:update', 'source:bind',
    'attachment:view', 'attachment:upload', 'attachment:preview', 'attachment:download',
    'review_task:view', 'export_task:create'
)
where r.role_code = 'branch_admin'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in (
    'clan:view', 'branch:view',
    'person:view', 'person:create', 'person:update', 'person:submit_review',
    'relationship:view', 'relationship:create', 'relationship:update', 'relationship:check_conflict', 'relationship:submit_review',
    'source:view', 'source:create', 'source:update', 'source:bind',
    'attachment:view', 'attachment:upload', 'attachment:preview', 'attachment:download',
    'review_task:view'
)
where r.role_code = 'editor'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in (
    'clan:view', 'branch:view', 'person:view', 'relationship:view', 'source:view',
    'attachment:view', 'attachment:preview',
    'review_task:view', 'review_task:approve', 'review_task:reject'
)
where r.role_code = 'reviewer'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in (
    'clan:view', 'branch:view', 'person:view', 'relationship:view', 'source:view',
    'attachment:view', 'attachment:preview'
)
where r.role_code = 'viewer'
on conflict (role_id, permission_id) do nothing;

-- 4. Backfill member authorization scopes for existing seed/legacy data.
update clan_member cm
set scope_type = 'clan',
    scope_id = cm.clan_id,
    updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code in ('cross_clan_admin', 'clan_admin', 'reviewer', 'viewer')
  and (cm.scope_type is null or cm.scope_type <> 'clan' or cm.scope_id is distinct from cm.clan_id);

update clan_member cm
set scope_type = 'branch_subtree',
    scope_id = coalesce(cm.scope_id, cm.branch_id),
    updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code = 'branch_admin'
  and coalesce(cm.scope_id, cm.branch_id) is not null
  and (cm.scope_type is null or cm.scope_type <> 'branch_subtree' or cm.scope_id is distinct from coalesce(cm.scope_id, cm.branch_id));

update clan_member cm
set scope_type = 'branch',
    scope_id = coalesce(cm.scope_id, cm.branch_id),
    updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code = 'editor'
  and coalesce(cm.scope_id, cm.branch_id) is not null
  and (cm.scope_type is null or cm.scope_type not in ('branch', 'branch_subtree') or cm.scope_id is distinct from coalesce(cm.scope_id, cm.branch_id));

update clan_member
set scope_id = branch_id,
    updated_at = now()
where scope_type in ('branch', 'branch_subtree')
  and scope_id is null
  and branch_id is not null;

update clan_member
set scope_id = clan_id,
    updated_at = now()
where scope_type = 'clan'
  and scope_id is null;

-- 5. Ensure branch_path is usable by subtree scope checks for legacy rows.
update branch
set branch_path = id::text,
    updated_at = now()
where (branch_path is null or branch_path = '')
  and parent_id is null;

with recursive branch_tree as (
    select id, clan_id, parent_id, branch_path::text as branch_path
    from branch
    where parent_id is null
      and branch_path is not null
      and branch_path <> ''
    union all
    select child.id,
           child.clan_id,
           child.parent_id,
           branch_tree.branch_path || '/' || child.id::text as branch_path
    from branch child
    join branch_tree on child.parent_id = branch_tree.id
    where child.branch_path is null or child.branch_path = ''
)
update branch b
set branch_path = branch_tree.branch_path,
    updated_at = now()
from branch_tree
where b.id = branch_tree.id
  and (b.branch_path is null or b.branch_path = '');

-- 6. Write a lightweight audit marker so environments can verify this seed update ran.
insert into operation_log (clan_id, actor_id, action_type, target_type, target_id, summary, detail, request_id, client_ip, created_at)
select c.id,
       null,
       'permission_seed_update',
       'clan',
       c.id,
       '权限模型初始化数据已升级',
       'Seeded fine-grained resource:action permissions and backfilled clan_member scope fields.',
       'flyway-v22-permission-model-seed-update-' || c.id,
       '127.0.0.1',
       now()
from clan c
where not exists (
    select 1
    from operation_log l
    where l.clan_id = c.id
      and l.action_type = 'permission_seed_update'
      and l.request_id = 'flyway-v22-permission-model-seed-update-' || c.id
);
