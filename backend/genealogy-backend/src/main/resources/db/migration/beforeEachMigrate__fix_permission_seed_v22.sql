-- One-time compatibility callback for the historical V22 permission seed migration.
--
-- Purpose: V9 created ux_app_permission_resource_action after converting permission
-- codes from colon to dot form. V22 later inserts colon-form permissions and handles
-- conflicts only by permission_code, so a clean migration chain otherwise fails with
-- SQLSTATE 23505 before any higher-version compensation migration can run.
--
-- Scope: the index is dropped only in the narrow state where V21 succeeded and V22
-- has not succeeded. Existing databases already beyond V22 are untouched.
-- Recovery: V20260714105539 normalizes duplicate permissions, preserves grants and
-- recreates ux_app_permission_resource_action.

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
end $$;
