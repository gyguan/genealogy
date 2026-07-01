-- Consolidated Genealogy MVP1 schema.
-- Keep schema-only DDL here. Seed/demo data lives in V2__init_data.sql.

create table if not exists clan (
    id bigserial primary key,
    clan_code varchar(64) unique,
    clan_name varchar(200) not null,
    surname varchar(50) not null,
    hall_name varchar(100),
    commandery varchar(100),
    ancestor_person_id bigint,
    origin_place varchar(255),
    current_places jsonb,
    description text,
    status varchar(32) not null default 'draft',
    created_by bigint,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists branch (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    parent_id bigint,
    branch_name varchar(200) not null,
    branch_path varchar(500),
    level int default 1,
    sort_order int default 0,
    founder_person_id bigint,
    migration_from varchar(255),
    migration_to varchar(255),
    manager_member_id bigint,
    description text,
    status varchar(32) default 'active',
    created_at timestamp default now(),
    updated_at timestamp default now()
);

create table if not exists person (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint,
    person_code varchar(64),
    name varchar(100) not null,
    genealogy_name varchar(100),
    courtesy_name varchar(100),
    alias_name varchar(200),
    gender varchar(20) default 'unknown',
    generation_no int,
    generation_word varchar(20),
    rank_in_family varchar(50),
    birth_date date,
    birth_date_precision varchar(20),
    death_date date,
    death_date_precision varchar(20),
    is_living boolean,
    birth_place varchar(255),
    residence_place varchar(255),
    occupation varchar(100),
    education varchar(100),
    title_or_honor varchar(200),
    biography text,
    tomb_place varchar(255),
    epitaph text,
    has_descendant boolean,
    lineage_status varchar(50) default 'normal',
    privacy_level varchar(32) default 'clan_only',
    data_status varchar(32) default 'draft',
    created_by bigint,
    created_at timestamp default now(),
    updated_by bigint,
    updated_at timestamp default now(),
    deleted_at timestamp
);

create table if not exists relationship (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    from_person_id bigint not null,
    to_person_id bigint not null,
    relation_type varchar(50) not null,
    relation_label varchar(100),
    is_lineage_relation boolean default false,
    is_biological boolean default false,
    is_primary boolean default true,
    description text,
    confidence_level varchar(32) default 'medium',
    data_status varchar(32) default 'draft',
    created_by bigint,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    deleted_at timestamp,
    constraint chk_relationship_not_self check (from_person_id <> to_person_id)
);

create table if not exists generation_scheme (
    id bigserial primary key,
    clan_id bigint references clan(id),
    branch_id bigint,
    scheme_name varchar(200),
    poem_text text,
    start_generation int,
    is_default boolean default false,
    validation_enabled boolean default true,
    strict_mode boolean default false,
    status varchar(32) default 'active',
    created_at timestamp default now()
);

create table if not exists generation_word (
    id bigserial primary key,
    scheme_id bigint references generation_scheme(id),
    generation_no int,
    word varchar(20),
    description varchar(255),
    sort_order int default 0,
    unique (scheme_id, generation_no)
);

create table if not exists source (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    source_name varchar(200) not null,
    source_type varchar(50) not null,
    provider_name varchar(100),
    book_title varchar(200),
    volume_no varchar(100),
    page_no varchar(100),
    excerpt text,
    verification_status varchar(32) default 'unverified',
    description text,
    created_by bigint,
    created_at timestamp default now()
);

create table if not exists source_binding (
    id bigserial primary key,
    clan_id bigint,
    source_id bigint references source(id),
    target_type varchar(50),
    target_id bigint,
    binding_reason varchar(255),
    excerpt text,
    created_by bigint,
    created_at timestamp default now()
);

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

create table if not exists operation_log (
    id bigserial primary key,
    clan_id bigint,
    actor_id bigint,
    action_type varchar(100),
    target_type varchar(50),
    target_id bigint,
    summary varchar(500),
    detail text,
    request_id varchar(100),
    client_ip varchar(64),
    created_at timestamp default now()
);

create table if not exists revision (
    id bigserial primary key,
    clan_id bigint,
    target_type varchar(50),
    target_id bigint,
    change_type varchar(32),
    before_data jsonb,
    after_data jsonb,
    diff_summary text,
    submitter_id bigint,
    submit_time timestamp default now(),
    status varchar(32) default 'draft',
    approved_at timestamp,
    rejected_reason text
);

create table if not exists review_task (
    id bigserial primary key,
    clan_id bigint,
    revision_id bigint,
    review_level int default 1,
    reviewer_id bigint,
    reviewer_role varchar(50),
    branch_id bigint,
    status varchar(32) default 'pending',
    review_comment text,
    reviewed_at timestamp,
    created_at timestamp default now()
);

-- Legacy member tables retained for compatibility with older screens/scripts.
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

-- Current auth/member tables.
create table if not exists app_user (
    id bigserial primary key,
    username varchar(100) not null unique,
    phone varchar(50),
    email varchar(100),
    password_hash varchar(255) not null,
    display_name varchar(100) not null,
    avatar_url varchar(500),
    status varchar(32) default 'active',
    last_login_at timestamp,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    deleted_at timestamp
);

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

create table if not exists app_role (
    id bigserial primary key,
    role_code varchar(64) not null unique,
    role_name varchar(100) not null,
    description text,
    system_role boolean default true,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

create table if not exists clan_member (
    id bigserial primary key,
    clan_id bigint not null,
    user_id bigint,
    person_id bigint,
    branch_id bigint,
    role_id bigint,
    member_name varchar(100),
    join_status varchar(32) default 'invited',
    invited_by bigint,
    member_status varchar(32) default 'active',
    scope_type varchar(32) default 'clan',
    scope_id bigint,
    joined_at timestamp,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

create table if not exists person_event (
    id bigserial primary key,
    clan_id bigint,
    person_id bigint,
    event_type varchar(50),
    event_title varchar(200),
    event_date date,
    event_date_precision varchar(20) default 'day',
    event_place varchar(255),
    event_description text,
    source_type varchar(50),
    source_id bigint,
    sort_order int default 0,
    data_status varchar(32) default 'official',
    created_by bigint,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    deleted_at timestamp
);

create table if not exists source_attachment (
    id bigserial primary key,
    source_id bigint not null,
    clan_id bigint,
    original_filename varchar(255) not null,
    stored_filename varchar(255) not null,
    content_type varchar(120),
    file_size bigint default 0,
    storage_path varchar(1000) not null,
    checksum varchar(128),
    upload_status varchar(32) default 'uploaded',
    created_by bigint,
    created_at timestamp default now(),
    deleted_at timestamp
);

create table if not exists import_job (
    id bigserial primary key,
    clan_id bigint not null,
    branch_id bigint,
    import_type varchar(50) default 'person_csv',
    original_filename varchar(255),
    total_count int default 0,
    success_count int default 0,
    failure_count int default 0,
    status varchar(32) default 'completed',
    error_summary text,
    created_by bigint,
    created_at timestamp default now()
);

create table if not exists import_job_error (
    id bigserial primary key,
    job_id bigint not null,
    row_no int,
    error_message text,
    raw_data text,
    created_at timestamp default now()
);

create index if not exists idx_branch_clan on branch(clan_id);
create index if not exists idx_person_clan on person(clan_id);
create index if not exists idx_person_branch on person(branch_id);
create index if not exists idx_person_status on person(clan_id, data_status);
create index if not exists idx_relationship_from on relationship(from_person_id);
create index if not exists idx_relationship_to on relationship(to_person_id);
create index if not exists idx_relationship_clan on relationship(clan_id);
create index if not exists idx_generation_scheme_clan on generation_scheme(clan_id);
create index if not exists idx_generation_word_scheme on generation_word(scheme_id);
create index if not exists idx_source_clan on source(clan_id);
create index if not exists idx_source_binding_target on source_binding(target_type, target_id);
create index if not exists idx_attachment_clan on attachment(clan_id);
create index if not exists idx_attachment_source on attachment(source_id);
create index if not exists idx_operation_log_clan on operation_log(clan_id);
create index if not exists idx_revision_target on revision(target_type, target_id);
create index if not exists idx_review_task_reviewer on review_task(reviewer_id, status);
create index if not exists idx_review_task_clan_status on review_task(clan_id, status);
create index if not exists idx_role_code on role(role_code);
create index if not exists idx_member_role_member on member_role(member_id);
create index if not exists idx_app_auth_session_token on app_auth_session(token_hash);
create index if not exists idx_app_user_username_deleted on app_user(username, deleted_at);
create index if not exists idx_app_role_code on app_role(role_code);
create index if not exists idx_clan_member_user_status on clan_member(user_id, member_status);
create index if not exists idx_clan_member_clan_user on clan_member(clan_id, user_id);
create index if not exists idx_clan_member_role on clan_member(role_id);
create index if not exists idx_person_event_person_date on person_event(person_id, event_date, sort_order);
create index if not exists idx_person_event_clan on person_event(clan_id);
create index if not exists idx_person_event_type on person_event(event_type);
create index if not exists idx_source_attachment_source on source_attachment(source_id, deleted_at);
create index if not exists idx_source_attachment_clan on source_attachment(clan_id, deleted_at);
create index if not exists idx_import_job_clan on import_job(clan_id, created_at desc);
create index if not exists idx_import_job_error_job on import_job_error(job_id);
