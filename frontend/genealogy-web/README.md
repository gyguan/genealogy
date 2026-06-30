# Genealogy Web 商用版前端

该目录是 MVP1 的正式前端工程。当前采用 **React + TypeScript + Vite + Ant Design 5.x**，实现特性化目录组织、统一 API Client、Ant Design 中后台设计体系和产品化族谱交互体验。

## 一、技术栈

```text
React
TypeScript
Vite
Ant Design 5.x
Feature-based Architecture
```

## 二、前端设计与组件原则

1. **Ant Design 优先**：所有基础交互和中后台页面结构优先使用 Ant Design 组件和设计模式。
2. **不得重复自研基础组件**：Button、Input、Select、Form、Table、Card、Tabs、Menu、Descriptions、Alert、Empty 等基础能力统一使用 Ant Design。
3. **共享组件薄封装**：`shared/ui` 只负责统一项目级用法和默认样式，底层必须基于 Ant Design。
4. **特殊场景例外**：仅当 Ant Design 无法满足时允许自定义，例如世系树节点、族谱关系连线、树谱画布、业务统计图表等族谱专属可视化。
5. **样式统一收敛**：自定义样式必须遵循 Ant Design 的主色、语义色、弱边框、轻阴影、圆角、间距和信息层级。

## 三、目录结构

```text
src/
├── app/                    应用外壳、Ant Design Layout/Menu/Tabs/主题配置
├── features/               按业务特性拆分页面
│   ├── auth/               登录认证
│   ├── branches/           支派管理
│   ├── clans/              宗族管理
│   ├── experience/         产品化族谱体验页面
│   ├── generations/        字辈管理
│   ├── home/               族谱首页统计看板
│   ├── logs/               日志审计
│   ├── members/            成员权限
│   ├── mvp1/               建谱向导
│   ├── persons/            人物档案
│   ├── relationships/      关系管理
│   └── tree/               世系图谱
├── shared/                 共享基础能力
│   ├── api/                API Client、通用响应类型
│   ├── context/            工作空间、宗族、人物上下文
│   └── ui/                 基于 Ant Design 的通用 UI 薄封装
├── styles.css              历史通用样式，逐步收敛
├── experience.css          产品化族谱体验样式
├── mvp1-wizard.css         建谱向导/人物档案业务布局样式
├── lineage-tree.css        世系树谱业务可视化样式
├── compact-ui.css          紧凑模式与首页看板样式
└── antd-bridge.css         Ant Design 兼容与全局规范化样式
```

## 四、启动方式

先启动后端：

```bash
cd backend/genealogy-backend
docker compose up -d
mvn spring-boot:run
```

启动前端：

```bash
cd frontend/genealogy-web
npm install
npm run dev
```

访问：

```text
http://localhost:5174
```

开发环境通过 Vite 代理访问后端服务，页面不展示 API 地址、Token 或其他开发配置项。

## 五、产品化页面设计

默认入口为“族谱首页”，并按照国内族谱产品应具备的核心体验重新组织页面：

```text
族谱首页：统计看板、图表分布、下钻明细
建谱向导：宗族、支派、字辈、人物、关系、来源、审核和世系闭环
世系图谱：搜索人物，以树谱形式展示上溯祖先、中心人物和下延后代
人物档案：按条件检索人物，查看详情与编辑档案分离
来源资料库：族谱原文、地方志、墓志照片、口述记录和证据绑定
修谱工作台：导入、重复合并、缺失补齐、字辈校验、关系冲突
审核中心：人物变更、关系变更、来源复核、支派变更、字辈方案变更
宗族文化：姓氏源流、堂号、家训、谱序、迁徙路线、祠堂
基础数据管理：登录认证、宗族、成员权限、支派、字辈、关系、日志
```

## 六、真实接口迁移情况

产品化页面已经去除静态示例人物、示例来源和示例审核任务，不再展示模拟数据。当前规则为：

```text
接口有数据：展示真实业务数据
接口无数据：展示空态引导
接口失败：展示错误提示
```

当前已接入：

```text
GET  /clans
GET  /clans/{clanId}/branches
GET  /persons/search
GET  /clans/{clanId}/persons
GET  /clans/{clanId}/sources
GET  /clans/{clanId}/review-tasks/pending
GET  /logs/operations/stats
GET  /persons/{personId}/relationships
GET  /tree/person/{personId}/family
GET  /tree/ancestors
GET  /tree/descendants
POST /persons/{personId}/submit-review
POST /review-tasks/{taskId}/approve
POST /review-tasks/{taskId}/reject
POST /clans/{clanId}/relationships/check-conflict
```

后端暂无专用接口的内容，例如宗族文化、迁徙路线、祠堂、家训等，当前仅使用宗族名称、堂号、发源地、支派名称等真实基础信息展示空态骨架，后续需要补充文化资料相关后端能力。

## 七、导航整合

主导航保留产品化主流程：

```text
族谱首页
建谱向导
世系图谱
人物档案
来源资料库
修谱工作台
审核中心
宗族文化
基础数据管理
```

基础数据管理仅保留不与一级菜单重复的后台配置能力：登录认证、宗族、成员权限、支派、字辈、关系、日志。

## 八、商用展示原则

商用版前端不直接展示接口响应 JSON，而是按业务视角展示：

```text
Ant Design 中后台布局
统计看板
树谱画布
人物档案抽屉
来源证据流
审核任务面板
资料完整度
生命事件时间线
宗族文化卡片
操作反馈
真实空态引导
```

## 九、构建

```bash
npm run build
```

构建产物：

```text
dist/
```

如需单独做 TypeScript 检查：

```bash
npm run typecheck
```

## 十、覆盖范围

当前前端覆盖范围：

```text
产品化体验：族谱首页 / 建谱向导 / 世系图谱 / 人物档案 / 来源资料库 / 修谱工作台 / 审核中心 / 宗族文化
基础数据管理：登录认证 / 宗族 / 成员权限 / 支派 / 字辈 / 关系 / 日志
```

后续新增前端能力应优先进入 `frontend/genealogy-web/src/features/*`，并默认遵循 Ant Design 组件体系。
