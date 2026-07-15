-- Development-only rollback for Issue #170.
-- Preconditions: no migration_event production data and no approved migration_event revisions.

begin;

delete from app_role_permission
where permission_id in (
    select id from app_permission where permission_code like 'migration_event.%'
);

delete from app_permission where permission_code like 'migration_event.%';

drop index if exists idx_revision__migration_event_history;
drop index if exists idx_migration_event__clan_time;
drop index if exists idx_migration_event__clan_locations;
drop index if exists idx_migration_event__clan_branch_status_sequence;

alter table migration_event
    drop constraint if exists ck_migration_event__sequence_upper_bound,
    drop constraint if exists ck_migration_event__not_self_move,
    drop constraint if exists ck_migration_event__to_required,
    drop constraint if exists ck_migration_event__from_required;

alter table migration_event
    add constraint ck_migration_event__locations check (
        length(btrim(coalesce(from_location, ''))) > 0
        or length(btrim(coalesce(to_location, ''))) > 0
    );

commit;
