-- Permission tables used by member module

create table if not exists app_permission (
    id bigserial primary key,
    permission_code varchar(120) not null unique,
    permission_name varchar(120) not null,
    module_code varchar(64) not null,
    action_code varchar(64) not null,
    description text,
    created_at timestamp,
    updated_at timestamp
);

create table if not exists app_role_permission (
    role_id bigint not null references app_role(id) on delete cascade,
    permission_id bigint not null references app_permission(id) on delete cascade,
    created_at timestamp not null default now(),
    primary key (role_id, permission_id)
);

create index if not exists idx_app_role_permission_role on app_role_permission(role_id);
create index if not exists idx_app_role_permission_permission on app_role_permission(permission_id);

insert into app_permission(permission_code, permission_name, module_code, action_code, description, created_at, updated_at) values
    ('clan:manage', '管理宗族', 'clan', 'manage', '创建和维护宗族基础资料', now(), now()),
    ('branch:manage', '管理支派', 'branch', 'manage', '创建和维护支派资料', now(), now()),
    ('person:write', '维护人物', 'person', 'write', '创建和修改人物档案', now(), now()),
    ('relationship:write', '维护关系', 'relationship', 'write', '创建和修改人物关系', now(), now()),
    ('review:approve', '审核变更', 'review', 'approve', '审核通过或驳回资料变更', now(), now()),
    ('tree:read', '查看世系', 'tree', 'read', '查看授权范围内的世系图', now(), now())
on conflict (permission_code) do nothing;
