-- Permission model seed update after P0 permission management rollout.
--
-- Goals:
-- 1. Keep old V2/V3 seed data compatible with the new runtime permission model.
-- 2. Seed fine-grained resource:action permissions for future UI display / custom role extension.
-- 3. Rebuild app_role_permission using the same baseline role semantics as AuthorizationApplicationService.
-- 4. Backfill clan_member scope fields so existing demo/legacy members can pass branch-scope checks.

-- 1. Ensure all runtime roles exist.
insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
values
    ('cross_clan_admin', '跨宗族管理员', '跨宗族运维和审计角色，可访问全部宗族空间；仅用于平台治理和紧急运维', true, now(), now()),
    ('clan_admin', '宗族管理员', '管理本宗族空间、成员授权、支派、人物、关系、来源、审核和导出', true, now(), now()),
    ('branch_admin', '支派管理员', '管理授权支派及下级支派范围内的人物、关系、来源和支派数据', true, now(), now()),
    ('editor', '修谱编辑', '维护授权范围内的人物档案、世系关系、来源证据并提交审核', true, now(), now()),
    ('reviewer', '审核员', '查看待审内容，执行通过或驳回，不维护基础业务数据', true, now(), now()),
    ('viewer', '查看者', '仅可查看授权范围内的宗族、人物、关系和来源摘要', true, now(), now())
on conflict (role_code) do update
set role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();

-- 2. Seed fine-grained permissions. Keep old V3 permissions for backward compatibility, but make new permissions authoritative.
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
values
    ('clan:view', '查看宗族', 'business', 'clan', 'view', 'clan', 'view', 'clan', 'business', true, 101, '查看宗族空间、宗族首页和基础信息', true, now(), now()),
    ('clan:update', '更新宗族', 'business', 'clan', 'update', 'clan', 'update', 'clan', 'business', true, 102, '更新宗族基础信息、堂号、郡望和祖籍', true, now(), now()),
    ('clan:manage_settings', '管理宗族配置', 'business', 'clan', 'manage_settings', 'clan', 'manage_settings', 'clan', 'business', true, 103, '管理宗族配置和系统设置', true, now(), now()),
    ('clan:delete', '删除宗族', 'business', 'clan', 'delete', 'clan', 'delete', 'clan', 'business', true, 104, '删除空宗族空间', true, now(), now()),

    ('member:invite', '邀请成员', 'system', 'member', 'invite', 'member', 'invite', 'member', 'system', true, 201, '邀请用户加入宗族并授予角色', true, now(), now()),
    ('member:update_role', '调整成员角色', 'system', 'member', 'update_role', 'member', 'update_role', 'member', 'system', true, 202, '调整成员角色、状态和授权范围', true, now(), now()),
    ('member:disable', '禁用成员', 'system', 'member', 'disable', 'member', 'disable', 'member', 'system', true, 203, '禁用宗族成员访问权限', true, now(), now()),
    ('member:transfer_owner', '转让宗族所有者', 'system', 'member', 'transfer_owner', 'member', 'transfer_owner', 'member', 'system', true, 204, '转让宗族创建人或所有者权限', true, now(), now()),

    ('branch:view', '查看支派', 'business', 'branch', 'view', 'branch', 'view', 'branch', 'business', true, 301, '查看支派、房支和迁徙信息', true, now(), now()),
    ('branch:create', '新增支派', 'business', 'branch', 'create', 'branch', 'create', 'branch', 'business', true, 302, '新增支派或下级支派', true, now(), now()),
    ('branch:update', '更新支派', 'business', 'branch', 'update', 'branch', 'update', 'branch', 'business', true, 303, '更新支派名称、负责人、迁徙和排序信息', true, now(), now()),
    ('branch:delete', '删除支派', 'business', 'branch', 'delete', 'branch', 'delete', 'branch', 'business', true, 304, '删除无下级的支派', true, now(), now()),

    ('person:view', '查看人物', 'business', 'person', 'view', 'person', 'view', 'person', 'business', true, 401, '查看人物档案和世系图谱', true, now(), now()),
    ('person:create', '新增人物', 'business', 'person', 'create', 'person', 'create', 'person', 'business', true, 402, '新增人物档案', true, now(), now()),
    ('person:update', '更新人物', 'business', 'person', 'update', 'person', 'update', 'person', 'business', true, 403, '更新人物档案', true, now(), now()),
    ('person:delete', '删除人物', 'business', 'person', 'delete', 'person', 'delete', 'person', 'business', true, 404, '软删除人物档案', true, now(), now()),
    ('person:submit_review', '提交人物审核', 'business', 'person', 'submit_review', 'person', 'submit_review', 'person', 'business', true, 405, '提交人物入谱或变更审核', true, now(), now()),

    ('relationship:view', '查看关系', 'business', 'relationship', 'view', 'relationship', 'view', 'relationship', 'business', true, 501, '查看亲属关系和世系关系', true, now(), now()),
    ('relationship:create', '新增关系', 'business', 'relationship', 'create', 'relationship', 'create', 'relationship', 'business', true, 502, '新增亲属关系', true, now(), now()),
    ('relationship:update', '更新关系', 'business', 'relationship', 'update', 'relationship', 'update', 'relationship', 'business', true, 503, '更新亲属关系', true, now(), now()),
    ('relationship:delete', '删除关系', 'business', 'relationship', 'delete', 'relationship', 'delete', 'relationship', 'business', true, 504, '删除亲属关系', true, now(), now()),
    ('relationship:check_conflict', '关系冲突检查', 'business', 'relationship', 'check_conflict', 'relationship', 'check_conflict', 'relationship', 'business', true, 505, '检查亲属关系是否存在冲突', true, now(), now()),
    ('relationship:submit_review', '提交关系审核', 'business', 'relationship', 'submit_review', 'relationship', 'submit_review', 'relationship', 'business', true, 506, '提交关系变更审核', true, now(), now()),

    ('source:view', '查看来源', 'business', 'source', 'view', 'source', 'view', 'source', 'business', true, 601, '查看来源资料和证据绑定', true, now(), now()),
    ('source:create', '新增来源', 'business', 'source', 'create', 'source', 'create', 'source', 'business', true, 602, '新增来源资料', true, now(), now()),
    ('source:update', '更新来源', 'business', 'source', 'update', 'source', 'update', 'source', 'business', true, 603, '更新来源资料', true, now(), now()),
    ('source:delete', '删除来源', 'business', 'source', 'delete', 'source', 'delete', 'source', 'business', true, 604, '删除未绑定的来源资料', true, now(), now()),
    ('source:bind', '绑定来源', 'business', 'source', 'bind', 'source', 'bind', 'source', 'business', true, 605, '将来源绑定到人物、关系、支派或宗族', true, now(), now()),

    ('attachment:view', '查看附件', 'business', 'attachment', 'view', 'attachment', 'view', 'attachment', 'business', true, 701, '查看附件元数据', true, now(), now()),
    ('attachment:upload', '上传附件', 'business', 'attachment', 'upload', 'attachment', 'upload', 'attachment', 'business', true, 702, '上传来源附件', true, now(), now()),
    ('attachment:preview', '预览附件', 'business', 'attachment', 'preview', 'attachment', 'preview', 'attachment', 'business', true, 703, '预览来源附件', true, now(), now()),
    ('attachment:download', '下载附件', 'business', 'attachment', 'download', 'attachment', 'download', 'attachment', 'business', true, 704, '下载来源附件', true, now(), now()),
    ('attachment:delete', '删除附件', 'business', 'attachment', 'delete', 'attachment', 'delete', 'attachment', 'business', true, 705, '删除来源附件', true, now(), now()),

    ('review_task:view', '查看审核任务', 'business', 'review_task', 'view', 'review_task', 'view', 'review_task', 'business', true, 801, '查看待审任务、审核详情和审核记录', true, now(), now()),
    ('review_task:approve', '审核通过', 'business', 'review_task', 'approve', 'review_task', 'approve', 'review_task', 'business', true, 802, '执行审核通过', true, now(), now()),
    ('review_task:reject', '审核驳回', 'business', 'review_task', 'reject', 'review_task', 'reject', 'review_task', 'business', true, 803, '执行审核驳回', true, now(), now()),
    ('review_task:assign', '分配审核任务', 'business', 'review_task', 'assign', 'review_task', 'assign', 'review_task', 'business', true, 804, '分配或改派审核任务', true, now(), now()),

    ('export_task:create', '创建导出任务', 'business', 'export_task', 'create', 'export_task', 'create', 'export_task', 'business', true, 901, '创建导出任务', true, now(), now()),
    ('export_task:approve', '审批导出任务', 'business', 'export_task', 'approve', 'export_task', 'approve', 'export_task', 'business', true, 902, '审批大规模导出任务', true, now(), now()),
    ('export_task:download', '下载导出文件', 'business', 'export_task', 'download', 'export_task', 'download', 'export_task', 'business', true, 903, '下载 CSV 或谱书导出文件', true, now(), now()),

    ('operation_log:view', '查看操作日志', 'system', 'operation_log', 'view', 'operation_log', 'view', 'operation_log', 'system', true, 1001, '查看操作日志和审计追踪', true, now(), now()),
    ('operation_log:export', '导出操作日志', 'system', 'operation_log', 'export', 'operation_log', 'export', 'operation_log', 'system', true, 1002, '导出操作日志和审计报表', true, now(), now())
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
    'clan:view',
    'branch:view', 'branch:create', 'branch:update',
    'person:view', 'person:create', 'person:update', 'person:submit_review',
    'relationship:view', 'relationship:create', 'relationship:update', 'relationship:check_conflict', 'relationship:submit_review',
    'source:view', 'source:create', 'source:update', 'source:bind',
    'attachment:view', 'attachment:upload', 'attachment:preview', 'attachment:download',
    'review_task:view',
    'export_task:create'
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
-- Clan-wide roles should use clan scope.
update clan_member cm
set scope_type = 'clan',
    scope_id = cm.clan_id,
    updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code in ('cross_clan_admin', 'clan_admin', 'reviewer', 'viewer')
  and (cm.scope_type is null or cm.scope_type <> 'clan' or cm.scope_id is distinct from cm.clan_id);

-- Branch admins manage the current branch and its children in the new model.
update clan_member cm
set scope_type = 'branch_subtree',
    scope_id = coalesce(cm.scope_id, cm.branch_id),
    updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code = 'branch_admin'
  and coalesce(cm.scope_id, cm.branch_id) is not null
  and (cm.scope_type is null or cm.scope_type <> 'branch_subtree' or cm.scope_id is distinct from coalesce(cm.scope_id, cm.branch_id));

-- Editors remain limited to their current branch unless explicitly changed by an admin.
update clan_member cm
set scope_type = 'branch',
    scope_id = coalesce(cm.scope_id, cm.branch_id),
    updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code = 'editor'
  and coalesce(cm.scope_id, cm.branch_id) is not null
  and (cm.scope_type is null or cm.scope_type not in ('branch', 'branch_subtree') or cm.scope_id is distinct from coalesce(cm.scope_id, cm.branch_id));

-- Guardrail: if a branch-scoped member has branch_id but no scope_id, make scope_id explicit.
update clan_member
set scope_id = branch_id,
    updated_at = now()
where scope_type in ('branch', 'branch_subtree')
  and scope_id is null
  and branch_id is not null;

-- Guardrail: if a clan-scoped member has no scope_id, point it to the clan.
update clan_member
set scope_id = clan_id,
    updated_at = now()
where scope_type = 'clan'
  and scope_id is null;

-- 5. Ensure branch_path is usable by subtree scope checks for legacy rows.
-- Existing V2 seed branches use a non-empty branch_path. This only fills missing paths for simple/root legacy branches.
update branch
set branch_path = id::text,
    updated_at = now()
where (branch_path is null or branch_path = '')
  and parent_id is null;

with recursive branch_tree as (
    select id, clan_id, parent_id, branch_path
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
       'flyway-v6-permission-model-seed-update-' || c.id,
       '127.0.0.1',
       now()
from clan c
where not exists (
    select 1
    from operation_log l
    where l.clan_id = c.id
      and l.action_type = 'permission_seed_update'
      and l.request_id = 'flyway-v6-permission-model-seed-update-' || c.id
);
