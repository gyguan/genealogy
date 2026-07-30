# Genealogy · 中国式族谱系统

面向宗亲会、修谱委员会、支派负责人、采集员和普通族人的中国式族谱管理系统。

项目目标不是简单绘制家谱树，而是建设一个覆盖 **宗族主数据、支派房支、人物档案、亲属关系、证据来源、协作审核、世系展示、简版导出** 的数字化修谱平台。

## MVP 1 定位

MVP 1 聚焦“让一个宗族真正上线使用”的核心闭环：

```text
创建宗族 → 建立支派 → 维护字辈 → 录入人物 → 建立关系 → 绑定来源 → 提交审核 → 查看世系 → 导出简版族谱
```

## 文档入口

### 产品与架构

- [项目概览](docs/00-project-overview.md)
- [MVP 1 需求设计](docs/01-mvp1-requirements.md)
- [数据模型设计](docs/03-domain-model.md)
- [技术架构建议](docs/04-technical-architecture.md)
- [项目目录结构](docs/05-project-structure.md)
- [Roadmap](docs/06-roadmap.md)
- [接口模型设计](docs/07-api-design.md)
- [后端工程结构设计](docs/08-backend-structure.md)
- [权限管理方案](docs/09-permission-management.md)

### 工程入口

- [后端工程 README](backend/genealogy-backend/README.md)
- [后端模块导航](backend/genealogy-backend/src/main/java/com/genealogy/README.md)
- [前端工程 README](frontend/genealogy-web/README.md)
- [前端 Feature 导航](frontend/genealogy-web/src/features/README.md)

### 规范入口

- [规范权威目录](docs/standards/README.md)
- [数据库与 Flyway 迁移规范](docs/database-development-standard.md)
- [前端统一设计与实现规范](docs/10-frontend-design-guidelines.md)
- [前端页面模式规范](docs/21-frontend-page-pattern-spec.md)
- [多 TAB 页面规范](docs/22-multi-tab-page-spec.md)
- [后端代码可理解性经验](docs/ai/code-understanding-and-maintainability-standard.md)
- [前端代码可理解性经验](docs/ai/frontend-code-understanding-and-maintainability-standard.md)

### AI 与 Issue 治理

- [AI 工程流程](docs/ai/ai-engineering-workflow.md)
- [Issue 创建与拆分](docs/ai/issue-creation-standard.md)
- [Issue 实现与恢复](docs/ai/issue-execution-governance.md)
- [Issue 交付强度经验](docs/ai/issue-delivery-cost-experience.md)
- [聊天式 GitHub 开发](docs/ai/chat-driven-github-workflow.md)
- [任务耗时记录](docs/ai/task-duration-standard.md)
- [时间展示规范](docs/ai/time-display-standard.md)
- [AI Skill 映射](docs/ai/skill-mapping.md)
- [通用 AI 提问模板](docs/ai/prompt-templates.md)

## AI 辅助研发入口

最小阅读顺序：

```text
根 AGENTS.md
  → docs/standards/README.md
  → 当前工程最近的 AGENTS.md
  → 工程 / 模块 README
  → 当前 Issue / Spec
```

按任务选择最小充分规范集合，不无差别加载全部文档。规则冲突和权威来源以根 `AGENTS.md` 与规范权威目录为准。

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
