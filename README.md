# Genealogy · 中国式族谱系统

面向宗亲会、修谱委员会、支派负责人、采集员和普通族人的数字化修谱平台，覆盖宗族主数据、支派房支、人物档案、亲属关系、来源证据、协作审核、世系展示与导出。

## MVP 1 主流程

```text
创建宗族 → 建立支派 → 维护字辈 → 录入人物 → 建立关系
→ 绑定来源 → 提交审核 → 查看世系 → 导出族谱
```

## 快速入口

- 文档分类总览：[`docs/README.md`](docs/README.md)
- 规范权威目录：[`docs/standards/README.md`](docs/standards/README.md)
- 后端工程：[`backend/genealogy-backend/README.md`](backend/genealogy-backend/README.md)
- 后端模块导航：[`backend/genealogy-backend/src/main/java/com/genealogy/README.md`](backend/genealogy-backend/src/main/java/com/genealogy/README.md)
- 前端工程：[`frontend/genealogy-web/README.md`](frontend/genealogy-web/README.md)
- 前端 Feature 导航：[`frontend/genealogy-web/src/features/README.md`](frontend/genealogy-web/src/features/README.md)
- API 契约：[`docs/api/openapi.json`](docs/api/openapi.json)

## AI / 开发者阅读顺序

```text
根 AGENTS.md
  → docs/standards/README.md
  → 当前工程最近的 AGENTS.md
  → 工程或模块 README
  → 当前 Issue / Spec
```

按任务读取最小充分集合，不无差别加载全部文档。

## 核心业务原则

1. 人物和关系分离，关系是独立领域对象。
2. 正式数据通过审核闭环生效。
3. 提交人与审核人隔离。
4. 权限以后端和数据范围为准。
5. 在世人员敏感信息默认保护。
6. 人物、关系和来源证据可追溯。
7. 导入数据不直接进入正式库。
8. 先做模块化单体，再按真实边界演进。

## 技术栈

```text
后端：Java 17 + Spring Boot 3 + PostgreSQL + Flyway
前端：React + TypeScript + Vite + Ant Design 5
契约：OpenAPI
测试：Maven / PostgreSQL Integration / Playwright / CI Governance
```
