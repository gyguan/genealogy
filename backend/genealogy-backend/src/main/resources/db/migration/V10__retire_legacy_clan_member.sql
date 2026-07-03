-- Retire legacy clan_member table after RBAC membership switch.
-- 1. Re-point branch.manager_member_id from legacy clan_member.id to new member_role.id when possible.
-- 2. Rename the legacy table to clan_member_legacy.
-- 3. Recreate clan_member as a read-only compatibility view over legacy data.

update branch b
set manager_member_id = mr.id,
    updated_at = now()
from clan_member cm
join clan_membership cms
  on cms.clan_id = cm.clan_id
 and cms.user_id = cm.user_id
join member_role mr
  on mr.membership_id = cms.id
 and mr.role_id = cm.role_id
 and mr.scope_type = case when cm.scope_type = 'branch_subtree' then 'branch' else cm.scope_type end
 and mr.scope_id = coalesce(cm.scope_id, case when cm.scope_type in ('branch', 'branch_subtree') then cm.branch_id else cm.clan_id end, cm.clan_id)
where b.manager_member_id = cm.id
  and b.clan_id = cm.clan_id;

do $$
begin
    if exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = current_schema()
          and c.relname = 'clan_member'
          and c.relkind = 'r'
    ) and not exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = current_schema()
          and c.relname = 'clan_member_legacy'
    ) then
        alter table clan_member rename to clan_member_legacy;
    end if;
end $$;

comment on table clan_member_legacy is '旧版宗族成员/角色混合表，仅用于历史数据兼容；新写入请使用 clan_membership 与 member_role。';

drop view if exists clan_member;

create view clan_member as
select
    id,
    clan_id,
    user_id,
    person_id,
    branch_id,
    role_id,
    member_name,
    join_status,
    invited_by,
    member_status,
    scope_type,
    scope_id,
    joined_at,
    created_at,
    updated_at
from clan_member_legacy;

comment on view clan_member is '旧版 clan_member 只读兼容视图；业务主链路已切换至 clan_membership 与 member_role。';
