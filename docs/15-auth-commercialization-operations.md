# 15. 登录认证商用化部署与运维指南

## 1. 环境矩阵

| 能力 | development | demo | staging | production |
|---|---:|---:|---:|---:|
| 公共注册 | 可显式开启 | 可显式开启 | 关闭 | 必须关闭 |
| 演示模式 | 关闭 | 可开启 | 关闭 | 必须关闭 |
| 返回 Bearer Token | 兼容期可开启 | 兼容期可开启 | 默认关闭 | 默认关闭 |
| 返回密码重置 Token | 可显式开启 | 可显式开启 | 关闭 | 必须关闭 |
| Secure Cookie | 本地 HTTP 可关闭 | HTTPS 时开启 | 必须开启 | 必须开启 |
| 密码重置投递 | 可选 | 可选 | 必须配置 | 必须配置 |

正式 Web 端使用服务端 Session Cookie，不再依赖 `localStorage` 保存认证 Token。

## 2. 生产配置

最低要求：

```bash
SPRING_PROFILES_ACTIVE=production
GENEALOGY_AUTH_PUBLIC_REGISTRATION_ENABLED=false
GENEALOGY_AUTH_DEMO_MODE_ENABLED=false
GENEALOGY_AUTH_EXPOSE_BEARER_TOKEN=false
GENEALOGY_AUTH_EXPOSE_RESET_TOKEN=false
GENEALOGY_AUTH_COOKIE_SECURE=true
GENEALOGY_AUTH_COOKIE_SAME_SITE=Strict
GENEALOGY_AUTH_RESET_DELIVERY_URL=https://notification-gateway.example.internal/password-reset
GENEALOGY_AUTH_RESET_BASE_URL=https://genealogy.example.com/?auth=reset&resetToken=
```

应用启动时会检查生产安全配置。生产环境出现以下任一情况时拒绝启动：

- 开启演示模式；
- 暴露密码重置 Token；
- Cookie 未启用 `Secure`；
- 开启公共注册；
- 未配置密码重置投递端点。

## 3. 反向代理与 Cookie

- 外部入口必须使用 HTTPS。
- 代理必须正确传递客户端 IP 和协议。生产部署应通过可信代理解析 `X-Forwarded-For`，不得直接信任来自公网客户端的伪造 Header。
- 同站部署默认使用 `SameSite=Strict`。
- 若前后端跨站部署，需经过安全评审后调整为 `SameSite=None; Secure`，并同步收紧 CORS 和 CSRF 策略。
- Cookie Path 固定为 `/`，不配置宽泛 Domain，避免跨子域泄露。

## 4. 密码重置投递契约

后端向 `GENEALOGY_AUTH_RESET_DELIVERY_URL` 发送：

```json
{
  "recipient": "member@example.com",
  "displayName": "成员名称",
  "resetUrl": "https://genealogy.example.com/?auth=reset&resetToken=...",
  "expiresAt": "2026-07-13T21:30:00"
}
```

要求：

- 投递网关不得记录完整重置链接或 Token；
- 链接只允许单次使用，默认 30 分钟失效；
- 投递失败不向调用方暴露账号是否存在；
- 投递失败应通过认证安全事件和监控告警发现。

## 5. 发布顺序

1. 备份数据库并检查当前 Flyway 历史。
2. 在 staging 执行 `V20260713203000__add_auth_commercialization.sql`。
3. 发布兼容后端，短期保留旧 Bearer Token 读取能力。
4. 发布正式前端，确认浏览器不再写入 `genealogy.token`。
5. 验证登录、退出、刷新、邀请、密码重置和设备撤销。
6. 观察认证指标，无异常后关闭 Bearer Token 返回开关。
7. 客户端迁移完成后另行创建 Issue，删除 Bearer 兼容路径。

## 6. 发布验证

### 页面与构建

- 登录页不包含演示账号、明文密码和“测试账号”文案；
- 登录、找回密码、重置密码、接受邀请均为独立任务；
- 桌面和移动端无横向滚动、遮挡或不可操作区域；
- 生产构建中不存在 `localStorage.setItem('genealogy.token', ...)`。

### 认证主路径

- 登录响应设置 `HttpOnly` Session Cookie 和 CSRF Cookie；
- 刷新页面后仍可通过 `/auth/me` 恢复登录状态；
- 非安全 Cookie 请求缺少或伪造 CSRF Token 时返回 403；
- 退出后原会话不可继续访问；
- 密码重置后全部旧会话失效；
- 邀请只能使用一次，过期或越权邀请不可生效；
- 用户可查看并撤销其他设备会话。

### 风险验证

- 不存在账号和密码错误返回同一外部提示；
- 账号和 IP 达到失败阈值后返回 429；
- 时间窗口过期后自动恢复，不永久锁死账号；
- 日志、错误响应、数据库中不存在原始密码、Session Token、CSRF Token、邀请 Token 或重置 Token。

## 7. 监控与告警

建议指标：

- 登录成功率、失败率和 429 比例；
- 账号/IP 限流命中量；
- CSRF 拒绝量；
- 密码重置申请量、投递成功率和完成率；
- 邀请创建、接受、过期和失败量；
- 活跃会话数、刷新失败率和异常撤销量；
- 401、403、409、429 响应趋势。

告警建议：

- 单 IP 高频尝试多个账号；
- 短时间登录失败率显著上升；
- 密码重置投递持续失败；
- CSRF 拒绝量异常增长；
- 会话刷新失败率超过基线；
- 生产安全配置校验失败。

## 8. 回滚

应用回滚遵循“行为回退、数据保留”：

- 不删除新增表和会话安全字段；
- 在兼容窗口内可临时启用 Bearer Token 返回；
- 可通过配置放宽登录失败阈值；
- 可撤销发布窗口内创建的全部新会话；
- 数据库修正使用新的前向 Flyway 迁移；
- 不恢复演示账号、明文凭据、公共注册和浏览器持久化 Token。

数据库操作示例见：

```text
database/rollback/issue-133-auth-commercialization.sql
```

## 9. 故障排查

| 现象 | 优先检查 |
|---|---|
| 登录成功后刷新又退出 | Cookie Secure、Domain、Path、SameSite、代理协议 |
| POST/PUT/PATCH 返回 403 | CSRF Cookie 和 `X-CSRF-Token` 是否一致 |
| 大量 429 | 失败阈值、客户端 IP 获取、代理配置 |
| 密码重置无邮件 | 投递 URL、网关状态、用户是否已配置邮箱 |
| 邀请接受失败 | 邀请状态/有效期、邮箱绑定、邀请人当前权限 |
| 无法撤销设备 | 当前会话是否有效、目标会话是否属于当前用户 |
