# Issue #133 执行看板：登录与认证体系商用化

- Issue：https://github.com/gyguan/genealogy/issues/133
- 工作分支：`agent/issue-133-auth-commercialization`
- Pull Request：https://github.com/gyguan/genealogy/pull/135
- 目标：按 S01 → S05 顺序，将现有 MVP 登录与认证能力升级为可商用、可审计、可灰度和可回滚的正式能力。
- 耗时口径：遵循 `docs/ai/task-duration-standard.md`，仅记录实际活跃执行耗时，CI 排队和外部等待单独说明。

## 实现范围

1. S01：正式品牌登录页、表单校验、生产/演示环境隔离。
2. S02：关闭无约束公共注册，建设邀请码准入、忘记密码与重置密码。
3. S03：账号/IP 双维度登录限流、临时冷却、安全事件审计。
4. S04：服务端 Session + HttpOnly Cookie、CSRF、防重放、会话轮换与多设备治理。
5. S05：OpenAPI、数据库迁移、自动化测试、部署运维和回滚文档。

## 非目标

- 企业 SSO、OAuth 社交登录、强制 MFA、生物识别登录。
- 独立商业风控平台。
- 原生移动端完整认证协议。

## 方案、影响与回滚

### 认证与会话方案

- 正式 Web 端采用服务端 Session + `HttpOnly/Secure/SameSite` Cookie。
- 后端在迁移窗口内继续接受现有 Bearer Token；生产启动校验禁止返回兼容 Bearer Token。
- 前端不再持久化新 Token，历史 `localStorage` Token 只迁移到内存一次并立即删除。
- `/auth/me`、`/auth/logout` 与业务接口通过 Cookie 桥接复用现有鉴权链路。
- 非安全 Cookie 请求必须同时通过 CSRF Cookie 与 `X-CSRF-Token` 校验。
- 失效 Cookie 会被清理，且不会阻断登录、接受邀请和密码恢复等公共认证路径。

### 数据库影响

- 新增 `app_account_invite`、`app_password_reset_token`、`app_login_attempt`、`app_auth_security_event`。
- 扩展 `app_auth_session` 的 CSRF、最近活动、设备和保持登录字段。
- Session、CSRF、邀请与密码重置凭据只保存哈希。
- 邀请和密码重置消费使用悲观锁，确保并发场景只成功一次。
- Flyway 使用唯一版本 `V20260713203000`，不修改历史迁移。

### 登录防护

- 按账号哈希和客户端 IP 哈希双维度统计失败窗口。
- 达到阈值返回 429，窗口自然到期后解除。
- 登录成功后清理账号维度失败计数，安全事件仍永久保留。
- 不存在账号与密码错误统一返回 `AUTH_LOGIN_FAILED` 和 HTTP 401，并执行哨兵 PBKDF2 校验。

### 回滚策略

- 兼容窗口内可回退到内存 Bearer 请求，但不得恢复浏览器持久化 Token、明文密码或演示凭据。
- 回滚应用时保留新增表、字段与安全审计数据。
- 数据库只允许新的前向补偿迁移，不回滚或重命名已执行版本。
- 限流策略可配置放宽；会话异常时可撤销发布窗口内的新会话。

## 任务看板

| 序号 | 原子任务 | 状态 | 活跃耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、分支与实现基线 | ✅ 已完成 | 约 6 分钟 | 首次启动并再次刷新最新 `main` 治理规则 |
| 2 | 建立分支、执行看板和 Draft PR | ✅ 已完成 | 约 3 分钟 | 分支、PR #135 和 Issue 回写完成 |
| 3 | Contract First：认证 OpenAPI 与 ADR | ✅ 已完成 | 约 6 分钟 | 认证契约、ADR 和前端生成类型完成 |
| 4 | S01：正式登录页与演示隔离 | ✅ 已完成 | 约 10 分钟 | 商用页面、独立认证任务、无演示账号和默认密码 |
| 5 | S02：受控准入与密码找回/重置 | ✅ 已完成 | 约 10 分钟 | 邀请生成/接受、成员入口、一次性重置和通知适配 |
| 6 | S03：登录限流与安全审计 | ✅ 已完成 | 约 9 分钟 | 账号/IP 双维度、成功衰减、统一 401、结构化事件 |
| 7 | S04：Cookie 会话与多设备治理 | ✅ 已完成 | 约 10 分钟 | Cookie/CSRF、轮换、失效恢复、设备查看和撤销 |
| 8 | S05：测试、配置、文档与发布准出 | ✅ 已完成 | 约 9 分钟 | 两轮专项验证、契约检查和幂等迁移均通过 |
| 9 | Review、CI 收口、更新子 Issue 与总览 | 🔄 进行中 | 已累计约 4 分钟 | 临时工作流已清理，正在完成公开 Review 和 Ready 切换 |

## 已落地文件

- 契约与设计：
  - `docs/api/openapi.auth-commercialization.json`
  - `docs/14-auth-commercialization-design.md`
  - `docs/15-auth-commercialization-operations.md`
- 数据库：
  - `V20260713203000__add_auth_commercialization.sql`
  - `database/rollback/issue-133-auth-commercialization.sql`
- 后端：认证配置、DTO、Controller、Service、Filter、Cookie、实体、Repository 和测试。
- 前端：正式认证页面、安全 API Client、登录设备管理、成员邀请入口和模型测试。

## 验证结果

已通过：

- 两轮 PR 级最终验证：
  - 前端认证/成员模型测试；
  - 全量 TypeScript；
  - OpenAPI 生成一致性；
  - 生产构建；
  - 演示凭据和浏览器持久化 Token 扫描；
  - Java 17 主代码与测试代码编译；
  - 登录、限流、邀请、密码重置和成员权限聚焦测试；
  - PostgreSQL 16 迁移连续执行两次和四张新表校验。
- 仓库默认 API Contract。
- 仓库默认 Database Migration Governance。
- 仓库默认 Issue Delivery Governance。

## 已知仓库基线

- 默认 PostgreSQL Startup Check 仍在 Spring Bean 初始化前失败：仓库历史同时存在两个 Flyway `V3` 迁移版本。
- 该问题与本次唯一高版本迁移无关；本次迁移治理和独立 PostgreSQL 幂等验证均通过。
- 默认全量测试历史上还存在 Source/Attachment 权限码 Mockito 桩漂移；本次认证和权限聚焦测试全部通过，不修改无关业务实现掩盖基线问题。

## 当前恢复检查点

- 所有业务实现、专项验证和临时工作流清理已完成。
- 当前进行中：PR 公开 Review、转 Ready、等待仓库自动合入。
- 下一步最小任务：确认 Review 无阻断意见，标记 Ready，并更新 #128–#133 状态。
- 未完成项：仅治理合入与 Issue 状态收口。
- 已记录活跃执行耗时约 67 分钟；CI 排队、运行和 Runner 调度等待不计入。

最后更新时间：2026-07-13 21:28（Asia/Shanghai）
