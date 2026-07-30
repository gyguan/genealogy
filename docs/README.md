# Genealogy Documentation

`docs/` 按职责分类，文件名使用英文 kebab-case。规范的唯一权威来源见 [`standards/README.md`](standards/README.md)。

## 目录结构

```text
docs/
├── README.md                 文档总入口
├── product/                 产品范围、验收和领域模型
├── architecture/            系统架构与长期技术边界
├── standards/               规范权威索引及跨工程专项规则
├── backend/                 后端、数据库、配置、性能和可观测性
├── frontend/                前端设计体系与页面模式
├── experience/              工程经验、阈值、案例和 Review 方法
├── governance/              Issue、任务、时间和协作流程
├── ai/                      AI 工程流程、Skill 与 Prompt
├── api/                     OpenAPI 权威契约和生成产物
├── test/                    测试、验收和发布验证资料
└── archive/                 已失效但仍有追溯价值的历史资料
```

`docs/` 根目录不再存放专题文档。新文档必须直接进入对应分类。

## 产品与领域

- [MVP 1 范围与验收](product/mvp1-scope-and-acceptance.md)
- [领域模型](product/domain-model.md)

产品文档回答“系统解决什么问题、包含哪些范围、如何验收”，不复制编码规则和实时接口清单。

## 系统架构

- [系统架构](architecture/system-architecture.md)

架构文档回答“系统如何分层、模块如何协作、哪些边界长期稳定”。具体代码结构以工程 README、模块 README 和实际代码为准。

## 跨工程规范

- [规范权威目录](standards/README.md)
- [API 设计规则](standards/api-design.md)
- [权限与隐私](standards/authorization-and-privacy.md)
- [OpenAPI 权威契约](api/openapi.json)

## 后端规范

- [数据库与 Flyway](backend/database-and-flyway.md)
- [环境配置](backend/environment-configuration.md)
- [Repository 查询性能](backend/repository-query-performance.md)
- [日志、审计与可观测性](backend/observability-and-audit.md)

## 前端规范

- [设计体系](frontend/design-system.md)
- [页面模式](frontend/page-patterns.md)
- [多 Tab 页面](frontend/multi-tab-pages.md)

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

- [早期原型设计](archive/early-prototype-design.md)
- [早期产品 Roadmap](archive/legacy-product-roadmap.md)

归档文档必须在文首标明状态，并链接到当前权威入口。归档内容不能作为当前验收、开发顺序或编码规则依据。

## 清理规则

文档满足以下条件之一时可以删除或归档：

1. 已被新的权威文档完整替代；
2. 描述的功能或流程已下线；
3. 与当前代码、CI 或契约不一致且无长期维护价值；
4. 只是已完成 Issue 的临时执行记录。

具有历史决策价值的内容移入 `archive/`；已经被权威入口完整吸收且没有独立历史价值的内容直接删除。

## 命名规则

- 使用英文 kebab-case；
- 名称直接表达主题，避免无意义堆叠 `standard`、`governance`、`spec`；
- 强制规范、经验、导航和历史归档不得混用；
- 编号只用于确实存在固定阅读顺序的文档集合；
- 文件位置本身应能表达其职责。
