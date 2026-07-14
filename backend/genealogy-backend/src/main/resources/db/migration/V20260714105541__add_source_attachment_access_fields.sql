-- Re-versioned from V4__source_attachment_access_fields.sql.
-- Purpose: add source attachment access classification fields and indexes.
-- Issue/PR: #150 / PR #151
-- Risk: medium
-- Lock impact: updates source_attachment rows and adds constraints/indexes.
-- Data volume: scans existing source_attachment rows once.
-- Compatibility: executes after source_attachment exists; repeated constraints are guarded.
-- Rollback/Compensation: use a reviewed forward compensation migration; do not rewrite Flyway history.
-- Verification: run the Flyway uniqueness check and PostgreSQL startup check.

alter table source_attachment
    add column if not exists privacy_level varchar(32) not null default 'clan_only',
    add column if not exists sensitive_level varchar(32) not null default 'normal';

update source_attachment
set privacy_level = 'clan_only'
where privacy_level is null or privacy_level = '';

update source_attachment
set sensitive_level = 'normal'
where sensitive_level is null or sensitive_level = '';

alter table source_attachment
    alter column privacy_level set default 'clan_only',
    alter column sensitive_level set default 'normal';

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'chk_source_attachment_privacy_level') then
        alter table source_attachment add constraint chk_source_attachment_privacy_level
            check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_attachment_sensitive_level') then
        alter table source_attachment add constraint chk_source_attachment_sensitive_level
            check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive'));
    end if;
end $$;

create index if not exists idx_source_attachment_source_created
    on source_attachment (source_id, created_at desc)
    where deleted_at is null;
