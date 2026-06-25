# Auth 模块

认证模块负责用户账号、登录态和后续 JWT 能力。

当前已包含：

- `AppUserEntity`：用户账号实体。
- `AppUserRepository`：按用户名查询和唯一性校验。
- `V2__auth_member_schema.sql`：用户、角色、权限和宗族成员关系表。

后续计划：

1. 增加注册、登录和刷新令牌接口。
2. 引入密码加密与 JWT 签发。
3. 与成员权限模块打通接口鉴权。
