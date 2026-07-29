-- Issue #976: submission idempotency and explicit partial terminal states.
alter table import_job add column if not exists idempotency_key varchar(96);
alter table import_job add column if not exists skipped_count integer not null default 0;

create unique index if not exists uk_import_job_clan_idempotency
    on import_job(clan_id, idempotency_key)
    where idempotency_key is not null;

create index if not exists idx_import_job_recovery_queue
    on import_job(execution_status, next_retry_at, lease_expires_at, created_at, id)
    where execution_mode = 'async';

comment on column import_job.idempotency_key is 'SHA-256 request/file identity scoped by clan and branch';
comment on column import_job.skipped_count is 'Rows skipped because an idempotent checkpoint already completed them';
