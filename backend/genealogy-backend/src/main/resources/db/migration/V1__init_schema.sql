-- Genealogy MVP 1 initial schema

create table clan (
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

create table branch (
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

create table person (
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
    is_lineage_relation boolean not null default false,
    is_biological boolean not null default false,
    is_primary boolean not null default true,
    description text,
    confidence_level varchar(32) not null default 'medium',
    data_status varchar(32) not null default 'draft',
    created_by bigint,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp,
    constraint chk_relationship_not_self check (from_person_id <> to_person_id)
);

create index idx_branch_clan on branch(clan_id);
create index idx_person_clan on person(clan_id);
create index idx_person_branch on person(branch_id);
create index idx_relationship_from on relationship(from_person_id);
create index idx_relationship_to on relationship(to_person_id);
