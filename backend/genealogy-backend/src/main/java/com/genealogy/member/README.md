# Member 模块

成员权限模块负责维护用户在宗族内的角色、授权范围和成员状态。

当前已包含：

- `app_user`：登录用户基础信息。
- `app_role`：系统内置角色，例如宗族管理员、支派编辑、审核员和查看者。
- `app_permission`：按模块和动作拆分的权限点。
- `app_role_permission`：角色权限关系。
- `clan_member`：用户在具体宗族内的成员身份、角色和授权范围。

后续计划：

1. 接入 JWT 登录注册流程。
2. 增加成员邀请和启停用接口。
3. 实现 `PermissionDomainService`，按 `userId + clanId + branchId + roleCode + scope` 判断权限。
