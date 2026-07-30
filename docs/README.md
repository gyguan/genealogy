# Genealogy Documentation

`docs/` 按职责分类，文件名使用英文 kebab-case。规范的唯一权威来源见 [`standards/README.md`](standards/README.md)。

## 目录结构

```text
docs/
├── README.md                 文档总入口
├── product/                 产品范围、领域模型和稳定业务语义
├── architecture/            系统架构、状态机和长期技术边界
├── standards/               规范权威索引及跨工程专项规则
├── backend/                 数据库、配置、性能、日志和扩展规范
├── frontend/                设计体系、页面、查询和反馈模式
├── testing/                 测试基线、验收、容量、安全和稳定性
├── deploy/                  部署、环境联调和运维手册
├── experience/              工程经验、阈值、案例和 Review 方法
├── governance/              Issue、任务、时间和协作流程
├── ai/                      AI 工程流程、Skill 与 Prompt
├── api/                     OpenAPI 权威契约和维护说明
└── archive/                 历史方案、阶段交付、原型和测试报告
```

`docs/` 根目录只保留本 README。新专题文档必须直接进入对应分类目录。

## 产品与领域

- [MVP 1 范围与验收](product/mvp1-scope-and-acceptance.md)
- [领域模型](product/domain-model.md)
- [宗族文化领域](product/culture-domain.md)
- [中国式宗法关系](product/ritual-relationships.md)

产品文档回答“系统解决什么问题、包含哪些范围、核心业务语义是什么”，不复制编码规则、目录快照和实时接口清单。

## 系统架构

- [系统架构](architecture/system-architecture.md)
- [认证体系](architecture/authentication.md)
- [Revision 审核闭环](architecture/revision-review-flow.md)
- [Review 状态机与并发一致性](architecture/review-state-machine.md)
- [Revision 追踪标识](architecture/revision-traceability.md)
- [统一权限决策](architecture/unified-access-decision.md)

架构文档记录长期稳定的分层、状态、边界和技术决策。具体代码入口以工程 README、模块 README 和实际代码为准。

## 跨工程规范

- [规范权威目录](standards/README.md)
- [API 设计规则](standards/api-design.md)
- [权限与隐私](standards/authorization-and-privacy.md)
- [ID 字段治理](standards/id-fields.md)
- [人物谱号规则](standards/person-code.md)
- [世系图谱查询契约](standards/lineage-tree-query.md)
- [OpenAPI 权威契约](api/openapi.json)
- [API 契约维护说明](api/README.md)

## 后端规范与指南

- [数据库与 Flyway](backend/database-and-flyway.md)
- [数据库初始化与预置](backend/database-initialization.md)
- [数据库脚本治理](backend/database-script-governance.md)
- [环境配置](backend/environment-configuration.md)
- [持久化框架分阶段迁移](backend/persistence-framework-migration.md)
- [Repository 查询性能](backend/repository-query-performance.md)
- [Tree 查询性能基线](backend/tree-query-performance.md)
- [日志与审计](backend/logging-and-audit.md)
- [架构质量与可观测性](backend/observability-and-audit.md)
- [导入类型扩展](backend/import-type-extension.md)

## 前端规范

- [设计体系](frontend/design-system.md)
- [页面模式](frontend/page-patterns.md)
- [查询类页面](frontend/query-pages.md)
- [提示与反馈](frontend/feedback-patterns.md)
- [多 Tab 页面](frontend/multi-tab-pages.md)

Issue 编号、阶段 Slice 和一次性治理报告不再作为当前前端规范，统一进入 `archive/`。

## 测试与验收

完整导航见 [testing/README.md](testing/README.md)。主要入口：

- [核心功能测试用例](testing/functional-test-cases.md)
- [功能测试覆盖基线](testing/functional-test-coverage.md)
- [功能测试数据规范](testing/functional-test-data.md)
- [功能测试 CI](testing/functional-test-ci.md)
- [MVP 1 API 验收](testing/acceptance/mvp1-api.md)
- [MVP 1 前后端联调](testing/acceptance/mvp1-integration.md)
- [PostgreSQL 集成测试](testing/postgresql-integration-tests.md)
- [视觉发布准出](testing/visual-release.md)
- [多浏览器支持矩阵](testing/multi-browser-support-matrix.md)

## 部署与运维

完整导航见 [deploy/README.md](deploy/README.md)。

- [SAE / RDS / OSS 部署联调](deploy/sae-rds-oss-checklist.md)
- [认证体系部署与运维](deploy/authentication-operations.md)

## 工程经验

- [后端代码可理解性与可维护性](experience/backend-code-maintainability.md)
- [前端代码可理解性与可维护性](experience/frontend-code-maintainability.md)
- [Issue 规模与流程强度](experience/issue-delivery-sizing.md)

经验文档只说明原因、阈值、案例、偏离条件和 Review 方法，不定义 P0/P1 强制规则。

## 研发治理

- [Issue 创建与拆分](governance/issue-creation.md)
- [Issue 实现、恢复与收尾](governance/issue-execution.md)
- [聊天式开发](governance/chat-driven-development.md)
- [任务看板与耗时](governance/task-time-tracking.md)
- [时间与时区](governance/time-and-timezone.md)

## AI 资料

- [AI 工程流程](ai/engineering-workflow.md)
- [Skill 目录](ai/skill-catalog.md)
- [Prompt 模板库](ai/prompt-library.md)

## 历史资料

完整索引见 [archive/README.md](archive/README.md)。归档内容按用途分为：

- `archive/delivery/`：已完成 Issue、Slice、重构和收口记录；
- `archive/prototypes/`：已被正式页面替代的交互原型；
- `archive/testing/`：阶段测试报告、准出结论和一次性执行记录；
- `archive/` 根目录：早期产品与原型总览。

归档文档不再作为当前验收、开发顺序、接口契约或编码规范依据。

## 清理规则

文档满足以下条件之一时可以删除或归档：

1. 已被新的权威文档完整替代；
2. 描述的功能、流程或阶段已经结束；
3. 与当前代码、CI 或契约不一致且无长期维护价值；
4. 只是已完成 Issue、会话交接或阶段进展的临时记录。

仍有决策追溯价值的内容移入 `archive/`；已被 OpenAPI、README、Issue 或现行规范完整吸收且没有独立历史价值的内容直接删除。

## 命名规则

- 使用英文 kebab-case；
- 名称直接表达主题，避免无意义堆叠 `standard`、`governance`、`spec`；
- 长期文档不使用 Issue 编号、阶段序号或 Slice 编号命名；
- 强制规范、经验、导航和历史归档不得混用；
- 文件位置本身应能表达其职责。
