-- Genealogy MVP1 draft schema
-- PostgreSQL

create table clan (
    id bigserial primary key,
    clan_name varchar(100) not null,
    surname varchar(20) not null,
    origin_place varchar(255),
    hall_name varchar(100),
    description text,
    created_by bigint,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table branch (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    parent_id bigint references branch(id),
    branch_name varchar(100) not null,
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

create table generation_scheme (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    scheme_name varchar(100) not null,
    poem_text text,
    start_generation_no int,
    validation_enabled boolean not null default true,
    strict_mode boolean not null default false,
    status varchar(32) not null default 'active',
    created_at timestamp not null default now()
);

create table generation_word (
    id bigserial primary key,
    scheme_id bigint not null references generation_scheme(id),
    generation_no int not null,
    word varchar(20) not null,
    meaning varchar(255),
    unique (scheme_id, generation_no)
);

create table person (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    person_code varchar(64),
    name varchar(100) not null,
    genealogy_name varchar(100),
    courtesy_name varchar(100),
    alias_name varchar(100),
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
    lineage_status varchar(50) default 'normal',
    privacy_level varchar(32) not null default 'clan_only',
    data_status varchar(32) not null default 'draft',
    created_by bigint,
    created_at timestamp not null default now(),
    updated_by bigint,
    updated_at timestamp not null default now(),
    deleted_at timestamp
);

create table relationship (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    from_person_id bigint not null references person(id),
    to_person_id bigint not null references person(id),
    relation_type varchar(50) not null,
    relation_label varchar(100),
    relation_category varchar(32),
    ritual_relation_type varchar(64),
    succession_reason text,
    successor_branch_id bigint references branch(id),
    is_lineage_relation boolean not null default false,
    is_biological boolean not null default false,
    is_primary boolean not null default true,
    start_date date,
    end_date date,
    description text,
    confidence_level varchar(32) not null default 'medium',
    data_status varchar(32) not null default 'draft',
    created_by bigint,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp,
    constraint chk_relationship_not_self check (from_person_id <> to_person_id OR relation_type = 'no_descendant')
);

create table source (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    source_name varchar(200) not null,
    source_type varchar(50) not null,
    provider_name varchar(100),
    book_title varchar(200),
    volume_no varchar(50),
    page_no varchar(50),
    excerpt text,
    verification_status varchar(32) not null default 'unverified',
    description text,
    created_by bigint,
    created_at timestamp not null default now()
);

create table attachment (
    id bigserial primary key,
    source_id bigint not null references source(id),
    file_name varchar(255) not null,
    file_path varchar(500) not null,
    file_type varchar(50),
    file_size bigint,
    uploaded_by bigint,
    uploaded_at timestamp not null default now()
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
    target_id bigint not null,
    change_type varchar(50) not null,
    before_data text,
    after_data text,
    diff_summary text,
    submitter_id bigint,
    submit_time timestamp not null default now(),
    status varchar(32) not null default 'pending',
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
    branch_id bigint references branch(id),
    status varchar(32) not null default 'pending',
    review_comment text,
    reviewed_at timestamp,
    created_at timestamp not null default now()
);

create table user_account (
    id bigserial primary key,
    username varchar(100) not null unique,
    display_name varchar(100),
    phone varchar(30),
    email varchar(100),
    status varchar(32) not null default 'active',
    created_at timestamp not null default now()
);

create table clan_member (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    user_id bigint not null references user_account(id),
    member_name varchar(100),
    branch_id bigint references branch(id),
    relation_to_clan varchar(100),
    status varchar(32) not null default 'active',
    joined_at timestamp not null default now()
);

create table role (
    id bigserial primary key,
    role_code varchar(50) not null unique,
    role_name varchar(100) not null,
    description text
);

create table member_role (
    id bigserial primary key,
    member_id bigint not null references clan_member(id),
    role_id bigint not null references role(id),
    scope_type varchar(50) not null default 'clan',
    scope_id bigint,
    created_at timestamp not null default now()
);

create table operation_log (
    id bigserial primary key,
    clan_id bigint,
    actor_id bigint,
    action varchar(100) not null,
    target_type varchar(50),
    target_id bigint,
    summary varchar(255),
    detail text,
    created_at timestamp not null default now()
);
