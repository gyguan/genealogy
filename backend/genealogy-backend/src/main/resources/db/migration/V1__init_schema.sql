-- Clean Genealogy MVP1 schema.
-- This script is intended for a fresh database. Seed data lives in V2__init_data.sql.

create table if not exists app_user (
    id bigserial primary key,
    username varchar(100) not null unique,
    phone varchar(50),
    email varchar(100),
    password_hash varchar(255) not null,
    display_name varchar(100) not null,
    avatar_url varchar(500),
    status varchar(32) not null default 'active',
    last_login_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp
);

create table if not exists app_role (
    id bigserial primary key,
    role_code varchar(64) not null unique,
    role_name varchar(100) not null,
    description text,
    system_role boolean not null default true,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists app_auth_session (
    id bigserial primary key,
    user_id bigint not null references app_user(id),
    token_hash varchar(255) not null,
    issued_at timestamp not null,
    expires_at timestamp not null,
    revoked_at timestamp,
    client_ip varchar(64),
    user_agent varchar(500)
);

create table if not exists clan (
    id bigserial primary key,
    clan_code varchar(64) not null unique,
    clan_name varchar(200) not null,
    surname varchar(50) not null,
    hall_name varchar(100),
    commandery varchar(100),
    ancestor_person_id bigint,
    origin_place varchar(255),
    current_places jsonb,
    description text,
    status varchar(32) not null default 'draft',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists branch (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    parent_id bigint references branch(id),
    branch_name varchar(200) not null,
    branch_path varchar(500),
    level int not null default 1,
    sort_order int not null default 0,
    founder_person_id bigint,
    migration_from varchar(255),
    migration_to varchar(255),
    manager_member_id bigint,
    description text,
    status varchar(32) not null default 'active',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists person (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    person_code varchar(64),
    name varchar(100) not null,
    genealogy_name varchar(100),
    courtesy_name varchar(100),
    alias_name varchar(200),
    gender varchar(20) not null default 'unknown',
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
    lineage_status varchar(50) not null default 'normal',
    privacy_level varchar(32) not null default 'clan_only',
    data_status varchar(32) not null default 'draft',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp not null default now(),
    deleted_at timestamp,
    unique (clan_id, person_code)
);

alter table clan add constraint fk_clan_ancestor_person foreign key (ancestor_person_id) references person(id);
alter table branch add constraint fk_branch_founder_person foreign key (founder_person_id) references person(id);

create table if not exists clan_member (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    user_id bigint not null references app_user(id),
    person_id bigint references person(id),
    branch_id bigint references branch(id),
    role_id bigint not null references app_role(id),
    member_name varchar(100),
    join_status varchar(32) not null default 'invited',
    invited_by bigint references app_user(id),
    member_status varchar(32) not null default 'active',
    scope_type varchar(32) not null default 'clan',
    scope_id bigint,
    joined_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (clan_id, user_id, role_id, scope_type, scope_id)
);

alter table branch add constraint fk_branch_manager_member foreign key (manager_member_id) references clan_member(id);

create table if not exists relationship (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    from_person_id bigint not null references person(id),
    to_person_id bigint not null references person(id),
    relation_type varchar(50) not null,
    relation_label varchar(100),
    is_lineage_relation boolean not null default false,
    is_biological boolean not null default false,
    is_primary boolean not null default true,
    description text,
    confidence_level varchar(32) not null default 'medium',
    data_status varchar(32) not null default 'draft',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp,
    constraint chk_relationship_not_self check (from_person_id <> to_person_id)
);

create table if not exists generation_scheme (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    scheme_name varchar(200) not null,
    poem_text text,
    start_generation int,
    is_default boolean not null default false,
    validation_enabled boolean not null default true,
    strict_mode boolean not null default false,
    status varchar(32) not null default 'active',
    created_at timestamp not null default now()
);

create table if not exists generation_word (
    id bigserial primary key,
    scheme_id bigint not null references generation_scheme(id),
    generation_no int not null,
    word varchar(20) not null,
    description varchar(255),
    sort_order int not null default 0,
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
    verification_status varchar(32) not null default 'unverified',
    description text,
    created_by bigint references app_user(id),
    created_at timestamp not null default now()
);

create table if not exists source_binding (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    source_id bigint not null references source(id),
    target_type varchar(50) not null,
    target_id bigint not null,
    binding_reason varchar(255),
    excerpt text,
    created_by bigint references app_user(id),
    created_at timestamp not null default now()
);

create table if not exists source_attachment (
    id bigserial primary key,
    source_id bigint not null references source(id),
    clan_id bigint not null references clan(id),
    original_filename varchar(255) not null,
    stored_filename varchar(255) not null,
    content_type varchar(120),
    file_size bigint not null default 0,
    storage_path varchar(1000) not null,
    checksum varchar(128),
    upload_status varchar(32) not null default 'uploaded',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    deleted_at timestamp
);

create table if not exists person_event (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    person_id bigint not null references person(id),
    event_type varchar(50) not null,
    event_title varchar(200) not null,
    event_date date,
    event_date_precision varchar(20) not null default 'day',
    event_place varchar(255),
    event_description text,
    source_type varchar(50),
    source_id bigint,
    sort_order int not null default 0,
    data_status varchar(32) not null default 'official',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp
);

create table if not exists revision (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    target_type varchar(50) not null,
    target_id bigint not null,
    change_type varchar(32) not null,
    before_data jsonb,
    after_data jsonb,
    diff_summary text,
    submitter_id bigint references app_user(id),
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
    reviewer_id bigint references app_user(id),
    reviewer_role varchar(50),
    branch_id bigint references branch(id),
    status varchar(32) not null default 'pending',
    review_comment text,
    reviewed_at timestamp,
    created_at timestamp not null default now()
);

create table if not exists import_job (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    import_type varchar(50) not null default 'person_csv',
    original_filename varchar(255),
    total_count int not null default 0,
    success_count int not null default 0,
    failure_count int not null default 0,
    status varchar(32) not null default 'completed',
    error_summary text,
    created_by bigint references app_user(id),
    created_at timestamp not null default now()
);

create table if not exists import_job_error (
    id bigserial primary key,
    job_id bigint not null references import_job(id),
    row_no int,
    error_message text,
    raw_data text,
    created_at timestamp not null default now()
);

create table if not exists operation_log (
    id bigserial primary key,
    clan_id bigint references clan(id),
    actor_id bigint references app_user(id),
    action_type varchar(100) not null,
    target_type varchar(50),
    target_id bigint,
    summary varchar(500),
    detail text,
    request_id varchar(100),
    client_ip varchar(64),
    created_at timestamp not null default now()
);

create index if not exists idx_app_user_username on app_user(username);
create index if not exists idx_app_auth_session_user on app_auth_session(user_id);
create index if not exists idx_app_role_code on app_role(role_code);
create index if not exists idx_branch_clan on branch(clan_id);
create index if not exists idx_branch_parent on branch(parent_id);
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
create index if not exists idx_source_attachment_source on source_attachment(source_id);
create index if not exists idx_person_event_person on person_event(person_id, event_date);
create index if not exists idx_revision_clan_status on revision(clan_id, status);
create index if not exists idx_review_task_reviewer_status on review_task(reviewer_id, status);
create index if not exists idx_import_job_clan on import_job(clan_id);
create index if not exists idx_operation_log_clan_created on operation_log(clan_id, created_at desc);
