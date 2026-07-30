# Genealogy Documentation

`docs/` 按文档职责分类，文件名使用英文 kebab-case，做到见文知义。规范权威来源见 [`standards/README.md`](standards/README.md)。

## 目录结构

```text
docs/
├── README.md                 文档总入口
├── standards/               规范权威索引与维护规则
├── backend/                 后端、数据库、配置、性能和可观测性规范
├── frontend/                前端设计体系与页面模式
├── experience/              工程经验、复杂度阈值和 Review 方法
├── governance/              Issue、任务、时间和协作流程治理
├── ai/                      AI 工程流程、Skill 与 Prompt 资料
├── api/                     OpenAPI 契约与生成产物
├── test/                    测试、验收和发布验证资料
└── 00-09 / 其他总览文档     产品、需求、架构和领域总览，后续分批迁移
```

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
- [Issue 交付规模与流程强度判断](experience/issue-delivery-sizing.md)

经验文档只说明原因、阈值、案例和 Review 方法，不重复定义 P0/P1 强制规则。

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

## 清理与归档原则

文档只有满足以下条件之一才删除或归档：

1. 已被新的权威文档完整替代；
2. 描述的功能或流程已经下线；
3. 与当前代码、CI 或契约不一致且无历史保留价值；
4. 内容只是某个已完成 Issue 的临时执行记录。

无法确认是否过期时，不直接删除；先在 PR 中列出替代关系、引用位置和保留理由。历史决策仍有追溯价值时移入 `archive/`，并在文首标明状态和替代文档。

## 命名规则

- 文件名使用英文 kebab-case；
- 名称优先表达主题，不使用含义模糊的 `standard`、`governance`、`spec` 堆叠；
- 强制规则、经验、导航和历史归档不可混用；
- 编号只用于确实需要固定阅读顺序的产品或架构总览；
- 新文档应直接进入对应分类目录，不再堆放到 `docs/` 根目录。
