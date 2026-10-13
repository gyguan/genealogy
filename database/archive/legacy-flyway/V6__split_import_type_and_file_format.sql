-- Split the import business type from the physical file format.
-- Historical values such as person_csv/person_xlsx are migrated in place.

alter table import_job
    add column if not exists file_format varchar(16);

update import_job
set file_format = coalesce(
        nullif(lower(trim(file_format)), ''),
        case
            when lower(coalesce(import_type, '')) like '%_xlsx' then 'xlsx'
            when lower(coalesce(import_type, '')) like '%_csv' then 'csv'
            when lower(coalesce(original_filename, '')) like '%.xlsx' then 'xlsx'
            else 'csv'
        end
    ),
    import_type = case
        when coalesce(trim(import_type), '') = '' then 'person'
        else regexp_replace(lower(trim(import_type)), '_(csv|xlsx)$', '')
    end;

alter table import_job
    alter column import_type set not null,
    alter column file_format set not null;

alter table import_job
    alter column file_format set default 'csv';

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'chk_import_job_file_format'
    ) then
        alter table import_job
            add constraint chk_import_job_file_format
                check (file_format in ('csv', 'xlsx'));
    end if;
end $$;

create index if not exists idx_import_job_type_format
    on import_job(clan_id, import_type, file_format, created_at desc);
