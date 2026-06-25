-- Auth, clan membership, roles, and permission foundation

create table app_user (
    id bigserial primary key,
    username varchar(80) not null unique,
    phone varchar(30) unique,
    email varchar(120) unique,
    password_hash varchar(255) not null,
    display_name varchar(120) not null,
    avatar_url varchar(500),
    status varchar(32) not null default 'active',
    last_login_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp,
    constraint chk_app_user_contact check (phone is not null or email is not null)
);

create table app_role (
    id bigserial primary key,
    role_code varchar(64) not null unique,
    role_name varchar(120) not null,
    description text,
    system_role boolean not null default false,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table app_permission (
    id bigserial primary key,
    permission_code varchar(120) not null unique,
    permission_name varchar(120) not null,
    module_code varchar(64) not null,
    action_code varchar(64) not null,
    description text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table app_role_permission (
    role_id bigint not null references app_role(id) on delete cascade,
    permission_id bigint not null references app_permission(id) on delete cascade,
    created_at timestamp not null default now(),
    primary key (role_id, permission_id)
);

create table clan_member (
    id bigserial primary key,
    clan_id bigint not null references clan(id) on delete cascade,
    user_id bigint not null references app_user(id) on delete cascade,
    branch_id bigint references branch(id),
    role_id bigint not null references app_role(id),
    member_name varchar(120) not null,
    member_status varchar(32) not null default 'active',
    scope_type varchar(32) not null default 'clan',
    scope_id bigint,
    joined_at timestamp not null default now(),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (clan_id, user_id)
);

create index idx_app_role_permission_role on app_role_permission(role_id);
create index idx_app_role_permission_permission on app_role_permission(permission_id);
create index idx_clan_member_clan on clan_member(clan_id);
create index idx_clan_member_user on clan_member(user_id);
create index idx_clan_member_branch on clan_member(branch_id);

insert into app_role(role_code, role_name, description, system_role) values
    ('clan_admin', '宗族管理员', '管理宗族资料、成员和审核流程', true),
    ('branch_editor', '支派编辑', '维护指定支派的人物、关系和来源资料', true),
    ('reviewer', '审核员', '审核族谱资料变更', true),
    ('viewer', '查看者', '查看授权范围内的族谱资料', true);

insert into app_permission(permission_code, permission_name, module_code, action_code, description) values
    ('clan:manage', '管理宗族', 'clan', 'manage', '创建和维护宗族基础资料'),
    ('branch:manage', '管理支派', 'branch', 'manage', '创建和维护支派资料'),
    ('person:write', '维护人物', 'person', 'write', '创建和修改人物档案'),
    ('relationship:write', '维护关系', 'relationship', 'write', '创建和修改人物关系'),
    ('review:approve', '审核变更', 'review', 'approve', '审核通过或驳回资料变更'),
    ('tree:read', '查看世系', 'tree', 'read', '查看授权范围内的世系图');

insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on
    (r.role_code = 'clan_admin')
    or (r.role_code = 'branch_editor' and p.permission_code in ('person:write', 'relationship:write', 'tree:read'))
    or (r.role_code = 'reviewer' and p.permission_code in ('review:approve', 'tree:read'))
    or (r.role_code = 'viewer' and p.permission_code = 'tree:read');
