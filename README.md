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
- [AI 工程流程适配方案](docs/ai/ai-engineering-workflow.md)
- [AI Skill 映射表](docs/ai/skill-mapping.md)
- [通用 AI 提问模板库](docs/ai/prompt-templates.md)
- [聊天式 GitHub 开发与任务看板指南](docs/ai/chat-driven-github-workflow.md)
- [时间展示规范（北京时间）](docs/ai/time-display-standard.md)

## AI 辅助研发入口

- 项目级 Agent 规则：`AGENTS.md`
- AI 工程流程：`docs/ai/ai-engineering-workflow.md`
- AI Skill 映射表：`docs/ai/skill-mapping.md`
- 通用 AI 提问模板库：`docs/ai/prompt-templates.md`
- 聊天式开发、短指令、任务看板与中断恢复：`docs/ai/chat-driven-github-workflow.md`
- 时间与时区展示：`docs/ai/time-display-standard.md`
- AI 临时任务工作区：`tasks/`
- PR 质量门禁模板：`.github/pull_request_template.md`

AI Coding Agent 参与非平凡变更时，应先阅读 `AGENTS.md`，再按 `docs/ai/ai-engineering-workflow.md` 和 `docs/ai/skill-mapping.md` 选择上下文、拆分任务、执行验证和提交 Review。通过聊天连接 GitHub 执行长任务时，还应遵循 `docs/ai/chat-driven-github-workflow.md`，使用一句话指令、任务看板、阶段反馈和恢复检查点。所有面向用户的时间统一按 `docs/ai/time-display-standard.md` 转换并标注为北京时间。

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