# RBAC 权限重构完成状态

## 完成结论

权限重构主链路已完成，系统已从旧 `clan_member` 混合模型切换到新的 RBAC + 数据范围授权模型。

当前主链路：

```text
app_user
  -> clan_membership
  -> member_role
  -> app_role
  -> app_role_permission
  -> app_permission
```

## 已完成内容

### 1. 数据库迁移

- `V9__rbac_membership_refactor.sql`
  - 新增 `app_permission`
  - 新增 `app_role_permission`
  - 新增 `clan_membership`
  - 新增 `member_role`
  - 初始化权限点
  - 初始化角色权限关系
  - 从旧 `clan_member` 迁移成员身份与角色授权
  - 将旧 `branch_subtree` 范围映射为新 `branch` 范围

- `V10__retire_legacy_clan_member.sql`
  - 将 `branch.manager_member_id` 从旧 `clan_member.id` 迁移为新 `member_role.id`
  - 将旧表 `clan_member` 重命名为 `clan_member_legacy`
  - 创建只读兼容视图 `clan_member`

### 2. 后端领域模型

已新增并启用：

```text
AppPermissionEntity
AppRolePermissionEntity
ClanMembershipEntity
MemberRoleEntity
MemberRoleScopeType
```

已新增并启用：

```text
AppPermissionRepository
AppRolePermissionRepository
ClanMembershipRepository
MemberRoleRepository
```

### 3. 后端服务

已新增/改造：

```text
PermissionApplicationService
RbacAuthorizationApplicationService
ClanMembershipApplicationService
MemberRoleApplicationService
MemberManagementApplicationService
AuthorizationApplicationService
```

`AuthorizationApplicationService` 已切换为纯 RBAC，不再依赖旧 `ClanMemberRepository` 和旧 `ROLE_PERMISSIONS` 内存权限兜底。

### 4. 后端接口

成员权限主接口统一为：

```text
GET    /api/v1/member-management/users
GET    /api/v1/member-management/roles
GET    /api/v1/member-management/permissions
GET    /api/v1/member-management/roles/{roleId}/permissions
GET    /api/v1/member-management/clans/{clanId}/members
POST   /api/v1/member-management/clans/{clanId}/members
PUT    /api/v1/member-management/clans/{clanId}/members/{memberId}
DELETE /api/v1/member-management/clans/{clanId}/members/{memberId}
```

旧接口已下线：

```text
POST /api/v1/clans/{clanId}/members
GET  /api/v1/clans/{clanId}/members
```

### 5. 前端页面

`MemberPage.tsx` 已切换到新 RBAC 范围模型：

- 授权范围使用 `clan` / `branch`
- 不再提交旧 `branch_subtree`
- 支持新增授权
- 支持更新角色
- 支持撤销授权

### 6. 旧代码清理

已退场旧代码：

```text
ClanMemberController
MemberApplicationService
MemberCreateRequest
MemberResponse
ClanMemberEntity
ClanMemberRepository
MemberScopeType
```

## 当前保留的兼容内容

数据库仍保留只读兼容视图：

```text
clan_member
```

底层旧表已改名为：

```text
clan_member_legacy
```

该兼容视图仅用于历史查询和排障，不作为业务写入入口。

## 后续验证事项

由于本次改造是在代码仓内直接提交，仍需在本地或 CI 执行以下验证：

```text
1. 后端 Maven 编译
2. Flyway migrate 执行 V9/V10
3. 前端构建
4. 成员授权新增/更新/撤销接口回归
5. 角色权限查询接口回归
6. 业务接口基于新 RBAC 鉴权回归
```

## 最终目标状态

```text
app_user：登录账号
person：谱内人物
clan_membership：宗族成员身份
member_role：成员角色授权
app_role：角色定义
app_permission：权限点定义
app_role_permission：角色权限绑定
```
