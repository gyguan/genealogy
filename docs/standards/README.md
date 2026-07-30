# Genealogy 规范权威目录

本目录用于回答三个问题：

1. 某类规则的权威文件在哪里；
2. 当前任务需要读取哪些规范；
3. 新增或修改规则时应更新哪个文件。

本文件只做导航和职责划分，不复制规范正文。

## 1. 文档职责

| 文档类型 | 应承载内容 | 不应承载内容 |
|---|---|---|
| 根 `AGENTS.md` | 全仓优先级、P0 红线、P1 门禁、任务路由 | 语言或框架的详细编码示例 |
| 目录级 `AGENTS.md` | 当前工程可执行的强制规则 | 大量原因解释和完整案例库 |
| 专项规范 | 数据库、API、权限、日志、页面模式等具体领域规则 | 全仓任务流程的重复副本 |
| 经验文档 | 为什么这样做、复杂度阈值、反例和 Review 方法 | 与 `AGENTS.md` 重复的强制规则正文 |
| 工程 README | 启动、目录、验证和阅读入口 | 完整编码规范 |
| 模块 README | 入口、调用链、不变量、状态和性能边界 | 全仓通用规则 |
| Issue / Spec | 当前变更目标、范围、验收和兼容要求 | 长期全仓规范 |

## 2. 权威文件索引

| 主题 | 权威文件 | 范围 | 级别 |
|---|---|---|---|
| 全仓规则优先级与业务红线 | `AGENTS.md` | 全仓 | P0/P1 |
| 后端编码与分层 | `backend/genealogy-backend/AGENTS.md` | 后端 | P2 |
| 前端编码与状态管理 | `frontend/genealogy-web/AGENTS.md` | 前端 | P2 |
| 后端代码可理解性经验 | `docs/ai/code-understanding-and-maintainability-standard.md` | 后端 | P3 |
| 前端代码可理解性经验 | `docs/ai/frontend-code-understanding-and-maintainability-standard.md` | 前端 | P3 |
| 数据库对象、SQL 与 Flyway | `docs/database-development-standard.md` | 数据库 | P1/P2 |
| 后端 Repository 性能 | `docs/backend-repository-performance-governance.md` | 后端查询 | P2 |
| 后端日志、审计与可观测性 | `docs/backend-quality-observability-governance.md` | 后端运行时 | P2 |
| 后端环境配置 | `docs/backend-environment-configuration.md` | 后端配置 | P1/P2 |
| API 契约 | `docs/api/openapi.json` | 前后端 | P1 |
| API 设计原则 | `docs/07-api-design.md` | 前后端 | P2 |
| 数据模型与领域规则 | `docs/03-domain-model.md` | 领域 | P1/P2 |
| 技术架构与模块边界 | `docs/04-technical-architecture.md`、`docs/08-backend-structure.md` | 全仓 | P2 |
| 权限、隐私与审计语义 | `docs/09-permission-management.md` | 全仓 | P1/P2 |
| 前端视觉与组件设计 | `docs/10-frontend-design-guidelines.md` | 前端 UI | P2 |
| 前端页面模式 | `docs/21-frontend-page-pattern-spec.md` | 前端页面 | P2 |
| 多 Tab 页面模式 | `docs/22-multi-tab-page-spec.md` | 前端页面 | P2 |
| Issue 创建与拆分 | `docs/ai/issue-creation-standard.md` | 任务治理 | P1 |
| Issue 实现与恢复 | `docs/ai/issue-execution-governance.md` | 任务治理 | P1 |
| Issue 流程与交付强度 | `docs/ai/issue-delivery-cost-experience.md` | 任务治理 | P2/P3 |
| 聊天式开发与看板 | `docs/ai/chat-driven-github-workflow.md` | 任务治理 | P2 |
| 活跃耗时记录 | `docs/ai/task-duration-standard.md` | 任务治理 | P1/P2 |
| 时间与时区 | `docs/ai/time-display-standard.md` | 全仓 | P1 |

## 3. 工程与模块导航

| 范围 | 导航入口 |
|---|---|
| 后端工程 | `backend/genealogy-backend/README.md` |
| 后端模块 | `backend/genealogy-backend/src/main/java/com/genealogy/README.md` |
| 前端工程 | `frontend/genealogy-web/README.md` |
| 前端 Feature | `frontend/genealogy-web/src/features/README.md` |

复杂模块可以增加局部 README，但只记录该模块稳定的入口、调用链、不变量、状态、权限、数据范围、性能边界和必跑测试。

## 4. 任务读取矩阵

| 任务 | 最小读取集合 |
|---|---|
| 普通后端实现 | 根 `AGENTS.md` → 后端 `AGENTS.md` → 后端模块 README → Issue/Spec |
| 数据库变更 | 上述集合 + 数据库规范 + 环境配置规范 |
| 后端性能治理 | 后端规则 + Repository 性能规范 + 对应 QueryRepository 与测试 |
| 普通前端实现 | 根 `AGENTS.md` → 前端 `AGENTS.md` → Feature README → Issue/Spec |
| 页面视觉整改 | 上述集合 + 前端设计规范 + 页面模式规范 |
| API 变更 | 根规则 + OpenAPI + API 设计 + 前后端目录规则 |
| 权限、隐私、审核 | 根规则 + 权限规范 + 相关前后端规则与模块 README |
| Issue 创建 | 根规则 + Issue 创建规范 + 交付强度经验 |
| Issue 实现或恢复 | 根规则 + Issue 执行规范 + 任务看板与当前 PR/CI 现场 |

禁止为了“保险”无差别加载全部规范；按任务范围选择最小充分集合。

## 5. 规则变更流程

新增或修改规则时：

1. 在本目录确认权威文件；
2. 搜索是否已有同义规则；
3. 只修改权威文件正文；
4. 上层入口仅在导航或摘要失效时更新；
5. 检查是否与 P0、Issue/Spec 或现有自动门禁冲突；
6. 在 PR 中说明新增、替换、删除和保留的规则；
7. 涉及可自动验证的规则时，同步更新脚本、测试或 CI 门禁。

## 6. 去重判断

以下情况属于应整理的重复：

- 两个文件都完整定义相同的强制规则；
- 同一阈值、命名或流程在多个文件中分别维护；
- README 复制 `AGENTS.md` 的完整编码规则；
- 根规则复制专项文档的详细执行步骤；
- 经验文档再次定义 P0/P1 业务红线。

以下情况不属于重复：

- 上层文件用一句摘要链接到权威文件；
- 模块 README 记录全仓规则在本模块的具体不变量；
- 经验文档提供强制规则背后的原因、反例和偏离条件；
- Issue/Spec 针对当前变更明确更严格的验收标准。

## 7. 定期维护

建议在以下时机检查规范：

- 新增第三套同类规范之前；
- 一条规则需要同时修改三个以上文件时；
- AI 或开发者对权威来源产生歧义时；
- CI 门禁与文档描述不一致时；
- 每个大型重构阶段结束时。
