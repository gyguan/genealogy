-- Permission schema compatibility migration.
-- This fixes Hibernate validation when permission entities are present in the backend code.

create table if not exists app_permission (
    id bigserial primary key,
    permission_code varchar(100) not null unique,
    permission_name varchar(100) not null,
    permission_type varchar(50),
    resource_type varchar(100),
    action_type varchar(100),
    description text,
    system_permission boolean not null default true,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists app_role_permission (
    id bigserial primary key,
    role_id bigint not null references app_role(id),
    permission_id bigint not null references app_permission(id),
    created_at timestamp not null default now(),
    unique (role_id, permission_id)
);

create index if not exists idx_app_permission_code on app_permission(permission_code);
create index if not exists idx_app_permission_resource_action on app_permission(resource_type, action_type);
create index if not exists idx_app_role_permission_role on app_role_permission(role_id);
create index if not exists idx_app_role_permission_permission on app_role_permission(permission_id);

insert into app_permission (permission_code, permission_name, permission_type, resource_type, action_type, description, system_permission, created_at, updated_at)
values
    ('clan:view', '查看宗族', 'business', 'clan', 'view', '查看宗族空间、宗族首页和基础信息', true, now(), now()),
    ('clan:manage', '管理宗族', 'business', 'clan', 'manage', '维护宗族主数据、堂号、郡望、祖籍和状态', true, now(), now()),
    ('branch:view', '查看支派', 'business', 'branch', 'view', '查看支派、房支和迁徙信息', true, now(), now()),
    ('branch:manage', '管理支派', 'business', 'branch', 'manage', '维护支派、负责人和支派范围', true, now(), now()),
    ('person:view', '查看人物', 'business', 'person', 'view', '查看人物档案和世系图谱', true, now(), now()),
    ('person:manage', '管理人物', 'business', 'person', 'manage', '新增、编辑、删除和导入人物档案', true, now(), now()),
    ('relationship:view', '查看关系', 'business', 'relationship', 'view', '查看亲属关系和世系关系', true, now(), now()),
    ('relationship:manage', '管理关系', 'business', 'relationship', 'manage', '新增、编辑、删除和校验亲属关系', true, now(), now()),
    ('source:view', '查看来源', 'business', 'source', 'view', '查看来源资料和证据绑定', true, now(), now()),
    ('source:manage', '管理来源', 'business', 'source', 'manage', '维护来源资料、附件和证据绑定', true, now(), now()),
    ('review:view', '查看审核', 'business', 'review', 'view', '查看审核任务、审核记录和字段Diff', true, now(), now()),
    ('review:approve', '审核通过驳回', 'business', 'review', 'approve', '执行审核通过、驳回和复核操作', true, now(), now()),
    ('member:view', '查看成员', 'system', 'member', 'view', '查看宗族成员和角色', true, now(), now()),
    ('member:manage', '管理成员', 'system', 'member', 'manage', '维护用户、角色和成员授权', true, now(), now()),
    ('log:view', '查看日志', 'system', 'log', 'view', '查看操作日志和审计追踪', true, now(), now())
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    permission_type = excluded.permission_type,
    resource_type = excluded.resource_type,
    action_type = excluded.action_type,
    description = excluded.description,
    system_permission = excluded.system_permission,
    updated_at = now();

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in (
    'clan:view', 'clan:manage', 'branch:view', 'branch:manage', 'person:view', 'person:manage',
    'relationship:view', 'relationship:manage', 'source:view', 'source:manage', 'review:view', 'review:approve',
    'member:view', 'member:manage', 'log:view'
)
where r.role_code = 'clan_admin'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in (
    'clan:view', 'branch:view', 'branch:manage', 'person:view', 'person:manage',
    'relationship:view', 'relationship:manage', 'source:view', 'source:manage', 'review:view', 'log:view'
)
where r.role_code = 'branch_admin'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in (
    'clan:view', 'branch:view', 'person:view', 'person:manage', 'relationship:view', 'relationship:manage',
    'source:view', 'source:manage', 'review:view', 'log:view'
)
where r.role_code = 'editor'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in ('clan:view', 'branch:view', 'person:view', 'relationship:view', 'source:view', 'review:view', 'review:approve', 'log:view')
where r.role_code = 'reviewer'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission (role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on p.permission_code in ('clan:view', 'branch:view', 'person:view', 'relationship:view', 'source:view')
where r.role_code = 'viewer'
on conflict (role_id, permission_id) do nothing;
