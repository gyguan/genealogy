-- Issue #107: recoverable asynchronous import execution and chunked publishing.
-- Risk: medium. Adds nullable/defaulted columns and two supporting tables; no historical data rewrite.
-- Lock impact: short ACCESS EXCLUSIVE locks while adding columns/constraints to import_job/import_job_row.
-- Compatibility: existing batches are backfilled as synchronous completed tasks and keep their legacy status fields.
-- Recovery: new workers use database leases and unique chunk idempotency keys; expired leases are reclaimable.
-- Rollback: keep columns/tables and roll back application code, or use a reviewed higher-version compensation migration.
-- Verification: Flyway governance, PostgreSQL startup, schema validation, async claim/retry/idempotency tests.

alter table import_job
    add column if not exists execution_mode varchar(16) not null default 'sync',
    add column if not exists execution_status varchar(24) not null default 'completed',
    add column if not exists execution_stage varchar(32) not null default 'completed',
    add column if not exists cursor_row_no integer not null default 0,
    add column if not exists processed_count integer not null default 0,
    add column if not exists published_count integer not null default 0,
    add column if not exists chunk_size integer not null default 200,
    add column if not exists execution_retry_count integer not null default 0,
    add column if not exists execution_max_retries integer not null default 3,
    add column if not exists requested_action varchar(16),
    add column if not exists failure_stage varchar(32),
    add column if not exists last_error_code varchar(64),
    add column if not exists lease_owner varchar(128),
    add column if not exists lease_expires_at timestamp,
    add column if not exists next_retry_at timestamp,
    add column if not exists started_at timestamp,
    add column if not exists completed_at timestamp,
    add column if not exists heartbeat_at timestamp,
    add column if not exists manual_intervention_required boolean not null default false;

update import_job
set execution_mode = coalesce(nullif(execution_mode, ''), 'sync'),
    execution_status = coalesce(nullif(execution_status, ''), 'completed'),
    execution_stage = coalesce(nullif(execution_stage, ''), 'completed'),
    cursor_row_no = coalesce(cursor_row_no, total_count, 0),
    processed_count = coalesce(processed_count, total_count, 0),
    published_count = coalesce(published_count, case when review_status = 'approved' then success_count else 0 end, 0),
    chunk_size = greatest(coalesce(chunk_size, 200), 1),
    execution_retry_count = greatest(coalesce(execution_retry_count, 0), 0),
    execution_max_retries = greatest(coalesce(execution_max_retries, 3), 1),
    manual_intervention_required = coalesce(manual_intervention_required, false);

alter table import_job_row
    add column if not exists published_at timestamp;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'chk_import_job_execution_mode') then
        alter table import_job add constraint chk_import_job_execution_mode
            check (execution_mode in ('sync', 'async'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_import_job_execution_status') then
        alter table import_job add constraint chk_import_job_execution_status
            check (execution_status in ('queued', 'running', 'paused', 'retry_wait', 'completed', 'failed', 'cancelled', 'dead_letter'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_import_job_execution_stage') then
        alter table import_job add constraint chk_import_job_execution_stage
            check (execution_stage in ('queued', 'parsing', 'drafting', 'ready_for_review', 'publishing', 'completed', 'failed', 'cancelled'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_import_job_requested_action') then
        alter table import_job add constraint chk_import_job_requested_action
            check (requested_action is null or requested_action in ('pause', 'cancel'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_import_job_execution_counts') then
        alter table import_job add constraint chk_import_job_execution_counts
            check (cursor_row_no >= 0 and processed_count >= 0 and published_count >= 0 and chunk_size > 0
                and execution_retry_count >= 0 and execution_max_retries > 0);
    end if;
end $$;

create table if not exists import_job_payload (
    job_id bigint primary key,
    original_filename varchar(512) not null,
    content_type varchar(255),
    file_content bytea not null,
    confirm_duplicates boolean not null default false,
    created_at timestamp not null default now(),
    constraint fk_import_job_payload_job foreign key (job_id) references import_job(id) on delete cascade
);

create table if not exists import_job_chunk (
    id bigserial primary key,
    job_id bigint not null,
    stage varchar(32) not null,
    chunk_no integer not null,
    from_row_no integer not null,
    to_row_no integer not null,
    idempotency_key varchar(160) not null,
    status varchar(24) not null,
    attempt_count integer not null default 1,
    error_summary text,
    started_at timestamp not null default now(),
    completed_at timestamp,
    version bigint not null default 0,
    constraint fk_import_job_chunk_job foreign key (job_id) references import_job(id) on delete cascade,
    constraint uk_import_job_chunk_stage_no unique (job_id, stage, chunk_no),
    constraint uk_import_job_chunk_idempotency unique (idempotency_key),
    constraint chk_import_job_chunk_stage check (stage in ('drafting', 'publishing')),
    constraint chk_import_job_chunk_status check (status in ('running', 'completed', 'failed')),
    constraint chk_import_job_chunk_range check (chunk_no >= 0 and from_row_no > 0 and to_row_no >= from_row_no and attempt_count > 0)
);

create index if not exists idx_import_job_execution_claim
    on import_job(execution_status, next_retry_at, lease_expires_at, created_at, id)
    where execution_mode = 'async' and execution_status in ('queued', 'running', 'retry_wait');

create index if not exists idx_import_job_chunk_job_stage
    on import_job_chunk(job_id, stage, chunk_no);

create index if not exists idx_import_job_row_unpublished
    on import_job_row(job_id, row_no)
    where row_status = 'draft_created' and published_at is null;
