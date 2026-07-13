# 14. 登录与认证体系商用化设计

## 1. 背景与目标

现有认证能力以 MVP 和演示为目标：登录页直接展示测试账号，公共注册默认开放，浏览器将长期 Bearer Token 持久化到 `localStorage`，登录入口缺少失败控制、密码恢复和多设备会话治理。

本设计对应 Issue #133，并按 S01 → S05 顺序完成页面、账号准入、登录防护、会话安全和生产准出。

## 2. 方案决策

### 2.1 Web 会话模型

正式 Web 端采用：

```text
服务端 Session
  + HttpOnly Cookie
  + SameSite Cookie
  + 双提交 CSRF Token
```

- 会话随机值只在登录或刷新时返回到 `HttpOnly` Cookie。
- 数据库仅保存会话值和 CSRF 值的 SHA-256 哈希。
- 非安全 HTTP 方法必须携带与 CSRF Cookie 一致、且服务端哈希校验通过的 `X-CSRF-Token`。
- Cookie 名称：
  - `GENEALOGY_SESSION`：`HttpOnly`；
  - `GENEALOGY_CSRF`：允许前端读取，仅用于构造 CSRF Header。
- 生产环境必须启用 HTTPS，并将 `Secure=true`。

### 2.2 Bearer 兼容窗口

后端在迁移期继续接受：

```http
Authorization: Bearer <session-token>
```

但：

- 正式前端不再把长期凭据保存到 `localStorage`；
- 登录响应默认不返回 `accessToken`；
- 仅当 `GENEALOGY_AUTH_EXPOSE_BEARER_TOKEN=true` 时，才向兼容客户端返回 Bearer Token；
- 兼容开关应在客户端迁移完成后关闭并删除。

### 2.3 会话生命周期

- 普通登录：默认 8 小时绝对有效期；
- “保持登录”：默认 30 天绝对有效期；
- 会话活动时间按最小 5 分钟粒度更新，避免每个请求都写数据库；
- 刷新操作轮换会话 Token 和 CSRF Token，旧 Token 立即失效；
- 退出登录撤销当前会话；
- 密码重置、账号禁用时撤销该用户全部会话；
- 用户可以查看当前有效会话、撤销指定其他会话或撤销全部其他会话。

## 3. 账号准入

### 3.1 公共注册

生产环境默认关闭 `/auth/register`。仅在显式配置：

```text
GENEALOGY_AUTH_PUBLIC_REGISTRATION_ENABLED=true
```

时保留兼容注册能力。该开关不得在生产默认配置中开启。

### 3.2 管理员邀请

首期采用管理员邀请作为正式准入方式：

1. 具备 `member.invite` 权限的宗族成员创建邀请；
2. 邀请记录固定宗族、角色、范围、邀请人和有效期；
3. 原始邀请 Token 仅返回一次，数据库只存哈希；
4. 被邀请人接受邀请后创建账号；
5. 使用成员权限领域服务重新校验邀请人的当前授权范围，并创建成员身份和角色授权；
6. 邀请只能使用一次，过期、撤销或已接受后不可再次使用。

邀请创建时和接受时均执行服务端校验，防止邀请创建后邀请人被降权仍可越权生效。

## 4. 密码找回与重置

- 忘记密码接口对存在和不存在的账号返回相同文案；
- 重置 Token 使用安全随机值，数据库仅保存哈希；
- Token 默认 30 分钟有效、单次使用；
- 新密码长度为 8～64 位；
- 重置成功后撤销该用户全部会话；
- 生产环境通过邮件适配器发送重置链接；
- 无邮件基础设施的非生产环境，可通过显式开关返回开发 Token，生产环境必须关闭。

## 5. 登录防护

### 5.1 双维度失败控制

按以下维度统计时间窗口内的失败：

- 账号标识哈希；
- 客户端 IP 哈希。

默认策略：

- 15 分钟窗口；
- 单账号 5 次失败后进入冷却；
- 单 IP 20 次失败后进入冷却；
- 窗口自然过期后自动解除，不永久锁死账号；
- 成功登录后不删除历史审计，但后续判断只统计当前窗口。

### 5.2 防账号枚举

- 用户不存在和密码错误统一返回 `AUTH_LOGIN_FAILED`；
- 用户不存在时仍执行一次 PBKDF2 校验，减少明显时延差异；
- 忘记密码接口不返回账号是否存在；
- 未知账号仅保存不可逆账号哈希，不保存用户输入明文。

## 6. 安全审计

认证安全事件独立存储，不混入宗族操作日志：

- 登录成功、失败、受限；
- 创建/接受邀请；
- 密码重置申请与完成；
- 会话刷新、退出、单个撤销、撤销其他设备；
- CSRF 校验失败；
- Bearer 兼容 Token 暴露开关启用。

审计字段遵循最小披露：用户 ID 可为空，IP 只展示脱敏值，账号输入只保存哈希，禁止写入密码、原始 Token、CSRF Token 和重置凭据。

## 7. 数据库变更

新增：

- `app_account_invite`；
- `app_password_reset_token`；
- `app_login_attempt`；
- `app_auth_security_event`。

扩展 `app_auth_session`：

- `csrf_token_hash`；
- `last_access_at`；
- `device_name`；
- `remember_me`。

迁移使用新的时间戳版本，不修改任何已存在或已执行的历史迁移。

## 8. 配置

建议环境变量：

```text
GENEALOGY_AUTH_PUBLIC_REGISTRATION_ENABLED=false
GENEALOGY_AUTH_DEMO_MODE_ENABLED=false
GENEALOGY_AUTH_EXPOSE_BEARER_TOKEN=false
GENEALOGY_AUTH_EXPOSE_RESET_TOKEN=false
GENEALOGY_AUTH_COOKIE_SECURE=true
GENEALOGY_AUTH_COOKIE_SAME_SITE=Strict
GENEALOGY_AUTH_SESSION_HOURS=8
GENEALOGY_AUTH_REMEMBER_ME_HOURS=720
GENEALOGY_AUTH_LOGIN_WINDOW_MINUTES=15
GENEALOGY_AUTH_ACCOUNT_MAX_FAILURES=5
GENEALOGY_AUTH_IP_MAX_FAILURES=20
GENEALOGY_AUTH_COOLDOWN_MINUTES=15
GENEALOGY_AUTH_INVITE_HOURS=72
GENEALOGY_AUTH_RESET_MINUTES=30
```

生产启动校验必须阻止以下组合：

- 生产环境启用演示账号；
- 生产环境启用开发重置 Token 暴露；
- 生产环境使用 `Secure=false` 的会话 Cookie。

## 9. 兼容与回滚

### 9.1 兼容

- 现有 Bearer Token 在配置窗口内仍可使用；
- 旧前端本地 Token 在升级后只允许一次性读入内存并立即从 `localStorage` 删除；
- 新前端默认使用 Cookie，不依赖登录响应中的 `accessToken`。

### 9.2 回滚

- 前端可在兼容窗口内恢复发送内存 Bearer Token，但不得恢复明文测试账号和密码；
- 后端可配置放宽登录失败阈值或临时关闭限流，不删除审计记录；
- 数据库只做前向补偿，回滚应用时保留新表和新字段；
- Cookie 发布异常时可临时启用 Bearer 返回开关，待代理和 SameSite 配置修复后再关闭。

## 10. 验证

- OpenAPI overlay 与生成契约一致；
- 前端 TypeScript、生产构建、认证模型测试通过；
- 后端认证、限流、邀请、密码重置和会话测试通过；
- PostgreSQL 迁移可在干净库和已有基线库执行；
- 构建产物不包含演示账号、明文密码或开发重置 Token；
- 安全验证覆盖账号枚举、暴力破解、CSRF、会话轮换、退出后访问、重置后会话失效。
