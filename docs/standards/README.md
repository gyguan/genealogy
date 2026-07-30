# Genealogy 规范权威目录

本文件只做规范导航和职责划分，不复制规范正文。完整文档分类见 `docs/README.md`。

## 1. 文档职责

| 类型 | 承载内容 |
|---|---|
| 根 `AGENTS.md` | 全仓优先级、P0 红线、P1 门禁和任务路由 |
| 目录级 `AGENTS.md` | 当前工程可执行规则 |
| 专项规范 | API、权限、数据库、日志、页面和查询等领域规则 |
| 产品文档 | 产品范围、验收目标和稳定业务语义 |
| 架构文档 | 系统分层、状态机、模块边界和长期技术决策 |
| 测试文档 | 可重复执行的测试方法、数据、覆盖和准出要求 |
| 部署文档 | 环境、部署、联调、运维和恢复步骤 |
| 经验文档 | 原因、阈值、案例、偏离条件和 Review 方法 |
| 工程 README | 启动、目录、验证和阅读入口 |
| 模块 README | 入口、调用链、不变量、状态和性能边界 |
| Issue / Spec | 当前变更目标、范围、兼容和验收 |
| Archive | 已结束阶段的设计、交付和验证记录，不具备当前权威性 |

## 2. 权威文件索引

| 主题 | 权威文件 | 级别 |
|---|---|---|
| 全仓规则与业务红线 | `AGENTS.md` | P0/P1 |
| 后端编码与分层 | `backend/genealogy-backend/AGENTS.md` | P2 |
| 前端编码与状态管理 | `frontend/genealogy-web/AGENTS.md` | P2 |
| MVP 1 范围与验收 | `docs/product/mvp1-scope-and-acceptance.md` | 产品基线 |
| 领域对象与核心不变量 | `docs/product/domain-model.md` | P1/P2 |
| 宗族文化领域 | `docs/product/culture-domain.md` | P1/P2 |
| 中国式宗法关系 | `docs/product/ritual-relationships.md` | P1/P2 |
| 系统架构与模块边界 | `docs/architecture/system-architecture.md` | P2 |
| 登录与认证架构 | `docs/architecture/authentication.md` | P1/P2 |
| Revision 审核闭环 | `docs/architecture/revision-review-flow.md` | P1/P2 |
| Review 状态机 | `docs/architecture/review-state-machine.md` | P1/P2 |
| Revision 追踪标识 | `docs/architecture/revision-traceability.md` | P2 |
| 统一权限决策 | `docs/architecture/unified-access-decision.md` | P1/P2 |
| API 权威契约 | `docs/api/openapi.json` | P1 |
| API 设计原则 | `docs/standards/api-design.md` | P1/P2 |
| 权限与隐私 | `docs/standards/authorization-and-privacy.md` | P1/P2 |
| ID 字段 | `docs/standards/id-fields.md` | P1/P2 |
| 人物谱号 | `docs/standards/person-code.md` | P1/P2 |
| 世系图谱查询 | `docs/standards/lineage-tree-query.md` | P1/P2 |
| 数据库与 Flyway | `docs/backend/database-and-flyway.md` | P1/P2 |
| 数据库初始化 | `docs/backend/database-initialization.md` | P2 |
| 数据库脚本治理 | `docs/backend/database-script-governance.md` | P1/P2 |
| 后端环境配置 | `docs/backend/environment-configuration.md` | P1/P2 |
| Repository 查询性能 | `docs/backend/repository-query-performance.md` | P2 |
| Tree 查询性能 | `docs/backend/tree-query-performance.md` | P2 |
| 日志与审计 | `docs/backend/logging-and-audit.md` | P1/P2 |
| 架构质量与可观测性 | `docs/backend/observability-and-audit.md` | P2 |
| 导入类型扩展 | `docs/backend/import-type-extension.md` | P2 |
| 前端设计体系 | `docs/frontend/design-system.md` | P2 |
| 前端页面模式 | `docs/frontend/page-patterns.md` | P2 |
| 查询类页面业务行为 | `docs/frontend/query-pages.md` | P2 |
| 查询 Card 视觉契约 | `docs/frontend/query-card-visual-contract.md` | P2 |
| 提示与反馈 | `docs/frontend/feedback-patterns.md` | P2 |
| 多 Tab 页面 | `docs/frontend/multi-tab-pages.md` | P2 |
| 功能测试方法与覆盖 | `docs/testing/functional-test-*.md` | P2 |
| PostgreSQL 集成测试 | `docs/testing/postgresql-integration-tests.md` | P2 |
| 视觉发布 | `docs/testing/visual-release.md` | P2 |
| 多浏览器支持 | `docs/testing/multi-browser-support-matrix.md` | P2 |
| 容量测试 | `docs/testing/performance/capacity-testing.md` | P2 |
| 安全渗透测试 | `docs/testing/security/penetration-testing.md` | P1/P2 |
| 长稳与恢复 | `docs/testing/stability/recovery-runbook.md` | P1/P2 |
| UAT | `docs/testing/uat/uat-plan.md`、`signoff-template.md` | P1/P2 |
| 认证部署运维 | `docs/deploy/authentication-operations.md` | P1/P2 |
| 云端部署联调 | `docs/deploy/sae-rds-oss-checklist.md` | P2 |
| Issue 创建与拆分 | `docs/governance/issue-creation.md` | P1 |
| Issue 实现与恢复 | `docs/governance/issue-execution.md` | P1 |
| 聊天式开发 | `docs/governance/chat-driven-development.md` | P2 |
| 看板与耗时 | `docs/governance/task-time-tracking.md` | P1/P2 |
| 时间与时区 | `docs/governance/time-and-timezone.md` | P1 |
| 后端代码维护经验 | `docs/experience/backend-code-maintainability.md` | P3 |
| 前端代码维护经验 | `docs/experience/frontend-code-maintainability.md` | P3 |
| Issue 规模与流程强度 | `docs/experience/issue-delivery-sizing.md` | P2/P3 |
| AI 工程流程 | `docs/ai/engineering-workflow.md` | P2/P3 |
| Skill 目录 | `docs/ai/skill-catalog.md` | P3 |
| Prompt 模板库 | `docs/ai/prompt-library.md` | P3 |

## 3. 最小读取矩阵

| 任务 | 最小读取集合 |
|---|---|
| 产品范围或验收 | 根规则 + MVP 范围 + Issue/Spec |
| 领域模型变更 | 根规则 + 领域模型 + 对应领域文档 + 系统架构 |
| 普通后端实现 | 根规则 → 后端规则 → 模块 README → Issue/Spec |
| 数据库变更 | 上述集合 + 数据库与 Flyway + 脚本治理 + 环境配置 |
| 后端性能治理 | 后端规则 + 对应查询性能规范 + 测试 |
| 普通前端实现 | 根规则 → 前端规则 → Feature README → Issue/Spec |
| 页面视觉整改 | 上述集合 + 设计体系 + 页面/查询/反馈模式；查询 Card 尺寸与动作外观增加视觉契约 |
| API 变更 | 根规则 + OpenAPI + API 设计规则 + 前后端目录规则 |
| 权限、隐私、审核 | 根规则 + 权限隐私 + 统一权限决策 + 相关模块 README |
| 发布验收 | 根规则 + `docs/testing/README.md` 中对应测试 + 部署文档 |
| Issue 创建 | 根规则 + Issue 创建规范 + Issue 规模经验 |
| Issue 实现或恢复 | 根规则 + Issue 执行规范 + 当前 PR/CI 现场 |

## 4. 单一权威来源

- 同一强制规则只在一个权威文件完整定义。
- OpenAPI 负责具体接口、字段和枚举；API 设计文档不维护接口清单副本。
- 产品 Roadmap 以 GitHub Issues、Milestones 和已批准 Spec 为准。
- 工程目录和实现入口以工程 README、模块 README 和实际代码为准。
- 测试报告和 Issue 收口记录不能替代可重复执行的测试规范。
- Archive 只用于追溯，不进入默认阅读集合。
- 上层文件只保留摘要与链接。
- 可自动验证的规则应同步脚本、测试或 CI。

## 5. 新增、合并与清理

新增文档前确认：是否已有同义文件、属于哪类目录、是否具有长期维护价值。

当内容已经被权威文档吸收时：

- 仍有历史决策价值：移入 `docs/archive/`；
- 只是会话交接、进展、Todo、接口副本或旧目录快照：直接删除；
- 包含可复用经验：合并到 `docs/experience/`；
- 包含可执行强制规则：合并到对应 `AGENTS.md` 或专项规范；
- Issue、Slice 和阶段报告：完成后归档，不继续出现在当前规范目录。

当一条规则需要同时修改三个以上文件、同一主题出现第三份规范或 AI 无法判断权威来源时，应立即整理。
