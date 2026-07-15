-- Development-only rollback for Issue #171.
-- Do not run after culture_site related_person_id contains production data or permissions are in use.

begin;

delete from app_role_permission
where permission_id in (
    select id from app_permission where permission_code like 'culture_site.%'
);

delete from app_permission where permission_code like 'culture_site.%';

drop index if exists idx_revision__culture_site_history;
drop index if exists idx_culture_site__related_person;
drop index if exists idx_culture_site__clan_location_period;
drop index if exists idx_culture_site__clan_branch_status_type;

alter table culture_site drop constraint if exists ck_culture_site__coordinate_pair;
alter table culture_site drop constraint if exists fk_culture_site__related_person;
alter table culture_site drop column if exists related_person_id;

commit;
