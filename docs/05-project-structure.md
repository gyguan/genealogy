# 05. 项目目录结构

## 仓库结构

```text
.
├── README.md
├── docs/
├── prototype/
├── backend/
├── frontend/
├── database/
├── scripts/
└── .github/workflows/
```

## 后端结构建议

```text
backend/
└── genealogy-backend/
    ├── pom.xml
    ├── src/main/java/com/genealogy/
    │   ├── common/
    │   ├── auth/
    │   ├── clan/
    │   ├── branch/
    │   ├── generation/
    │   ├── person/
    │   ├── relationship/
    │   ├── source/
    │   ├── review/
    │   ├── tree/
    │   ├── member/
    │   ├── importexport/
    │   └── operationlog/
    └── src/main/resources/
        ├── application.yml
        └── db/migration/
```

## 前端结构建议

正式前端采用 **React + TypeScript + Vite + Ant Design**，按业务特性组织页面，基础 UI 通过 `shared/ui` 做 Ant Design 薄封装。

```text
frontend/
└── genealogy-web/
    ├── package.json
    ├── src/
    │   ├── app/                    应用外壳、Ant Design Layout/Menu/Tabs/主题配置
    │   ├── features/               按业务特性拆分页面
    │   │   ├── auth/               登录认证
    │   │   ├── branches/           支派管理
    │   │   ├── clans/              宗族管理
    │   │   ├── experience/         产品化族谱体验页面
    │   │   ├── generations/        字辈管理
    │   │   ├── home/               族谱首页统计看板
    │   │   ├── logs/               日志审计
    │   │   ├── members/            成员权限
    │   │   ├── mvp1/               建谱向导
    │   │   ├── persons/            人物档案
    │   │   ├── relationships/      关系管理
    │   │   └── tree/               世系图谱
    │   ├── shared/
    │   │   ├── api/                API Client、通用响应处理
    │   │   ├── context/            工作空间、宗族、人物上下文
    │   │   └── ui/                 基于 Ant Design 的共享 UI 薄封装
    │   ├── styles.css              历史通用样式，逐步收敛
    │   ├── experience.css          产品化页面补充样式
    │   ├── mvp1-wizard.css         建谱向导/人物档案业务布局样式
    │   ├── lineage-tree.css        世系树谱业务可视化样式
    │   ├── compact-ui.css          紧凑模式与首页看板样式
    │   └── antd-bridge.css         Ant Design 兼容与全局规范化样式
```

## 前端组件规范

1. 优先使用 Ant Design 组件和设计模式。
2. `shared/ui` 只做统一样式、统一交互、统一空态的轻封装，不能另起一套基础组件体系。
3. 页面内不得新增自研 Button、Table、Form、Input、Select、Card、Tabs、Alert 等基础组件。
4. 仅当 Ant Design 无法满足业务表达时，允许自定义组件或样式，例如世系树节点、族谱关系连线、图谱画布和特殊统计图表。
5. 自定义样式必须保持 Ant Design 的颜色、圆角、间距、弱边框、轻阴影和语义状态规范。

## 原型目录

```text
prototype/
├── README.md
└── index.html
```

`prototype` 目录保留早期可点击原型，正式前端以 `frontend/genealogy-web` 的 React + Ant Design 实现为准。

## 数据库目录

```text
database/
├── README.md
└── schema-draft.sql
```

## 目录职责

| 目录 | 职责 |
|---|---|
| docs | 产品、需求、架构、接口、工程设计文档 |
| prototype | 可点击低保真/中保真原型，仅作早期演示参考 |
| backend | 后端工程代码 |
| frontend | React + Ant Design 前端工程代码 |
| database | 数据库脚本、初始化数据、迁移草案 |
| scripts | 本地启动、构建、辅助脚本 |
| .github/workflows | CI 配置预留 |
