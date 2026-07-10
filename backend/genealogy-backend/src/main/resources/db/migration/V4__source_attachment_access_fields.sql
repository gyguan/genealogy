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

alter table source_attachment
    add constraint chk_source_attachment_privacy_level
        check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed')),
    add constraint chk_source_attachment_sensitive_level
        check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive'));

create index if not exists idx_source_attachment_source_created
    on source_attachment (source_id, created_at desc)
    where deleted_at is null;
