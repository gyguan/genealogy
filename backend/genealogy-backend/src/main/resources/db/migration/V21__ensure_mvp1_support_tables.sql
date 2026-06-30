-- Ensure MVP1 support tables exist for clean local demo databases.
-- Idempotent and compatible with partially-created old local schemas.

create table if not exists revision (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    target_type varchar(50) not null,
    target_id bigint,
    change_type varchar(32) not null,
    before_data jsonb,
    after_data jsonb,
    diff_summary text,
    submitter_id bigint,
    submit_time timestamp not null default now(),
    status varchar(32) not null default 'draft',
    approved_at timestamp,
    rejected_reason text
);
alter table revision add column if not exists clan_id bigint;
alter table revision add column if not exists target_type varchar(50);
alter table revision add column if not exists target_id bigint;
alter table revision add column if not exists change_type varchar(32);
alter table revision add column if not exists before_data jsonb;
alter table revision add column if not exists after_data jsonb;
alter table revision add column if not exists diff_summary text;
alter table revision add column if not exists submitter_id bigint;
alter table revision add column if not exists submit_time timestamp default now();
alter table revision add column if not exists status varchar(32) default 'draft';
alter table revision add column if not exists approved_at timestamp;
alter table revision add column if not exists rejected_reason text;

create table if not exists review_task (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    revision_id bigint not null references revision(id),
    review_level int not null default 1,
    reviewer_id bigint,
    reviewer_role varchar(50),
    branch_id bigint,
    status varchar(32) not null default 'pending',
    review_comment text,
    reviewed_at timestamp,
    created_at timestamp not null default now()
);
alter table review_task add column if not exists clan_id bigint;
alter table review_task add column if not exists revision_id bigint;
alter table review_task add column if not exists review_level int default 1;
alter table review_task add column if not exists reviewer_id bigint;
alter table review_task add column if not exists reviewer_role varchar(50);
alter table review_task add column if not exists branch_id bigint;
alter table review_task add column if not exists status varchar(32) default 'pending';
alter table review_task add column if not exists review_comment text;
alter table review_task add column if not exists reviewed_at timestamp;
alter table review_task add column if not exists created_at timestamp default now();

create table if not exists user_account (
    id bigserial primary key,
    username varchar(100),
    phone varchar(50),
    email varchar(100),
    display_name varchar(100),
    password_hash varchar(255),
    status varchar(32) not null default 'active',
    created_at timestamp not null default now(),
    last_login_at timestamp
);
alter table user_account add column if not exists username varchar(100);
alter table user_account add column if not exists phone varchar(50);
alter table user_account add column if not exists email varchar(100);
alter table user_account add column if not exists display_name varchar(100);
alter table user_account add column if not exists password_hash varchar(255);
alter table user_account add column if not exists status varchar(32) default 'active';
alter table user_account add column if not exists created_at timestamp default now();
alter table user_account add column if not exists last_login_at timestamp;

create table if not exists clan_member (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    user_id bigint references user_account(id),
    person_id bigint references person(id),
    branch_id bigint references branch(id),
    member_name varchar(100),
    join_status varchar(32) not null default 'invited',
    invited_by bigint,
    joined_at timestamp,
    created_at timestamp not null default now()
);
alter table clan_member add column if not exists clan_id bigint;
alter table clan_member add column if not exists user_id bigint;
alter table clan_member add column if not exists person_id bigint;
alter table clan_member add column if not exists branch_id bigint;
alter table clan_member add column if not exists member_name varchar(100);
alter table clan_member add column if not exists join_status varchar(32) default 'invited';
alter table clan_member add column if not exists invited_by bigint;
alter table clan_member add column if not exists joined_at timestamp;
alter table clan_member add column if not exists created_at timestamp default now();

create table if not exists role (
    id bigserial primary key,
    role_code varchar(64),
    role_name varchar(100),
    description varchar(255)
);
alter table role add column if not exists role_code varchar(64);
alter table role add column if not exists role_name varchar(100);
alter table role add column if not exists description varchar(255);

create table if not exists member_role (
    id bigserial primary key,
    member_id bigint references clan_member(id),
    role_id bigint references role(id),
    scope_type varchar(32) not null default 'clan',
    scope_id bigint,
    created_at timestamp not null default now()
);
alter table member_role add column if not exists member_id bigint;
alter table member_role add column if not exists role_id bigint;
alter table member_role add column if not exists scope_type varchar(32) default 'clan';
alter table member_role add column if not exists scope_id bigint;
alter table member_role add column if not exists created_at timestamp default now();

do $$
begin
    if exists (select 1 from information_schema.columns where table_name = 'revision' and column_name = 'clan_id') then
        execute 'alter table revision alter column clan_id drop not null';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'revision' and column_name = 'target_type') then
        execute 'alter table revision alter column target_type drop not null';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'revision' and column_name = 'change_type') then
        execute 'alter table revision alter column change_type drop not null';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'review_task' and column_name = 'clan_id') then
        execute 'alter table review_task alter column clan_id drop not null';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'review_task' and column_name = 'revision_id') then
        execute 'alter table review_task alter column revision_id drop not null';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'role' and column_name = 'role_code') then
        execute 'alter table role alter column role_code drop not null';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'role' and column_name = 'role_name') then
        execute 'alter table role alter column role_name drop not null';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'member_role' and column_name = 'member_id') then
        execute 'alter table member_role alter column member_id drop not null';
    end if;
    if exists (select 1 from information_schema.columns where table_name = 'member_role' and column_name = 'role_id') then
        execute 'alter table member_role alter column role_id drop not null';
    end if;
end $$;

create index if not exists idx_revision_target on revision(target_type, target_id);
create index if not exists idx_review_task_reviewer on review_task(reviewer_id, status);
create index if not exists idx_clan_member_clan on clan_member(clan_id);
create index if not exists idx_member_role_member on member_role(member_id);
create index if not exists idx_role_code on role(role_code);

insert into role (role_code, role_name, description)
select 'clan_admin', '宗族管理员', '管理宗族空间、成员权限、主数据和审核配置'
where not exists (select 1 from role where role_code = 'clan_admin');

insert into role (role_code, role_name, description)
select 'editor', '修谱编辑', '维护人物、关系、来源和修谱资料'
where not exists (select 1 from role where role_code = 'editor');

insert into role (role_code, role_name, description)
select 'reviewer', '审核员', '负责资料复核、变更审核和定稿确认'
where not exists (select 1 from role where role_code = 'reviewer');
