-- demo_admin is the platform demonstration administrator and must be able to
-- create/manage multiple demo clans. Keep the normal single-clan restriction
-- unchanged for every other account.
insert into member_role (
    membership_id,
    role_id,
    scope_type,
    scope_id,
    status,
    granted_by,
    granted_at,
    created_by,
    created_at,
    updated_by,
    updated_at
)
select
    membership.id,
    role.id,
    'global',
    0,
    'active',
    demo_user.id,
    now(),
    demo_user.id,
    now(),
    demo_user.id,
    now()
from app_user demo_user
join lateral (
    select clan_membership.id
    from clan_membership
    where clan_membership.user_id = demo_user.id
      and clan_membership.member_status = 'active'
    order by clan_membership.joined_at nulls last, clan_membership.id
    limit 1
) membership on true
join app_role role on role.role_code = 'cross_clan_admin'
where demo_user.username = 'demo_admin'
  and demo_user.deleted_at is null
  and not exists (
      select 1
      from member_role existing_role
      where existing_role.membership_id = membership.id
        and existing_role.role_id = role.id
        and existing_role.status = 'active'
  );
