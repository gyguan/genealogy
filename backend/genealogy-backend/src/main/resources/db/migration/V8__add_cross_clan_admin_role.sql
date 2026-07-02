insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
values ('cross_clan_admin', '跨宗族管理员', '跨宗族管理角色，可访问和管理全部宗族数据，用于平台运营和数据治理', true, now(), now())
on conflict (role_code) do update
set role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();
