# Genealogy · 中国式族谱系统

面向宗亲会、修谱委员会、支派负责人、采集员和普通族人的中国式族谱管理系统。

项目目标不是简单绘制家谱树，而是建设一个覆盖 **宗族主数据、支派房支、人物档案、亲属关系、证据来源、协作审核、世系展示、简版导出** 的数字化修谱平台。

## MVP 1 定位

MVP 1 聚焦“让一个宗族真正上线使用”的核心闭环：

```text
创建宗族 → 建立支派 → 维护字辈 → 录入人物 → 建立关系 → 绑定来源 → 提交审核 → 查看世系 → 导出简版族谱
```

## 文档目录

- [00. 项目概览](docs/00-project-overview.md)
- [01. MVP 1 需求设计](docs/01-mvp1-requirements.md)
- [02. 原型设计说明](docs/02-prototype-design.md)
- [03. 数据模型设计](docs/03-domain-model.md)
- [04. 技术架构建议](docs/04-technical-architecture.md)
- [05. 项目目录结构](docs/05-project-structure.md)
- [06. Roadmap](docs/06-roadmap.md)
- [07. 接口模型设计](docs/07-api-design.md)
- [08. 后端工程结构设计](docs/08-backend-structure.md)
- [09. 中国式族谱权限管理方案](docs/09-permission-management.md)
- [10. 前端统一设计与实现规范（Ant Design 版）](docs/10-frontend-design-guidelines.md)
- [21. 前端页面模式规范](docs/21-frontend-page-pattern-spec.md)
- [22. 多 TAB 页面设计与实现规范](docs/22-multi-tab-page-spec.md)
- [数据库开发与 Flyway 迁移规范](docs/database-development-standard.md)
- [AI 工程流程适配方案](docs/ai/ai-engineering-workflow.md)
- [AI Skill 映射表](docs/ai/skill-mapping.md)
- [通用 AI 提问模板库](docs/ai/prompt-templates.md)
- [Issue 创建、分组与执行顺序规范](docs/ai/issue-creation-standard.md)
- [聊天式 GitHub 开发与任务看板指南](docs/ai/chat-driven-github-workflow.md)
- [Issue 交付耗时经验](docs/ai/issue-delivery-cost-experience.md)
- [Issue 实现、状态持久化与中断恢复规范](docs/ai/issue-execution-governance.md)
- [执行任务看板耗时记录规范](docs/ai/task-duration-standard.md)
- [时间展示规范（北京时间）](docs/ai/time-display-standard.md)

## AI 辅助研发入口

规则采用分层结构，AI 应先读取根规则，再读取目标目录最近的 `AGENTS.md`：

- 全仓优先级、P0 红线与 P1 门禁：`AGENTS.md`
- 后端分层、数据库、权限与测试细则：`backend/genealogy-backend/AGENTS.md`
- 数据库对象、SQL 与 Flyway 迁移规范：`docs/database-development-standard.md`
- 前端组件、契约、交互与性能细则：`frontend/genealogy-web/AGENTS.md`
- AI 工程流程：`docs/ai/ai-engineering-workflow.md`
- AI Skill 映射表：`docs/ai/skill-mapping.md`
- 通用 AI 提问模板库：`docs/ai/prompt-templates.md`
- 需求执行路径：分析需求 → 拆分 Issue → 实现 Issue → 继续 Issue / PR → 修复 CI / 处理 Review → 收尾 PR
- ChatGPT 页面直连 GitHub 远程协作模式：默认不依赖本地开发环境、本地数据库或本地服务
- Issue 交付耗时经验：`docs/ai/issue-delivery-cost-experience.md`
- Issue 创建、分组、统一前缀与执行顺序：`docs/ai/issue-creation-standard.md`
- 聊天式开发、短指令和任务看板：`docs/ai/chat-driven-github-workflow.md`
- Issue 启动门禁、Draft PR 持久化与中断恢复：`docs/ai/issue-execution-governance.md`
- 任务活跃耗时、外部等待与历史任务过渡：`docs/ai/task-duration-standard.md`
- 时间与时区展示：`docs/ai/time-display-standard.md`
- AI 任务、执行看板与恢复文件：`tasks/`
- PR 质量门禁模板：`.github/pull_request_template.md`
- Issue 实现 PR 自动结构与耗时检查：`.github/workflows/issue-delivery-governance.yml`
- Flyway 迁移自动检查：`.github/workflows/database-migration-governance.yml`

规则冲突时，依次以 P0 全仓红线、已批准的 Issue/Spec、P1 门禁、目录级规则和推荐实践为准。需求执行应先判断当前路径：分析需求只输出结论和建议，不改仓库；拆分 Issue 只建单和维护执行顺序，不实现代码；实现 Issue 必须建立任务文件、远程分支、Draft PR 和 Issue 关联；继续 Issue 或 PR 必须从 GitHub 现场恢复，先输出恢复检查点，再推进下一步最小任务。后续所有操作默认通过 ChatGPT 页面直连 GitHub 完成，不要求或尝试连接本地环境；如存在只能本地执行的验证，只能标记为建议命令，不能视为已验证结果。所有面向用户的时间统一使用北京时间；执行任务看板记录已经发生的实际活跃耗时，不使用预计时间或无依据的补算值。

## 可点击原型

原型入口：`prototype/index.html`

## 推荐技术栈

```text
后端：Java 17 + Spring Boot 3.x
数据库：PostgreSQL
ORM：Spring Data JPA，按模块需要可补充 MyBatis / MyBatis Plus
认证：JWT
文件：本地存储起步，预留 MinIO
前端：React + TypeScript + Vite
前端设计体系：Ant Design 5.x
前端组件原则：统一优先使用 Ant Design 组件和设计模式；仅当 Ant Design 无法满足图谱、树谱画布、族谱业务可视化等特殊场景时，才允许自定义组件或样式扩展
原型：prototype 目录保留早期 HTML 原型；正式前端以 React + Ant Design 为准
```

## MVP 1 建设原则

1. 不把族谱系统做成简单家谱树工具。
2. 人物和关系分离，关系作为独立领域对象。
3. 正式数据不能直接修改，必须走审核。
4. 人物和关系都要能绑定来源证据。
5. 在世人员敏感信息默认脱敏。
6. 导入数据先进入草稿，不直接进入正式谱库。
7. 先做模块化单体，后续再拆服务。
