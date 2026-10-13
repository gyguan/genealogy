-- One-time compatibility callback for the historical import_job_row dependency.
--
-- Purpose: V20260714010000 alters import_job_row, while the script that originally
-- created the table was one of the duplicated V5 migrations. After the duplicate
-- version is resolved through a higher-version forward migration, the dependent
-- historical migration still needs the table to exist first.
--
-- Scope: creates the original foundation table only after V20260713203000 has
-- succeeded and before V20260714010000 succeeds. Existing databases already past
-- that migration are untouched.
-- Recovery: V20260714105542 completes import_job state columns and supporting
-- indexes; this callback preserves the original table definition and constraints.

do $$
begin
    if to_regclass('flyway_schema_history') is not null
       and to_regclass('import_job') is not null
       and to_regclass('person') is not null
       and exists (
           select 1
           from flyway_schema_history
           where version = '20260713203000'
             and success = true
       )
       and not exists (
           select 1
           from flyway_schema_history
           where version = '20260714010000'
             and success = true
       )
       and to_regclass('import_job_row') is null then
        create table import_job_row (
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
            constraint fk_import_job_row_job
                foreign key (job_id) references import_job(id) on delete cascade,
            constraint fk_import_job_row_person
                foreign key (draft_person_id) references person(id),
            constraint uk_import_job_row_job_row unique (job_id, row_no),
            constraint chk_import_job_row_status
                check (row_status in ('invalid', 'draft_created', 'retry_failed', 'excluded')),
            constraint chk_import_job_row_retry_count
                check (retry_count >= 0)
        );
    end if;
end $$;
