-- Permission column compatibility migration.
-- Some backend permission entities use *_code naming. Keep both code/type aliases to pass Hibernate schema validation.

alter table app_permission add column if not exists resource_code varchar(100);
alter table app_permission add column if not exists action_code varchar(100);
alter table app_permission add column if not exists module_code varchar(100);
alter table app_permission add column if not exists permission_category varchar(50);
alter table app_permission add column if not exists enabled boolean not null default true;
alter table app_permission add column if not exists sort_order int not null default 0;

update app_permission
set resource_code = coalesce(resource_code, resource_type),
    action_code = coalesce(action_code, action_type),
    module_code = coalesce(module_code, resource_type),
    permission_category = coalesce(permission_category, permission_type, 'business'),
    enabled = coalesce(enabled, true),
    sort_order = coalesce(sort_order, 0);

create index if not exists idx_app_permission_resource_code_action_code on app_permission(resource_code, action_code);
create index if not exists idx_app_permission_module_code on app_permission(module_code);
create index if not exists idx_app_permission_enabled on app_permission(enabled);
