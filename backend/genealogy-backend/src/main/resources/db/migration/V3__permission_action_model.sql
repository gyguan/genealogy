-- Permission action model for Chinese genealogy MVP permission management.
-- The runtime keeps an in-memory P0 permission map for safe local startup; this script persists the same model for governance, audit and future custom-role expansion.

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
values
    ('cross_clan_admin', '跨宗族管理员', '平台级治理角色，可跨宗族处理运维、审计和紧急治理事项', true, now(), now())
on conflict (role_code) do update
set role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();

create table if not exists permission (
    id bigserial primary key,
    permission_code varchar(100) not null unique,
    resource_code varchar(64) not null,
    action_code varchar(64) not null,
    permission_name varchar(120) not null,
    description text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists role_permission (
    role_id bigint not null references app_role(id) on delete cascade,
    permission_id bigint not null references permission(id) on delete cascade,
    created_at timestamp not null default now(),
    primary key (role_id, permission_id)
);

create index if not exists idx_permission_resource_action on permission(resource_code, action_code);
create index if not exists idx_role_permission_permission on role_permission(permission_id);

insert into permission (permission_code, resource_code, action_code, permission_name, description, created_at, updated_at)
values
    ('clan:view', 'clan', 'view', '查看宗族', '查看授权宗族空间的基本信息', now(), now()),
    ('clan:update', 'clan', 'update', '维护宗族', '维护宗族名称、堂号、祖籍等主数据', now(), now()),
    ('clan:manage_settings', 'clan', 'manage_settings', '管理宗族配置', '维护宗族级配置、隐私和治理规则', now(), now()),
    ('clan:delete', 'clan', 'delete', '删除宗族', '删除空宗族空间，高风险操作', now(), now()),
    ('member:invite', 'member', 'invite', '邀请成员', '为宗族新增成员授权', now(), now()),
    ('member:update_role', 'member', 'update_role', '调整成员角色', '调整成员角色、范围和状态', now(), now()),
    ('member:disable', 'member', 'disable', '禁用成员', '禁用宗族成员访问资格', now(), now()),
    ('member:transfer_owner', 'member', 'transfer_owner', '转让创建人', '转让宗族创建人或最高治理权限', now(), now()),
    ('branch:view', 'branch', 'view', '查看支派', '查看授权范围内支派', now(), now()),
    ('branch:create', 'branch', 'create', '创建支派', '在授权宗族或支派范围内创建支派', now(), now()),
    ('branch:update', 'branch', 'update', '维护支派', '维护支派名称、父支派和简介', now(), now()),
    ('branch:delete', 'branch', 'delete', '删除支派', '删除支派，高风险操作', now(), now()),
    ('person:view', 'person', 'view', '查看人物', '查看授权范围内人物档案', now(), now()),
    ('person:create', 'person', 'create', '录入人物', '新增草稿人物档案', now(), now()),
    ('person:update', 'person', 'update', '维护人物', '更新人物档案，正式数据需审核', now(), now()),
    ('person:delete', 'person', 'delete', '删除人物', '删除或软删除人物，高风险操作', now(), now()),
    ('person:submit_review', 'person', 'submit_review', '提交人物审核', '将人物变更提交入谱审核', now(), now()),
    ('relationship:view', 'relationship', 'view', '查看关系', '查看亲属和世系关系', now(), now()),
    ('relationship:create', 'relationship', 'create', '建立关系', '建立父母、配偶、子女等关系', now(), now()),
    ('relationship:update', 'relationship', 'update', '维护关系', '更新亲属关系说明和状态', now(), now()),
    ('relationship:delete', 'relationship', 'delete', '删除关系', '删除世系关系，高风险操作', now(), now()),
    ('relationship:check_conflict', 'relationship', 'check_conflict', '关系冲突检查', '执行关系一致性和冲突检查', now(), now()),
    ('relationship:submit_review', 'relationship', 'submit_review', '提交关系审核', '将关系变更提交入谱审核', now(), now()),
    ('source:view', 'source', 'view', '查看来源', '查看来源摘要和证据信息', now(), now()),
    ('source:create', 'source', 'create', '创建来源', '新增族谱原文、口述、墓碑等来源', now(), now()),
    ('source:update', 'source', 'update', '维护来源', '维护来源元数据和摘要', now(), now()),
    ('source:delete', 'source', 'delete', '删除来源', '删除来源资料，高风险操作', now(), now()),
    ('source:bind', 'source', 'bind', '绑定来源', '将来源绑定到人物、关系、支派或宗族', now(), now()),
    ('attachment:view', 'attachment', 'view', '查看附件', '查看附件元数据', now(), now()),
    ('attachment:upload', 'attachment', 'upload', '上传附件', '上传来源附件', now(), now()),
    ('attachment:preview', 'attachment', 'preview', '预览附件', '在线预览授权附件', now(), now()),
    ('attachment:download', 'attachment', 'download', '下载附件', '下载授权附件，敏感附件需额外控制', now(), now()),
    ('attachment:delete', 'attachment', 'delete', '删除附件', '删除来源附件，高风险操作', now(), now()),
    ('review_task:view', 'review_task', 'view', '查看审核', '查看待审核和审核记录', now(), now()),
    ('review_task:approve', 'review_task', 'approve', '审核通过', '通过入谱审核任务', now(), now()),
    ('review_task:reject', 'review_task', 'reject', '审核驳回', '驳回入谱审核任务', now(), now()),
    ('review_task:assign', 'review_task', 'assign', '分派审核', '分派审核任务给审核员', now(), now()),
    ('export_task:create', 'export_task', 'create', '创建导出', '创建族谱导出任务', now(), now()),
    ('export_task:approve', 'export_task', 'approve', '审批导出', '审批大规模导出任务', now(), now()),
    ('export_task:download', 'export_task', 'download', '下载导出', '下载导出制品', now(), now()),
    ('operation_log:view', 'operation_log', 'view', '查看日志', '查看权限、审核、导出和敏感操作日志', now(), now()),
    ('operation_log:export', 'operation_log', 'export', '导出日志', '导出审计日志', now(), now())
on conflict (permission_code) do update
set resource_code = excluded.resource_code,
    action_code = excluded.action_code,
    permission_name = excluded.permission_name,
    description = excluded.description,
    updated_at = now();

-- Clan admin owns all MVP permissions.
insert into role_permission (role_id, permission_id)
select role.id, permission.id
from app_role role
join permission on true
where role.role_code in ('clan_admin', 'cross_clan_admin')
on conflict do nothing;

-- Branch admin manages authorized branch subtree, but cannot delete high-risk resources or approve reviews.
insert into role_permission (role_id, permission_id)
select role.id, permission.id
from app_role role
join permission on permission.permission_code = any(array[
    'clan:view',
    'branch:view', 'branch:create', 'branch:update',
    'person:view', 'person:create', 'person:update', 'person:submit_review',
    'relationship:view', 'relationship:create', 'relationship:update', 'relationship:check_conflict', 'relationship:submit_review',
    'source:view', 'source:create', 'source:update', 'source:bind',
    'attachment:view', 'attachment:upload', 'attachment:preview', 'attachment:download',
    'review_task:view',
    'export_task:create'
])
where role.role_code = 'branch_admin'
on conflict do nothing;

-- Editor can maintain data and submit reviews in authorized scope, but cannot delete/approve/export governance artifacts.
insert into role_permission (role_id, permission_id)
select role.id, permission.id
from app_role role
join permission on permission.permission_code = any(array[
    'clan:view', 'branch:view',
    'person:view', 'person:create', 'person:update', 'person:submit_review',
    'relationship:view', 'relationship:create', 'relationship:update', 'relationship:check_conflict', 'relationship:submit_review',
    'source:view', 'source:create', 'source:update', 'source:bind',
    'attachment:view', 'attachment:upload', 'attachment:preview', 'attachment:download',
    'review_task:view'
])
where role.role_code = 'editor'
on conflict do nothing;

-- Reviewer can read relevant content and process review tasks.
insert into role_permission (role_id, permission_id)
select role.id, permission.id
from app_role role
join permission on permission.permission_code = any(array[
    'clan:view', 'branch:view', 'person:view', 'relationship:view', 'source:view',
    'attachment:view', 'attachment:preview',
    'review_task:view', 'review_task:approve', 'review_task:reject'
])
where role.role_code = 'reviewer'
on conflict do nothing;

-- Viewer is read-only and cannot download sensitive attachments by default.
insert into role_permission (role_id, permission_id)
select role.id, permission.id
from app_role role
join permission on permission.permission_code = any(array[
    'clan:view', 'branch:view', 'person:view', 'relationship:view', 'source:view',
    'attachment:view', 'attachment:preview'
])
where role.role_code = 'viewer'
on conflict do nothing;
