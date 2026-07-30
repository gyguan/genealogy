# 16. 登录安全与生产准出收口

本文记录 Issue #130、#131、#132 的最终实现、验证与运行边界，是 `docs/14-auth-commercialization-design.md` 和 `docs/15-auth-commercialization-operations.md` 的增量补充。

## 1. Issue #130：登录防护与安全审计

### 1.1 双维度策略

登录失败继续按以下维度分别计数：

- 标准化账号标识的 SHA-256 哈希；
- 客户端 IP 的 SHA-256 哈希。

运行时配置：

```text
GENEALOGY_AUTH_LOGIN_WINDOW_MINUTES=15
GENEALOGY_AUTH_LOGIN_COOLDOWN_MINUTES=15
GENEALOGY_AUTH_ACCOUNT_MAX_FAILURES=5
GENEALOGY_AUTH_IP_MAX_FAILURES=20
```

`LOGIN_WINDOW_MINUTES` 用于统计连续失败区间，`LOGIN_COOLDOWN_MINUTES` 独立控制达到阈值后的拒绝时长。冷却期届满自动恢复，不产生永久账号锁死。

登录成功后只清理该账号用于运行时判断的失败计数，历史结构化安全事件继续保留。

### 1.2 审计边界

新增或强化以下事件：

- `login_throttled`；
- `session_replay_rejected`；
- `session_revoked_account_inactive`。

审计中禁止保存密码、原始 Session Token、CSRF Token、邀请 Token 和密码重置 Token。

## 2. Issue #131：会话生命周期治理

### 2.1 账号状态即时生效

所有需要认证的业务请求在解析 Session 后重新读取 `app_user`：

- 账号状态不是 `active`；
- 用户已逻辑删除；
- 用户记录不存在；

任一条件成立时，当前 Session 立即撤销并返回 `AUTH_UNAUTHORIZED`。因此禁用账号不能继续使用尚未到期的 Cookie 或 Bearer 兼容会话。

### 2.2 已撤销或过期会话重放

随机未知 Token 只返回统一未认证错误。数据库中能够识别为已撤销或已过期的历史 Session 再次出现时，记录 `session_replay_rejected` 高风险事件，但不记录原始 Token。

### 2.3 会话清理

增加定时清理任务，删除超过保留期的过期或已撤销会话：

```text
GENEALOGY_AUTH_SESSION_CLEANUP_INTERVAL_MS=3600000
GENEALOGY_AUTH_SESSION_RETENTION_DAYS=30
```

清理不影响仍在有效期且未撤销的活跃会话。

## 3. Issue #132：真实环境测试与准出

### 3.1 浏览器 E2E

新增 Playwright Chromium 测试，运行时创建随机测试账号，不依赖演示账号或固定密码。覆盖：

1. 错误密码统一提示；
2. 正确登录、HttpOnly Cookie 会话和刷新恢复；
3. 当前设备会话展示与退出；
4. 密码重置单次使用及旧会话失效；
5. 宗族管理员创建邀请；
6. 受邀用户开通账号并只能获得审批的宗族与角色范围。

执行命令：

```bash
cd frontend/genealogy-web
npm run test:e2e
```

长期 CI：`.github/workflows/auth-commercial-e2e.yml`，使用真实 PostgreSQL 16、真实 Spring Boot 后端和真实 Vite 前端。

### 3.2 PostgreSQL 与 Flyway 治理

仓库保留历史重复版本文件作为审计记录，不修改、删除或重命名历史 SQL。运行包通过 Maven Resource 明确选择每个重复版本的基准迁移，并使用唯一高版本迁移：

```text
V20260714070000__rebuild_legacy_duplicate_migrations.sql
```

前向补齐未进入运行包的历史能力，并整编最终 `resource.action` 权限模型、内置角色授权、成员范围和兼容索引。

禁止使用 `flyway repair` 掩盖问题。验证要求是全新 PostgreSQL 数据库从 V1 完整迁移并成功启动应用。

### 3.3 长期门禁

PR 和 `main` 分支持续执行：

- 全量 Java 测试；
- PostgreSQL/Flyway 启动；
- 前端认证与成员模型测试；
- TypeScript Typecheck；
- OpenAPI 契约一致性；
- 生产构建和敏感凭据扫描；
- Playwright 浏览器认证 E2E。

## 4. 额外基线修复

全量测试发现新旧导入 Controller 同时占用 `/imports/relationships*`。标准任务式 `ImportController` 保留正式路由，兼容 `CsvImportController` 只保留 `/imports/relations*` 别名，消除重复映射且不改变业务服务。

## 5. 回滚

- 登录失败阈值、冷却时长、会话清理周期和保留天数均可配置调整；
- 账号状态即时校验和敏感信息不落盘属于安全底线，不提供生产关闭开关；
- 浏览器 E2E 与 CI 可独立回退，不影响业务数据；
- 数据库只允许新增更高版本的前向补偿迁移，不恢复重复历史迁移到运行包；
- 回滚应用时保留认证安全事件和已有 Session 审计数据。
