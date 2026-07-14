-- Normalize the permission rows produced by the historical V9/V11/V22 chain.
-- Issue/PR: #150 / PR #151
-- Risk: medium
-- Lock impact: updates/deletes duplicate app_permission rows, rewires role grants,
-- and rebuilds one unique index. Run during a maintenance window for large datasets.
-- Data volume: scans app_permission and app_role_permission once; both are expected
-- to remain small authorization metadata tables.
-- Compatibility: preserves the dot-form permission codes expected by the runtime,
-- copies richer V22 metadata, and retains every distinct role grant.
-- Rollback/Compensation: restore through a reviewed higher-version migration; do not
-- rewrite Flyway history or use flyway repair.
-- Verification: clean PostgreSQL 16 migration, Hibernate validation, auth startup,
-- and uniqueness checks on permission_code plus resource_code/action_code.

-- Keep the temporary merge plan available across statements when this script is
-- executed manually from database clients that auto-commit after each statement.
drop table if exists pg_temp.permission_seed_merge_plan;

create temporary table permission_seed_merge_plan as
select
    resource_code,
    action_code,
    (array_agg(
        id order by
            case when permission_code not like '%:%' then 0 else 1 end,
            id
    ))[1] as canonical_id,
    (array_agg(
        id order by
            case when permission_code like '%:%' then 0 else 1 end,
            id desc
    ))[1] as metadata_source_id
from app_permission
where resource_code is not null
  and action_code is not null
group by resource_code, action_code
having count(*) > 1;

-- Keep the runtime-compatible dot permission code, but retain the richer metadata
-- introduced by V22 when both dot and colon variants exist.
update app_permission canonical
set permission_name = coalesce(source.permission_name, canonical.permission_name),
    permission_type = coalesce(source.permission_type, canonical.permission_type),
    resource_type = coalesce(source.resource_type, canonical.resource_type),
    action_type = coalesce(source.action_type, canonical.action_type),
    module_code = coalesce(source.module_code, canonical.module_code),
    module_name = coalesce(source.module_name, canonical.module_name),
    permission_category = coalesce(source.permission_category, canonical.permission_category),
    enabled = coalesce(source.enabled, canonical.enabled),
    sort_order = coalesce(source.sort_order, canonical.sort_order),
    description = coalesce(source.description, canonical.description),
    system_permission = coalesce(source.system_permission, canonical.system_permission),
    status = coalesce(source.status, canonical.status),
    updated_at = now()
from permission_seed_merge_plan plan
join app_permission source on source.id = plan.metadata_source_id
where canonical.id = plan.canonical_id;

-- Preserve grants owned by roles that may exist outside the built-in baseline.
insert into app_role_permission (
    role_id,
    permission_id,
    effect,
    status,
    created_by,
    created_at,
    updated_by,
    updated_at
)
select
    grant_row.role_id,
    plan.canonical_id,
    grant_row.effect,
    grant_row.status,
    grant_row.created_by,
    coalesce(grant_row.created_at, now()),
    grant_row.updated_by,
    coalesce(grant_row.updated_at, now())
from app_role_permission grant_row
join app_permission duplicate_permission
  on duplicate_permission.id = grant_row.permission_id
join permission_seed_merge_plan plan
  on plan.resource_code = duplicate_permission.resource_code
 and plan.action_code = duplicate_permission.action_code
where duplicate_permission.id <> plan.canonical_id
on conflict (role_id, permission_id) do nothing;

delete from app_role_permission grant_row
using app_permission duplicate_permission,
      permission_seed_merge_plan plan
where grant_row.permission_id = duplicate_permission.id
  and plan.resource_code = duplicate_permission.resource_code
  and plan.action_code = duplicate_permission.action_code
  and duplicate_permission.id <> plan.canonical_id;

delete from app_permission duplicate_permission
using permission_seed_merge_plan plan
where plan.resource_code = duplicate_permission.resource_code
  and plan.action_code = duplicate_permission.action_code
  and duplicate_permission.id <> plan.canonical_id;

-- Any V22 permission that had no previous alias is normalized in place so the
-- application service's colon-to-dot lookup remains consistent.
update app_permission permission
set permission_code = replace(permission.permission_code, ':', '.'),
    updated_at = now()
where permission.permission_code like '%:%'
  and not exists (
      select 1
      from app_permission existing
      where existing.permission_code = replace(permission.permission_code, ':', '.')
        and existing.id <> permission.id
  );

create unique index if not exists ux_app_permission_resource_action
    on app_permission(resource_code, action_code);

drop table if exists pg_temp.permission_seed_merge_plan;
