-- Seed MVP member roles

insert into app_role(role_code, role_name, description, system_role, created_at, updated_at) values
    ('clan_admin', '宗族管理员', '维护宗族、支派、成员和审核任务', true, now(), now()),
    ('branch_admin', '支派管理员', '维护授权支派范围内的人物、关系和资料', true, now(), now()),
    ('editor', '资料编辑员', '录入资料并提交审核', true, now(), now()),
    ('viewer', '只读成员', '查看授权范围内资料', true, now(), now())
on conflict (role_code) do update set
    role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();
