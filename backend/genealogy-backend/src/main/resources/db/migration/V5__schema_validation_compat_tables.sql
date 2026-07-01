-- Schema validation compatibility migration.
-- Keep JPA validate green after the migration consolidation.

-- Required by com.genealogy.source.entity.AttachmentEntity.
create table if not exists attachment (
    id bigserial primary key,
    clan_id bigint,
    source_id bigint,
    file_name varchar(255),
    file_type varchar(120),
    file_size bigint,
    storage_path varchar(1000),
    thumbnail_path varchar(1000),
    checksum varchar(128),
    uploaded_by bigint,
    uploaded_at timestamp,
    access_level varchar(32)
);

create index if not exists idx_attachment_clan on attachment(clan_id);
create index if not exists idx_attachment_source on attachment(source_id);

-- Legacy compatibility tables retained because earlier MVP code used these names before app_user/app_role/clan_member.
create table if not exists user_account (
    id bigserial primary key,
    username varchar(100),
    phone varchar(50),
    email varchar(100),
    display_name varchar(100),
    password_hash varchar(255),
    status varchar(32) default 'active',
    created_at timestamp default now(),
    last_login_at timestamp
);

create table if not exists role (
    id bigserial primary key,
    role_code varchar(64),
    role_name varchar(100),
    description varchar(255)
);

create table if not exists member_role (
    id bigserial primary key,
    member_id bigint,
    role_id bigint,
    scope_type varchar(32) default 'clan',
    scope_id bigint,
    created_at timestamp default now()
);

create index if not exists idx_user_account_username on user_account(username);
create index if not exists idx_role_code on role(role_code);
create index if not exists idx_member_role_member on member_role(member_id);
create index if not exists idx_member_role_role on member_role(role_id);
