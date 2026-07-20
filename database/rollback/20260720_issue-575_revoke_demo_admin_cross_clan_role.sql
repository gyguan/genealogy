-- Applies to: V20260720174728_01__grant_demo_admin_cross_clan_role.sql
-- Preconditions: 确认 demo_admin 不再需要跨宗族演示管理能力，并已备份 member_role 相关数据。
-- Risk: 删除角色授权后，demo_admin 将重新受单宗族限制，可能无法访问其创建的其他宗族。
-- Verification: 执行后查询 demo_admin 的有效角色，不应再包含 cross_clan_admin。

begin;

delete from member_role member_role_to_delete
using clan_membership membership, app_user demo_user, app_role role
where member_role_to_delete.membership_id = membership.id
  and membership.user_id = demo_user.id
  and member_role_to_delete.role_id = role.id
  and demo_user.username = 'demo_admin'
  and role.role_code = 'cross_clan_admin'
  and member_role_to_delete.scope_type = 'global'
  and member_role_to_delete.scope_id = 0;

commit;
