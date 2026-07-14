-- One-time compatibility callback for the historical V22 permission seed migration.
--
-- Purpose: V9 created ux_app_permission_resource_action after converting permission
-- codes from colon to dot form. V22 later inserts colon-form permissions and handles
-- conflicts only by permission_code, so a clean migration chain otherwise fails with
-- SQLSTATE 23505 before any higher-version compensation migration can run.
--
-- Phase 1: immediately before V22, temporarily drop the resource/action unique index.
-- Phase 2: immediately after V22, merge dot/colon duplicates, preserve role grants,
-- normalize remaining codes to dot form and recreate the unique index before later
-- migrations (including V20260714070000) use ON CONFLICT(resource_code, action_code).
-- Existing databases already beyond V22 are untouched because their index is present.

do $$
begin
    if to_regclass('flyway_schema_history') is not null
       and to_regclass('app_permission') is not null
       and exists (
           select 1
           from flyway_schema_history
           where version = '21'
             and success = true
       )
       and not exists (
           select 1
           from flyway_schema_history
           where version = '22'
             and success = true
       ) then
        drop index if exists ux_app_permission_resource_action;
    end if;

    if to_regclass('flyway_schema_history') is not null
       and to_regclass('app_permission') is not null
       and to_regclass('app_role_permission') is not null
       and to_regclass('ux_app_permission_resource_action') is null
       and exists (
           select 1
           from flyway_schema_history
           where version = '22'
             and success = true
       )
       and not exists (
           select 1
           from flyway_schema_history
           where version = '20260714070000'
             and success = true
       ) then
        create temporary table permission_seed_bridge_plan on commit drop as
        select
            resource_code,
            action_code,
            (array_agg(
                id order by
                    case when permission_code not like '%:%' then 0 else 1 end,
                    id
            ))[1] as canonical_id
        from app_permission
        where resource_code is not null
          and action_code is not null
        group by resource_code, action_code
        having count(*) > 1;

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
        join permission_seed_bridge_plan plan
          on plan.resource_code = duplicate_permission.resource_code
         and plan.action_code = duplicate_permission.action_code
        where duplicate_permission.id <> plan.canonical_id
        on conflict (role_id, permission_id) do nothing;

        delete from app_role_permission grant_row
        using app_permission duplicate_permission,
              permission_seed_bridge_plan plan
        where grant_row.permission_id = duplicate_permission.id
          and plan.resource_code = duplicate_permission.resource_code
          and plan.action_code = duplicate_permission.action_code
          and duplicate_permission.id <> plan.canonical_id;

        delete from app_permission duplicate_permission
        using permission_seed_bridge_plan plan
        where plan.resource_code = duplicate_permission.resource_code
          and plan.action_code = duplicate_permission.action_code
          and duplicate_permission.id <> plan.canonical_id;

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

        create unique index ux_app_permission_resource_action
            on app_permission(resource_code, action_code);
    end if;
end $$;
