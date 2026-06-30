-- User and role management support.
-- Adds explicit viewer role and compatible user/member columns for older local schemas.

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

alter table clan_member add column if not exists role_id bigint;
alter table clan_member add column if not exists member_status varchar(32) default 'active';
alter table clan_member add column if not exists scope_type varchar(32) default 'clan';
alter table clan_member add column if not exists updated_at timestamp default now();

create index if not exists idx_app_user_username_deleted on app_user(username, deleted_at);
create index if not exists idx_app_role_code on app_role(role_code);
create index if not exists idx_clan_member_role on clan_member(role_id);

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'clan_admin', '宗族管理员', '管理宗族空间、用户角色、主数据、审核和全部业务配置', true, now(), now()
where not exists (select 1 from app_role where role_code = 'clan_admin');

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'branch_admin', '支派管理员', '管理授权支派范围内的人物、关系、来源和支派数据', true, now(), now()
where not exists (select 1 from app_role where role_code = 'branch_admin');

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'editor', '修谱编辑', '维护人物档案、世系关系、来源证据和修谱资料', true, now(), now()
where not exists (select 1 from app_role where role_code = 'editor');

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'reviewer', '审核员', '复核人物、关系、来源和入谱变更', true, now(), now()
where not exists (select 1 from app_role where role_code = 'reviewer');

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
select 'viewer', '查看者', '仅可查看宗族、人物档案、世系图谱和来源资料，不允许新增、修改、审核和删除', true, now(), now()
where not exists (select 1 from app_role where role_code = 'viewer');

insert into app_user (
    username, phone, email, password_hash, display_name, avatar_url,
    status, created_at, updated_at
)
select
    'demo_viewer', null, 'demo_viewer@genealogy.local',
    'PBKDF2$120000$Z2VuZWFsb2d5LXZpZXdlcg==$dH/IE6TnTYX9KB7RjfwMOW+OUwLx5ByNbeSVF0PaVdc=',
    '演示查看者', null, 'active', now(), now()
where not exists (select 1 from app_user where username = 'demo_viewer' and deleted_at is null);

insert into clan_member (
    clan_id, user_id, branch_id, role_id, member_name,
    member_status, scope_type, scope_id, joined_at, created_at, updated_at
)
select c.id, u.id, null, r.id, u.display_name,
       'active', 'clan', c.id, now(), now(), now()
from clan c
join app_user u on u.username = 'demo_viewer' and u.deleted_at is null
join app_role r on r.role_code = 'viewer'
where c.clan_code in ('DEMO-ZHANG-HUAIYANG', 'DEMO-LI-LONGXI')
  and not exists (
      select 1 from clan_member m
      where m.clan_id = c.id and m.user_id = u.id
  );
