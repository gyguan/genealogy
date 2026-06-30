-- Reset demo account passwords for existing local databases.
-- Backend verifier: PBKDF2WithHmacSHA256, 120000 iterations, 256-bit hash.
-- Accounts:
--   demo_admin  / Admin@123456
--   demo_editor / Demo@123456
--   demo_viewer / Viewer@123456

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

insert into app_user (
    username, phone, email, password_hash, display_name, avatar_url,
    status, created_at, updated_at, deleted_at
)
select
    'demo_admin', null, 'demo_admin@genealogy.local',
    'PBKDF2$120000$Z2VuZWFsb2d5LWFkbWluMQ==$b3LgXPJaGszu+eUFifk0u1gc01G+sy70jxCOlqBbazA=',
    '演示管理员', null, 'active', now(), now(), null
where not exists (select 1 from app_user where username = 'demo_admin' and deleted_at is null);

insert into app_user (
    username, phone, email, password_hash, display_name, avatar_url,
    status, created_at, updated_at, deleted_at
)
select
    'demo_editor', null, 'demo_editor@genealogy.local',
    'PBKDF2$120000$Z2VuZWFsb2d5LWRlbW8tMQ==$JAo+pyqkFYJLFstlWyONhsMq/i+KEAeBiakqAieAjTU=',
    '演示编辑', null, 'active', now(), now(), null
where not exists (select 1 from app_user where username = 'demo_editor' and deleted_at is null);

insert into app_user (
    username, phone, email, password_hash, display_name, avatar_url,
    status, created_at, updated_at, deleted_at
)
select
    'demo_viewer', null, 'demo_viewer@genealogy.local',
    'PBKDF2$120000$Z2VuZWFsb2d5LXZpZXdlcg==$WfS44R32Q6Ha47/vAG4ruSU9HDMug+eS0PUUHABE7co=',
    '演示查看者', null, 'active', now(), now(), null
where not exists (select 1 from app_user where username = 'demo_viewer' and deleted_at is null);

update app_user
set password_hash = 'PBKDF2$120000$Z2VuZWFsb2d5LWFkbWluMQ==$b3LgXPJaGszu+eUFifk0u1gc01G+sy70jxCOlqBbazA=',
    status = 'active',
    display_name = coalesce(nullif(display_name, ''), '演示管理员'),
    email = coalesce(email, 'demo_admin@genealogy.local'),
    updated_at = now(),
    deleted_at = null
where username = 'demo_admin';

update app_user
set password_hash = 'PBKDF2$120000$Z2VuZWFsb2d5LWRlbW8tMQ==$JAo+pyqkFYJLFstlWyONhsMq/i+KEAeBiakqAieAjTU=',
    status = 'active',
    display_name = coalesce(nullif(display_name, ''), '演示编辑'),
    email = coalesce(email, 'demo_editor@genealogy.local'),
    updated_at = now(),
    deleted_at = null
where username = 'demo_editor';

update app_user
set password_hash = 'PBKDF2$120000$Z2VuZWFsb2d5LXZpZXdlcg==$WfS44R32Q6Ha47/vAG4ruSU9HDMug+eS0PUUHABE7co=',
    status = 'active',
    display_name = coalesce(nullif(display_name, ''), '演示查看者'),
    email = coalesce(email, 'demo_viewer@genealogy.local'),
    updated_at = now(),
    deleted_at = null
where username = 'demo_viewer';
