-- Enforce business object lifecycle statuses at the database layer.
-- Valid lifecycle: draft -> pending_review -> official / rejected.

alter table person
    alter column data_status set default 'draft';

update person
set data_status = 'draft'
where data_status is null or trim(data_status) = '';

alter table person
    alter column data_status set not null;

alter table person
    add constraint chk_person_data_status_lifecycle
        check (data_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));

alter table relationship
    alter column data_status set default 'draft';

update relationship
set data_status = 'draft'
where data_status is null or trim(data_status) = '';

alter table relationship
    alter column data_status set not null;

alter table relationship
    add constraint chk_relationship_data_status_lifecycle
        check (data_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));

alter table source
    alter column verification_status set default 'draft';

update source
set verification_status = 'draft'
where verification_status is null or trim(verification_status) = '';

alter table source
    alter column verification_status set not null;

alter table source
    add constraint chk_source_verification_status_lifecycle
        check (verification_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));

alter table branch
    alter column status set default 'draft';

update branch
set status = 'draft'
where status is null or trim(status) = '';

alter table branch
    alter column status set not null;

alter table branch
    add constraint chk_branch_status_lifecycle
        check (status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));

alter table generation_scheme
    alter column status set default 'draft';

update generation_scheme
set status = 'draft'
where status is null or trim(status) = '';

alter table generation_scheme
    alter column status set not null;

alter table generation_scheme
    add constraint chk_generation_scheme_status_lifecycle
        check (status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));
