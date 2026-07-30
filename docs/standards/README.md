# Genealogy 规范权威目录

本文件只做规范导航和职责划分，不复制规范正文。完整文档分类见 `docs/README.md`。

## 1. 文档职责

| 类型 | 承载内容 |
|---|---|
| 根 `AGENTS.md` | 全仓优先级、P0 红线、P1 门禁和任务路由 |
| 目录级 `AGENTS.md` | 当前工程可执行规则 |
| 专项规范 | API、权限、数据库、日志、页面模式等领域规则 |
| 产品文档 | 产品范围、验收目标和领域语义 |
| 架构文档 | 系统分层、模块边界和长期技术决策 |
| 经验文档 | 原因、阈值、案例、偏离条件和 Review 方法 |
| 工程 README | 启动、目录、验证和阅读入口 |
| 模块 README | 入口、调用链、不变量、状态和性能边界 |
| Issue / Spec | 当前变更目标、范围、兼容和验收 |

## 2. 权威文件索引

| 主题 | 权威文件 | 级别 |
|---|---|---|
| 全仓规则与业务红线 | `AGENTS.md` | P0/P1 |
| 后端编码与分层 | `backend/genealogy-backend/AGENTS.md` | P2 |
| 前端编码与状态管理 | `frontend/genealogy-web/AGENTS.md` | P2 |
| MVP 1 范围与验收 | `docs/product/mvp1-scope-and-acceptance.md` | 产品基线 |
| 领域对象与核心不变量 | `docs/product/domain-model.md` | P1/P2 |
| 系统架构与模块边界 | `docs/architecture/system-architecture.md` | P2 |
| API 权威契约 | `docs/api/openapi.json` | P1 |
| API 设计原则 | `docs/standards/api-design.md` | P1/P2 |
| 权限、隐私与审核语义 | `docs/standards/authorization-and-privacy.md` | P1/P2 |
| 数据库与 Flyway | `docs/backend/database-and-flyway.md` | P1/P2 |
| 后端环境配置 | `docs/backend/environment-configuration.md` | P1/P2 |
| Repository 查询性能 | `docs/backend/repository-query-performance.md` | P2 |
| 日志、审计与可观测性 | `docs/backend/observability-and-audit.md` | P2 |
| 前端设计体系 | `docs/frontend/design-system.md` | P2 |
| 前端页面模式 | `docs/frontend/page-patterns.md` | P2 |
| 多 Tab 页面模式 | `docs/frontend/multi-tab-pages.md` | P2 |
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
| 产品范围或验收 | 根规则 + MVP 范围文档 + Issue/Spec |
| 领域模型变更 | 根规则 + 领域模型 + 系统架构 + 相关模块 README |
| 普通后端实现 | 根规则 → 后端规则 → 模块 README → Issue/Spec |
| 数据库变更 | 上述集合 + 数据库规范 + 环境配置 |
| 后端性能治理 | 后端规则 + Repository 性能规范 + 测试 |
| 普通前端实现 | 根规则 → 前端规则 → Feature README → Issue/Spec |
| 页面视觉整改 | 上述集合 + 设计体系 + 页面模式 |
| API 变更 | 根规则 + OpenAPI + API 设计规则 + 前后端目录规则 |
| 权限、隐私、审核 | 根规则 + 权限隐私规范 + 相关模块 README |
| Issue 创建 | 根规则 + Issue 创建规范 + Issue 规模经验 |
| Issue 实现或恢复 | 根规则 + Issue 执行规范 + 当前 PR/CI 现场 |

## 4. 单一权威来源

- 同一强制规则只在一个权威文件完整定义。
- OpenAPI 负责具体接口、字段和枚举；API 设计文档不维护接口清单副本。
- 产品 Roadmap 以 GitHub Issues、Milestones 和已批准 Spec 为准。
- 工程目录和实现入口以工程 README、模块 README 和实际代码为准。
- 上层文件只保留摘要与链接。
- README 不复制完整编码规范。
- 经验文档不重新定义 P0/P1 红线。
- 可自动验证的规则应同步脚本、测试或 CI。

## 5. 新增、合并与清理

新增文档前确认：是否已有同义文件、属于哪类目录、是否具有长期维护价值。

当内容已经被权威文档吸收时：

- 仍有历史决策价值：移入 `docs/archive/` 并标明状态；
- 只是重复导航或旧目录快照：直接删除；
- 包含可复用经验：合并到 `docs/experience/`；
- 包含可执行强制规则：合并到对应 `AGENTS.md` 或专项规范。

当一条规则需要同时修改三个以上文件、同一主题出现第三份规范或 AI 无法判断权威来源时，应立即整理。
