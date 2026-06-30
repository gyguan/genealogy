-- Demo login users and membership bindings.
-- Accounts:
--   demo_admin  / Admin@123456
--   demo_editor / Demo@123456

create table if not exists app_user (
    id bigserial primary key,
    username varchar(100),
    phone varchar(50),
    email varchar(100),
    password_hash varchar(255),
    display_name varchar(100),
    avatar_url varchar(500),
    status varchar(32) default 'active',
    last_login_at timestamp,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    deleted_at timestamp
);
alter table app_user add column if not exists username varchar(100);
alter table app_user add column if not exists phone varchar(50);
alter table app_user add column if not exists email varchar(100);
alter table app_user add column if not exists password_hash varchar(255);
alter table app_user add column if not exists display_name varchar(100);
alter table app_user add column if not exists avatar_url varchar(500);
alter table app_user add column if not exists status varchar(32) default 'active';
alter table app_user add column if not exists last_login_at timestamp;
alter table app_user add column if not exists created_at timestamp default now();
alter table app_user add column if not exists updated_at timestamp default now();
alter table app_user add column if not exists deleted_at timestamp;

create table if not exists app_auth_session (
    id bigserial primary key,
    user_id bigint,
    token_hash varchar(255),
    issued_at timestamp,
    expires_at timestamp,
    revoked_at timestamp,
    client_ip varchar(64),
    user_agent varchar(500)
);
alter table app_auth_session add column if not exists user_id bigint;
alter table app_auth_session add column if not exists token_hash varchar(255);
alter table app_auth_session add column if not exists issued_at timestamp;
alter table app_auth_session add column if not exists expires_at timestamp;
alter table app_auth_session add column if not exists revoked_at timestamp;
alter table app_auth_session add column if not exists client_ip varchar(64);
alter table app_auth_session add column if not exists user_agent varchar(500);

create table if not exists app_role (
    id bigserial primary key,
    role_code varchar(64),
    role_name varchar(100),
    description text,
    system_role boolean default true,
    created_at timestamp default now(),
    updated_at timestamp default now()
);
alter table app_role add column if not exists role_code varchar(64);
alter table app_role add column if not exists role_name varchar(100);
alter table app_role add column if not exists description text;
alter table app_role add column if not exists system_role boolean default true;
alter table app_role add column if not exists created_at timestamp default now();
alter table app_role add column if not exists updated_at timestamp default now();

create table if not exists clan_member (
    id bigserial primary key,
    clan_id bigint,
    user_id bigint,
    branch_id bigint,
    role_id bigint,
    member_name varchar(100),
    member_status varchar(32) default 'active',
    scope_type varchar(32) default 'clan',
    scope_id bigint,
    joined_at timestamp,
    created_at timestamp default now(),
    updated_at timestamp default now()
);
alter table clan_member add column if not exists clan_id bigint;
alter table clan_member add column if not exists user_id bigint;
alter table clan_member add column if not exists branch_id bigint;
alter table clan_member add column if not exists role_id bigint;
alter table clan_member add column if not exists member_name varchar(100);
alter table clan_member add column if not exists member_status varchar(32) default 'active';
alter table clan_member add column if not exists scope_type varchar(32) default 'clan';
alter table clan_member add column if not exists scope_id bigint;
alter table clan_member add column if not exists joined_at timestamp;
alter table clan_member add column if not exists created_at timestamp default now();
alter table clan_member add column if not exists updated_at timestamp default now();

create index if not exists idx_app_user_username on app_user(username);
create index if not exists idx_app_auth_session_token on app_auth_session(token_hash);
create index if not exists idx_app_role_code on app_role(role_code);
create index if not exists idx_clan_member_user_status on clan_member(user_id, member_status);
create index if not exists idx_clan_member_clan_user on clan_member(clan_id, user_id);

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'clan_admin', '宗族管理员', '管理宗族空间、成员权限、主数据和审核配置', true, now(), now()
where not exists (select 1 from app_role where role_code = 'clan_admin');

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'branch_admin', '支派管理员', '维护指定支派的人物、关系和来源资料', true, now(), now()
where not exists (select 1 from app_role where role_code = 'branch_admin');

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'editor', '修谱编辑', '维护人物、关系、来源和修谱资料', true, now(), now()
where not exists (select 1 from app_role where role_code = 'editor');

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'reviewer', '审核员', '负责资料复核、变更审核和定稿确认', true, now(), now()
where not exists (select 1 from app_role where role_code = 'reviewer');

insert into app_user (
    username, phone, email, password_hash, display_name, avatar_url,
    status, created_at, updated_at
)
select
    'demo_admin', null, 'demo_admin@genealogy.local',
    'PBKDF2$120000$Z2VuZWFsb2d5LWFkbWluMQ==$b3LgXPJaGszu+eUFifk0u1gc01G+sy70jxCOlqBbazA=',
    '演示管理员', null, 'active', now(), now()
where not exists (select 1 from app_user where username = 'demo_admin' and deleted_at is null);

insert into app_user (
    username, phone, email, password_hash, display_name, avatar_url,
    status, created_at, updated_at
)
select
    'demo_editor', null, 'demo_editor@genealogy.local',
    'PBKDF2$120000$Z2VuZWFsb2d5LWRlbW8tMQ==$JAo+pyqkFYJLFstlWyONhsMq/i+KEAeBiakqAieAjTU=',
    '演示编辑', null, 'active', now(), now()
where not exists (select 1 from app_user where username = 'demo_editor' and deleted_at is null);

insert into clan_member (
    clan_id, user_id, branch_id, role_id, member_name,
    member_status, scope_type, scope_id, joined_at, created_at, updated_at
)
select c.id, u.id, null, r.id, u.display_name,
       'active', 'clan', c.id, now(), now(), now()
from clan c
join app_user u on u.username = 'demo_admin' and u.deleted_at is null
join app_role r on r.role_code = 'clan_admin'
where c.clan_code in ('DEMO-ZHANG-HUAIYANG', 'DEMO-LI-LONGXI')
  and not exists (
      select 1 from clan_member m
      where m.clan_id = c.id and m.user_id = u.id
  );

insert into clan_member (
    clan_id, user_id, branch_id, role_id, member_name,
    member_status, scope_type, scope_id, joined_at, created_at, updated_at
)
select c.id, u.id, null, r.id, u.display_name,
       'active', 'clan', c.id, now(), now(), now()
from clan c
join app_user u on u.username = 'demo_editor' and u.deleted_at is null
join app_role r on r.role_code = 'editor'
where c.clan_code in ('DEMO-ZHANG-HUAIYANG', 'DEMO-LI-LONGXI')
  and not exists (
      select 1 from clan_member m
      where m.clan_id = c.id and m.user_id = u.id
  );
