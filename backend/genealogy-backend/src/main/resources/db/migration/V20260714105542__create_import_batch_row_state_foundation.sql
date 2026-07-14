-- Re-versioned from V5__import_batch_row_state_foundation.sql.
-- Purpose: preserve every processed import row and separate processing/review states.
-- Issue/PR: #150 / PR #151
-- Risk: medium
-- Lock impact: updates import_job and creates import_job_row with supporting constraints/indexes.
-- Data volume: scans existing import_job rows once.
-- Compatibility: executes after import_job and person exist; repeated constraints are guarded.
-- Rollback/Compensation: use a reviewed forward compensation migration; do not rewrite Flyway history.
-- Verification: run the Flyway uniqueness check and PostgreSQL startup check.

alter table import_job
    add column if not exists processing_status varchar(32) not null default 'processing',
    add column if not exists review_status varchar(32) not null default 'not_submitted',
    add column if not exists review_round integer not null default 0,
    add column if not exists latest_review_task_id bigint,
    add column if not exists parent_job_id bigint,
    add column if not exists updated_at timestamp not null default now();

update import_job
set processing_status = case
        when lower(coalesce(status, '')) = 'running' then 'processing'
        when coalesce(failure_count, 0) > 0 then 'correction_required'
        else 'ready_for_review'
    end,
    review_status = coalesce(nullif(review_status, ''), 'not_submitted'),
    review_round = coalesce(review_round, 0),
    updated_at = coalesce(updated_at, created_at, now());

alter table import_job
    alter column processing_status set default 'processing',
    alter column review_status set default 'not_submitted',
    alter column review_round set default 0,
    alter column updated_at set default now();

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'chk_import_job_processing_status') then
        alter table import_job add constraint chk_import_job_processing_status
            check (processing_status in ('processing', 'correction_required', 'ready_for_review'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_import_job_review_status') then
        alter table import_job add constraint chk_import_job_review_status
            check (review_status in ('not_submitted', 'pending', 'approved', 'rejected', 'cancelled'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'fk_import_job_parent') then
        alter table import_job add constraint fk_import_job_parent
            foreign key (parent_job_id) references import_job(id);
    end if;
end $$;

create table if not exists import_job_row (
    id bigserial primary key,
    job_id bigint not null,
    row_no integer not null,
    raw_data text not null,
    normalized_data jsonb,
    corrected_data jsonb,
    row_status varchar(32) not null,
    error_code varchar(64),
    error_message text,
    draft_person_id bigint,
    retry_count integer not null default 0,
    corrected_by bigint,
    corrected_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    version bigint not null default 0,
    constraint fk_import_job_row_job foreign key (job_id) references import_job(id) on delete cascade,
    constraint fk_import_job_row_person foreign key (draft_person_id) references person(id),
    constraint uk_import_job_row_job_row unique (job_id, row_no),
    constraint chk_import_job_row_status check (row_status in ('invalid', 'draft_created', 'retry_failed', 'excluded')),
    constraint chk_import_job_row_retry_count check (retry_count >= 0)
);

create index if not exists idx_import_job_row_job_status
    on import_job_row(job_id, row_status, row_no);

create index if not exists idx_import_job_row_draft_person
    on import_job_row(draft_person_id)
    where draft_person_id is not null;

create index if not exists idx_import_job_processing_review
    on import_job(clan_id, processing_status, review_status, created_at desc);
