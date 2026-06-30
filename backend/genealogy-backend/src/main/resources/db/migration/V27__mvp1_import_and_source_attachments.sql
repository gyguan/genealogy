-- MVP1 completion: source attachments and import jobs.
-- These tables are intentionally additive and do not change existing MVP1 core tables.

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

create index if not exists idx_source_attachment_source on source_attachment(source_id, deleted_at);
create index if not exists idx_source_attachment_clan on source_attachment(clan_id, deleted_at);

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

create index if not exists idx_import_job_clan on import_job(clan_id, created_at desc);

create table if not exists import_job_error (
    id bigserial primary key,
    job_id bigint not null,
    row_no int,
    error_message text,
    raw_data text,
    created_at timestamp default now()
);

create index if not exists idx_import_job_error_job on import_job_error(job_id);
