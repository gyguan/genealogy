-- Re-versioned from V3__source_library_status_and_fields.sql.
-- Purpose: align source statuses and add source metadata fields.
-- Issue/PR: #150 / PR #151
-- Risk: medium
-- Lock impact: updates source and source_binding rows and adds constraints/indexes.
-- Data volume: scans existing source and source_binding rows once.
-- Compatibility: executes after the established migration chain; repeated schema objects are guarded.
-- Rollback/Compensation: use a reviewed forward compensation migration; do not rewrite Flyway history.
-- Verification: run the Flyway uniqueness check and PostgreSQL startup check.

alter table source
    add column if not exists source_date varchar(100),
    add column if not exists confidence_level varchar(32) not null default 'unknown',
    add column if not exists privacy_level varchar(32) not null default 'clan_only',
    add column if not exists sensitive_level varchar(32) not null default 'normal',
    add column if not exists updated_at timestamp not null default now();

update source
set verification_status = case
    when verification_status is null or trim(verification_status) = '' then 'draft'
    when lower(verification_status) = 'unverified' then 'draft'
    when lower(verification_status) in ('verified', 'reviewed', 'approved') then 'official'
    else lower(verification_status)
end,
    confidence_level = coalesce(nullif(trim(confidence_level), ''), 'unknown'),
    privacy_level = coalesce(nullif(trim(privacy_level), ''), 'clan_only'),
    sensitive_level = coalesce(nullif(trim(sensitive_level), ''), 'normal'),
    updated_at = coalesce(updated_at, created_at, now());

update source
set source_type = 'oral_history'
where source_type = 'oral_record';

alter table source
    alter column verification_status set default 'draft',
    alter column confidence_level set default 'unknown',
    alter column privacy_level set default 'clan_only',
    alter column sensitive_level set default 'normal',
    alter column updated_at set default now();

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'chk_source_verification_status') then
        alter table source add constraint chk_source_verification_status
            check (verification_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_confidence_level') then
        alter table source add constraint chk_source_confidence_level
            check (confidence_level in ('high', 'medium', 'low', 'unknown'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_privacy_level') then
        alter table source add constraint chk_source_privacy_level
            check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_sensitive_level') then
        alter table source add constraint chk_source_sensitive_level
            check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive'));
    end if;
end $$;

alter table source_binding
    add column if not exists confidence_level varchar(32) not null default 'unknown',
    add column if not exists binding_status varchar(32) not null default 'official',
    add column if not exists updated_at timestamp not null default now();

update source_binding
set confidence_level = coalesce(nullif(trim(confidence_level), ''), 'unknown'),
    binding_status = case
        when binding_status is null or trim(binding_status) = '' then 'official'
        when lower(binding_status) = 'unverified' then 'draft'
        when lower(binding_status) in ('verified', 'reviewed', 'approved') then 'official'
        else lower(binding_status)
    end,
    updated_at = coalesce(updated_at, created_at, now());

alter table source_binding
    alter column confidence_level set default 'unknown',
    alter column binding_status set default 'official',
    alter column updated_at set default now();

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'chk_source_binding_confidence_level') then
        alter table source_binding add constraint chk_source_binding_confidence_level
            check (confidence_level in ('high', 'medium', 'low', 'unknown'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_binding_status') then
        alter table source_binding add constraint chk_source_binding_status
            check (binding_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));
    end if;
end $$;

create unique index if not exists uk_source_binding_target
    on source_binding(source_id, target_type, target_id);

create index if not exists idx_source_clan_status
    on source(clan_id, verification_status);

create index if not exists idx_source_clan_privacy
    on source(clan_id, privacy_level);
