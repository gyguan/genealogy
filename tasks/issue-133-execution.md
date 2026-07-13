# Issue #133 执行看板：登录与认证体系商用化

- Issue：https://github.com/gyguan/genealogy/issues/133
- 工作分支：`agent/issue-133-auth-commercialization`
- Draft PR：https://github.com/gyguan/genealogy/pull/135
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
- 新登录响应默认不向浏览器暴露长期 Token；生产启动校验禁止开启 Bearer Token 暴露。
- `/auth/me`、`/auth/logout` 与现有业务接口通过 Cookie 桥接继续复用原鉴权链路。
- 非安全 Cookie 请求必须同时通过 CSRF Cookie 与 `X-CSRF-Token` 校验。
- 会话采用服务端哈希标识，支持轮换、单会话撤销和全部其他会话撤销。

### 数据库影响

- 新增 `app_account_invite`、`app_password_reset_token`、`app_login_attempt`、`app_auth_security_event`。
- 扩展 `app_auth_session` 的 CSRF、最近活动、设备和保持登录字段。
- 邀请与密码重置凭据只保存哈希；消费时使用悲观锁确保并发单次使用。
- Flyway 使用唯一高版本 `V20260713203000`，不修改历史迁移。

### 兼容策略

- 旧 Bearer 会话保留明确迁移窗口，正式前端只使用 Cookie。
- 前端一次性读取历史 `localStorage` Token 到内存后立即删除，不再持久化新 Token。
- 公开注册接口生产默认关闭，正式准入采用宗族管理员邀请。
- 登录和密码找回统一最小披露，避免账号枚举。

### 回滚策略

- 前端可在兼容窗口内回退到内存 Bearer 请求，但不得恢复浏览器持久化 Token、明文密码或演示凭据。
- 后端保留兼容读取路径，回滚时不删除新表和新字段，仅停止新流程写入。
- 数据库迁移采用前向补偿，不回滚或重命名已执行版本。
- 限流和安全策略可配置放宽；会话异常时可撤销发布窗口内的新会话。

## 任务看板

| 序号 | 原子任务 | 状态 | 活跃耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、分支与实现基线 | ✅ 已完成 | 约 6 分钟 | 首次启动，无关联分支或 PR；期间再次刷新最新 `main` 治理规则 |
| 2 | 建立分支、执行看板和 Draft PR | ✅ 已完成 | 约 3 分钟 | 分支与 PR #135 已建立，Issue 已回写 |
| 3 | Contract First：认证 OpenAPI 与 ADR | ✅ 已完成 | 约 6 分钟 | `openapi.auth-commercialization.json`、设计 ADR、前端生成类型 |
| 4 | S01：正式登录页与演示隔离 | ✅ 已完成 | 约 10 分钟 | 商用双栏页面、独立认证任务、无演示账号/默认密码；前端首次验证通过 |
| 5 | S02：受控准入与密码找回/重置 | ✅ 已完成 | 约 10 分钟 | 邀请生成/接受、成员模块入口、一次性重置 Token、投递适配器 |
| 6 | S03：登录限流与安全审计 | ✅ 已完成 | 约 7 分钟 | 账号/IP 双维度窗口、未知账号等时校验、结构化认证事件 |
| 7 | S04：Cookie 会话与多设备治理 | ✅ 已完成 | 约 8 分钟 | HttpOnly/CSRF Cookie、刷新轮换、设备列表、单个/其他会话撤销 |
| 8 | S05：测试、配置、文档与发布准出 | 🔄 进行中 | 已累计约 5 分钟 | 前端首轮验证、后端编译、迁移治理已通过；PR 级最终验证运行中 |
| 9 | Review、CI 收口、更新子 Issue 与总览 | ⏳ 待处理 | — | 最终验证通过后清理临时验证文件、转 Ready 并按治理规则合入 |

## 已落地文件

- 契约与设计：
  - `docs/api/openapi.auth-commercialization.json`
  - `docs/14-auth-commercialization-design.md`
  - `docs/15-auth-commercialization-operations.md`
- 数据库：
  - `V20260713203000__add_auth_commercialization.sql`
  - `database/rollback/issue-133-auth-commercialization.sql`
- 后端：`com.genealogy.auth` 下配置、DTO、Controller、Service、Filter、Cookie、实体、Repository 和测试。
- 前端：正式认证页面、安全 API Client、登录设备管理、成员邀请入口和模型测试。

## 验证结果

已通过：

- 前端认证模型测试。
- 前端全量 TypeScript 检查。
- OpenAPI 生成一致性检查。
- 前端生产构建。
- 演示账号、明文密码和浏览器持久化 Token 扫描。
- Java 17 主代码编译。
- 数据库迁移治理。
- PostgreSQL 增量迁移首轮验证。

运行中：

- `Issue 133 Final Verification`：前端、认证聚焦测试和 PostgreSQL 幂等迁移三组 Job。
- 仓库默认 API Contract、Backend CI 和治理门禁。

## 已知基线与风险

- `main` 在本任务期间新增 Issue 自动合入治理；已刷新规则，最终必须在 PR 中公开 Review 后才能转 Ready/自动合入。
- 仓库历史存在重复 `V3` Flyway 迁移，当前新增迁移治理已单独通过；如默认启动检查仍失败，将在 PR 验收记录中明确区分基线问题。
- Cookie 方案依赖 HTTPS、反向代理、SameSite 和 CSRF 配置，已同步生产启动校验与部署文档。
- 密码重置邮件由 `GENEALOGY_AUTH_RESET_DELIVERY_URL` 对接通知网关；生产环境未配置时拒绝启动。

## 当前恢复检查点

- 最新业务检查点：成员权限模块已提供“邀请新成员”入口；邀请接受和密码重置均使用数据库悲观锁。
- 当前仅等待 PR 级最终验证结果；失败时优先读取具体 Job 日志并修复本次回归。
- 验证通过后：删除 `.github/workflows/issue-133-final-verification.yml`，更新 PR/Issue，转 Ready，等待治理自动合入。

最后更新时间：2026-07-13 21:12（Asia/Shanghai）
