-- Ensure MVP1 support tables exist for clean local demo databases.
-- Some early migrations only created core clan/person/relationship tables.

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

create table if not exists role (
    id bigserial primary key,
    role_code varchar(64) not null unique,
    role_name varchar(100) not null,
    description varchar(255)
);

create table if not exists member_role (
    id bigserial primary key,
    member_id bigint not null references clan_member(id),
    role_id bigint not null references role(id),
    scope_type varchar(32) not null default 'clan',
    scope_id bigint,
    created_at timestamp not null default now()
);

create index if not exists idx_revision_target on revision(target_type, target_id);
create index if not exists idx_review_task_reviewer on review_task(reviewer_id, status);
create index if not exists idx_clan_member_clan on clan_member(clan_id);
create index if not exists idx_member_role_member on member_role(member_id);

insert into role (role_code, role_name, description)
select 'clan_admin', '宗族管理员', '管理宗族空间、成员权限、主数据和审核配置'
where not exists (select 1 from role where role_code = 'clan_admin');

insert into role (role_code, role_name, description)
select 'editor', '修谱编辑', '维护人物、关系、来源和修谱资料'
where not exists (select 1 from role where role_code = 'editor');

insert into role (role_code, role_name, description)
select 'reviewer', '审核员', '负责资料复核、变更审核和定稿确认'
where not exists (select 1 from role where role_code = 'reviewer');
