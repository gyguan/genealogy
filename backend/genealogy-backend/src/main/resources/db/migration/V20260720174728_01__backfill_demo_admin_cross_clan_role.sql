-- Purpose: 为演示管理员 demo_admin 补授跨宗族管理员角色，允许创建和管理多个演示宗族。
-- Issue/PR: #575 / PR #576
-- Risk: low
-- Lock impact: 仅插入单条 member_role 数据，短暂持有行级写锁。
-- Data volume: 扫描单个用户名及其少量成员关系，预计新增 0 或 1 行。
-- Compatibility: 不修改普通用户单宗族校验，不影响已有授权。
-- Rollback/Compensation: 使用 database/rollback/20260720_issue-575_revoke_demo_admin_cross_clan_role.sql 删除本迁移新增授权。
-- Verification: 查询 demo_admin 的有效角色应包含 cross_clan_admin，且重复执行逻辑不会产生重复有效授权。

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
