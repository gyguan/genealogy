-- Seed base roles/permissions and align clan_member with app_user auth model

insert into app_role(role_code, role_name, description, system_role, created_at, updated_at) values
    ('clan_admin', '宗族管理员', '宗族级管理员，可维护宗族、成员、审核和核心资料', true, now(), now()),
    ('branch_admin', '支派管理员', '支派级管理员，可维护授权支派范围内资料', true, now(), now()),
    ('editor', '资料编辑员', '可采集、编辑、提交人物、关系和来源资料', true, now(), now()),
    ('viewer', '只读成员', '可查看授权范围内的宗族与世系资料', true, now(), now())
on conflict (role_code) do update set
    role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();

insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on p.permission_code in (
    'clan:manage', 'branch:manage', 'person:write', 'relationship:write', 'review:approve', 'tree:read'
)
where r.role_code = 'clan_admin'
on conflict do nothing;

insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on p.permission_code in (
    'branch:manage', 'person:write', 'relationship:write', 'tree:read'
)
where r.role_code = 'branch_admin'
on conflict do nothing;

insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on p.permission_code in (
    'person:write', 'relationship:write', 'tree:read'
)
where r.role_code = 'editor'
on conflict do nothing;

insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on p.permission_code in ('tree:read')
where r.role_code = 'viewer'
on conflict do nothing;

-- Historical V2 created clan_member.user_id as FK to user_account. Current auth uses app_user.
do $$
begin
    if exists (select 1 from pg_constraint where conname = 'clan_member_user_id_fkey') then
        alter table clan_member drop constraint clan_member_user_id_fkey;
    end if;
end $$;

update clan_member set member_status = lower(member_status) where member_status in ('ACTIVE', 'INACTIVE', 'INVITED', 'REMOVED');
update clan_member set scope_type = lower(scope_type) where scope_type in ('CLAN', 'BRANCH');
update clan_member set role_id = (select id from app_role where role_code = 'viewer') where role_id is null or role_id = 0;
update clan_member set updated_at = coalesce(updated_at, created_at, now());

alter table clan_member alter column member_status set default 'active';
alter table clan_member alter column scope_type set default 'clan';
alter table clan_member alter column updated_at set default now();

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'clan_member_user_id_app_user_fkey') then
        alter table clan_member add constraint clan_member_user_id_app_user_fkey foreign key (user_id) references app_user(id) not valid;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'clan_member_role_id_app_role_fkey') then
        alter table clan_member add constraint clan_member_role_id_app_role_fkey foreign key (role_id) references app_role(id) not valid;
    end if;
end $$;

create unique index if not exists uk_clan_member_clan_user on clan_member(clan_id, user_id) where user_id is not null;
create index if not exists idx_clan_member_user on clan_member(user_id);
create index if not exists idx_clan_member_role on clan_member(role_id);
