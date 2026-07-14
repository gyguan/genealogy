# Issue #131 执行看板：会话安全与多设备治理

- Issue：https://github.com/gyguan/genealogy/issues/131
- 工作分支：`agent/issue-130-132-auth-security-closure`
- Pull Request：https://github.com/gyguan/genealogy/pull/143
- 状态：✅ 实现与验证完成，等待合入。

## 已完成

- 延续服务端 Session + HttpOnly Cookie + CSRF 双提交方案。
- 所有认证业务请求重新校验 `app_user` 状态和逻辑删除标记。
- 禁用、删除或不存在的账号立即撤销当前 Session，并返回统一未认证响应。
- 已撤销或已过期 Session 再次使用时记录 `session_replay_rejected` 高风险事件。
- 随机未知 Token 不进入可识别用户审计，避免无意义数据膨胀。
- 增加过期及长期撤销会话的定时清理任务。
- 保留设备列表、单会话撤销、退出其他设备、刷新轮换和密码重置后全会话失效能力。

## 配置

```text
GENEALOGY_AUTH_SESSION_CLEANUP_INTERVAL_MS=3600000
GENEALOGY_AUTH_SESSION_RETENTION_DAYS=30
```

## 验证

- 增加禁用账号即时失效测试。
- 增加已撤销会话重放拒绝与审计测试。
- 增加会话保留期清理测试。
- 完整 Maven 测试套件通过。
- Playwright 验证 Cookie 会话刷新恢复、设备展示、退出和密码重置后旧会话失效。

## 回滚

- 清理周期和保留天数可配置调整。
- 账号状态即时校验和会话重放拒绝属于安全底线，不提供生产关闭开关。
- 回滚应用时保留 Session 与安全审计数据。
