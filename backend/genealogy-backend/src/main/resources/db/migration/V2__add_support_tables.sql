-- Genealogy MVP 1 support tables

create table source (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    source_name varchar(200) not null,
    source_type varchar(50) not null,
    provider_name varchar(100),
    book_title varchar(200),
    volume_no varchar(100),
    page_no varchar(100),
    excerpt text,
    verification_status varchar(32) not null default 'unverified',
    description text,
    created_by bigint,
    created_at timestamp not null default now()
);

create table attachment (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    source_id bigint references source(id),
    file_name varchar(255) not null,
    file_type varchar(100),
    file_size bigint,
    storage_path varchar(500) not null,
    thumbnail_path varchar(500),
    checksum varchar(128),
    uploaded_by bigint,
    uploaded_at timestamp not null default now(),
    access_level varchar(32) not null default 'clan_only'
);

create table source_binding (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    source_id bigint not null references source(id),
    target_type varchar(50) not null,
    target_id bigint not null,
    binding_reason varchar(255),
    excerpt text,
    created_by bigint,
    created_at timestamp not null default now()
);

create table revision (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    target_type varchar(50) not null,
    target_id bigint,
    change_type varchar(32) not null,
    before_data text,
    after_data text,
    diff_summary text,
    submitter_id bigint,
    submit_time timestamp not null default now(),
    status varchar(32) not null default 'draft',
    approved_at timestamp,
    rejected_reason text
);

create table review_task (
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

create table user_account (
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

create table clan_member (
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

create table role (
    id bigserial primary key,
    role_code varchar(64) not null unique,
    role_name varchar(100) not null,
    description varchar(255)
);

create table member_role (
    id bigserial primary key,
    member_id bigint not null references clan_member(id),
    role_id bigint not null references role(id),
    scope_type varchar(32) not null default 'clan',
    scope_id bigint,
    created_at timestamp not null default now()
);

create index idx_source_clan on source(clan_id);
create index idx_source_binding_target on source_binding(target_type, target_id);
create index idx_revision_target on revision(target_type, target_id);
create index idx_review_task_revision on review_task(revision_id);
create index idx_clan_member_clan on clan_member(clan_id);
