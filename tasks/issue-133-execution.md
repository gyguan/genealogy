# Issue #133 执行看板：登录与认证体系商用化

- Issue：https://github.com/gyguan/genealogy/issues/133
- 工作分支：`agent/issue-133-auth-commercialization`
- 目标：按 S01 → S05 顺序，将现有 MVP 登录与认证能力升级为可商用、可审计、可灰度和可回滚的正式能力。
- 耗时口径：遵循 `docs/ai/task-duration-standard.md`，仅记录实际活跃执行耗时，CI 排队和外部等待单独说明。

## 实现范围

1. S01：正式品牌登录页、表单校验、生产/演示环境隔离。
2. S02：关闭无约束公共注册，建设邀请码准入、忘记密码与重置密码。
3. S03：账号/IP 双维度登录限流、临时冷却、安全事件审计。
4. S04：采用服务端 Session + HttpOnly Cookie，兼容短期 Bearer 迁移窗口；支持会话续期、查看与撤销其他设备。
5. S05：补齐 OpenAPI、数据库迁移、单元/集成/前端测试、部署与回滚文档。

## 非目标

- 企业 SSO、OAuth 社交登录、强制 MFA、生物识别登录。
- 独立商业风控平台。
- 原生移动端完整认证协议。

## 方案、影响与回滚

### 认证与会话方案

- 正式 Web 端改为服务端 Session + `HttpOnly/Secure/SameSite` Cookie。
- 后端在迁移窗口内继续接受现有 Bearer Token，前端不再把长期凭据写入 `localStorage`。
- 新登录响应不向浏览器暴露长期 Token；`/auth/me`、`/auth/logout` 同时支持 Cookie 与兼容 Bearer。
- 会话采用服务端哈希标识，支持滑动续期、单会话撤销和全部其他会话撤销。

### 数据库影响

- 新增账号邀请、密码重置凭据、登录安全事件和登录失败计数所需表/字段。
- Flyway 使用高于 `main` 当前最大版本的唯一时间戳版本，不修改历史迁移。
- 索引仅围绕邀请码哈希、重置凭据哈希、账号/IP 窗口查询和有效会话查询建立。

### 兼容策略

- 旧 Bearer 会话保留一个明确迁移窗口，默认生产前端只使用 Cookie。
- 公开注册接口在生产默认关闭；演示环境通过显式配置开启。
- 登录错误统一最小披露，避免账号枚举。

### 回滚策略

- 前端可通过配置回退到兼容 Bearer 模式，但不得重新写入明文密码或演示凭据。
- 后端保留兼容读取路径，回滚时不删除新表和新字段，仅停止新流程写入。
- 数据库迁移采用前向补偿，不回滚或重命名已执行版本。
- 限流和安全策略均支持配置关闭/放宽，避免发布异常时阻断全部登录。

## 任务看板

| 序号 | 原子任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、现有分支与实现基线 | ✅ 已完成 | 约 8 分钟 | 已确认首次启动，无关联分支或 PR |
| 2 | 建立分支、执行看板和 Draft PR | 🔄 进行中 | 已累计约 3 分钟 | 当前检查点 |
| 3 | Contract First：认证商用化 OpenAPI 与 ADR | ⏳ 待处理 | — | 先契约后实现 |
| 4 | S01：重构正式登录页并隔离演示能力 | ⏳ 待处理 | — | 前端独立切片 |
| 5 | S02：邀请码准入与密码找回/重置 | ⏳ 待处理 | — | 后端、迁移、页面 |
| 6 | S03：登录限流、冷却与安全审计 | ⏳ 待处理 | — | 账号/IP 双维度 |
| 7 | S04：Cookie 会话、续期与多设备管理 | ⏳ 待处理 | — | 保留 Bearer 兼容窗口 |
| 8 | S05：测试、环境校验、文档与发布准出 | ⏳ 待处理 | — | 全量验证与安全检查 |
| 9 | Review、CI 收口、更新子 Issue 与总览 | ⏳ 待处理 | — | 完成后合入并关闭 |

## 影响模块

- `docs/api/openapi.json`
- `docs/` 认证 ADR、部署与运维文档
- `backend/genealogy-backend/src/main/java/com/genealogy/auth/**`
- `backend/genealogy-backend/src/main/resources/db/migration/**`
- `frontend/genealogy-web/src/features/auth/**`
- `frontend/genealogy-web/src/shared/api/client.ts`
- 认证相关后端、前端和 PostgreSQL 测试

## 验证方案

- 后端聚焦测试与 `mvn test`。
- 前端认证组件测试、`npm run typecheck`、`npm run build`、`npm run api:check`。
- Flyway 迁移治理与真实 PostgreSQL 集成测试。
- 登录、退出、邀请注册、密码重置、限流、会话撤销主路径端到端验证。
- 构建产物扫描：不得包含演示账号、明文密码或生产禁用入口。

## 已知风险

- 仓库存在历史重复 `V3` Flyway 迁移，不能在本 Issue 中通过改名或 repair 掩盖；新迁移必须使用唯一高版本。
- Cookie 方案受 HTTPS、反向代理、SameSite 和 CSRF 配置影响，必须同步部署文档和环境校验。
- #133 范围较大，按垂直切片独立提交和验证，任何未验证切片不得标记完成。

## 当前恢复检查点

- 已从最新 `main` 创建分支。
- 已提交执行看板；下一步立即创建 Draft PR，在 PR 与 Issue 回写后才能修改业务代码。

最后更新时间：2026-07-13 20:15（Asia/Shanghai）
