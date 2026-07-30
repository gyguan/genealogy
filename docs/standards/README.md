# Genealogy 规范权威目录

本文件只做规范导航和职责划分，不复制规范正文。文档分类总览见 `docs/README.md`。

## 1. 文档职责

| 类型 | 承载内容 |
|---|---|
| 根 `AGENTS.md` | 全仓优先级、P0 红线、P1 门禁和任务路由 |
| 目录级 `AGENTS.md` | 当前工程可执行规则 |
| 专项规范 | 数据库、API、权限、日志、页面模式等领域规则 |
| 经验文档 | 原因、阈值、案例、偏离条件和 Review 方法 |
| 工程 README | 启动、目录、验证和阅读入口 |
| 模块 README | 入口、调用链、不变量、状态和性能边界 |
| Issue / Spec | 当前变更目标、范围、兼容与验收 |

## 2. 权威文件索引

| 主题 | 权威文件 | 级别 |
|---|---|---|
| 全仓规则与业务红线 | `AGENTS.md` | P0/P1 |
| 后端编码与分层 | `backend/genealogy-backend/AGENTS.md` | P2 |
| 前端编码与状态管理 | `frontend/genealogy-web/AGENTS.md` | P2 |
| 数据库与 Flyway | `docs/backend/database-and-flyway.md` | P1/P2 |
| 后端环境配置 | `docs/backend/environment-configuration.md` | P1/P2 |
| Repository 查询性能 | `docs/backend/repository-query-performance.md` | P2 |
| 日志、审计与可观测性 | `docs/backend/observability-and-audit.md` | P2 |
| 前端设计体系 | `docs/frontend/design-system.md` | P2 |
| 前端页面模式 | `docs/frontend/page-patterns.md` | P2 |
| 多 Tab 页面模式 | `docs/frontend/multi-tab-pages.md` | P2 |
| API 契约 | `docs/api/openapi.json` | P1 |
| 数据模型与领域规则 | `docs/03-domain-model.md` | P1/P2 |
| 技术架构与模块边界 | `docs/04-technical-architecture.md`、`docs/08-backend-structure.md` | P2 |
| 权限、隐私与审核 | `docs/09-permission-management.md` | P1/P2 |
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
| 普通后端实现 | 根规则 → 后端规则 → 模块 README → Issue/Spec |
| 数据库变更 | 上述集合 + 数据库规范 + 环境配置 |
| 后端性能治理 | 后端规则 + Repository 性能规范 + 测试 |
| 普通前端实现 | 根规则 → 前端规则 → Feature README → Issue/Spec |
| 页面视觉整改 | 上述集合 + 设计体系 + 页面模式 |
| API 变更 | 根规则 + OpenAPI + 前后端目录规则 |
| 权限、隐私、审核 | 根规则 + 权限规范 + 相关模块 README |
| Issue 创建 | 根规则 + Issue 创建规范 + Issue 规模经验 |
| Issue 实现或恢复 | 根规则 + Issue 执行规范 + 当前 PR/CI 现场 |

## 4. 单一权威来源

- 同一强制规则只在一个权威文件完整定义。
- 上层文件只保留摘要和链接。
- README 不复制编码规范。
- 经验文档不重新定义 P0/P1 红线。
- 可自动验证的规则应同步脚本、测试或 CI。

## 5. 新增和清理文档

新增文档前先确认：是否已有同义文件、属于哪类目录、是否确有长期维护价值。

删除或归档前确认：替代文件、引用位置、代码和 CI 是否仍依赖、是否具有历史决策价值。历史资料移入 `archive/`，并注明状态和替代文档。

当一条规则需要同时修改三个以上文件、同一主题出现第三份规范或 AI 无法判断权威来源时，应立即整理。
