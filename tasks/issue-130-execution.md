# Issue #130 执行看板：登录限流、异常检测与安全审计

- Issue：https://github.com/gyguan/genealogy/issues/130
- 工作分支：`agent/issue-130-132-auth-security-closure`
- Pull Request：https://github.com/gyguan/genealogy/pull/143
- 状态：✅ 实现与验证完成，等待合入。

## 已完成

- 保留账号哈希与 IP 哈希双维度失败统计。
- 新增独立 `loginCooldownMinutes`，不再复用统计窗口作为冷却时长。
- 增加账号/IP 阈值、冷却自动解除和成功登录衰减测试。
- 未知账号与密码错误继续使用统一外部响应。
- 登录失败、限流命中及成功事件使用结构化安全审计。
- 审计不保存账号明文、密码或任何原始 Token。

## 配置

```text
GENEALOGY_AUTH_LOGIN_WINDOW_MINUTES=15
GENEALOGY_AUTH_LOGIN_COOLDOWN_MINUTES=15
GENEALOGY_AUTH_ACCOUNT_MAX_FAILURES=5
GENEALOGY_AUTH_IP_MAX_FAILURES=20
```

## 验证

- `AuthSecurityServiceTest` 覆盖账号限制、IP 限制、冷却自动解除、哈希落库和成功登录计数清理。
- 完整 Maven 测试套件通过。
- 真实 PostgreSQL 16 + Flyway 启动通过。
- Playwright 浏览器认证 E2E 通过。

## 回滚

- 阈值、统计窗口和冷却时长可通过配置调整。
- 历史安全事件不删除。
- 敏感凭据不落盘属于安全底线，不提供关闭开关。
