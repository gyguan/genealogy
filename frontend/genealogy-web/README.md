# Genealogy Web 商用版前端

该目录是 MVP1 的正式前端工程。当前采用 React + TypeScript + Vite，实现特性化目录组织、统一 API Client 和产品化族谱交互体验。

## 一、技术栈

```text
React
TypeScript
Vite
Feature-based Architecture
```

## 二、目录结构

```text
src/
├── app/                    应用外壳、产品导航
├── features/               按业务特性拆分页面
│   ├── auth/               登录认证
│   ├── branches/           支派管理
│   ├── clans/              宗族管理
│   ├── dashboard/          旧版工作台
│   ├── experience/         产品化族谱体验页面
│   ├── generations/        字辈管理
│   ├── importExport/       导入导出
│   ├── logs/               日志审计
│   ├── members/            成员权限
│   ├── persons/            人物档案
│   ├── prototype/          早期单页原型
│   ├── relationships/      关系管理
│   ├── reviews/            审核中心
│   ├── sources/            来源附件
│   └── tree/               旧版世系查询
├── shared/                 共享基础能力
│   ├── api/                API Client、通用响应类型
│   ├── context/            会话状态
│   └── ui/                 通用 UI 组件
├── styles.css              通用后台样式
└── experience.css          产品化族谱体验样式
```

## 三、启动方式

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

## 四、产品化页面设计

默认入口为“族谱首页”，并按照国内族谱产品应具备的核心体验重新组织页面：

```text
族谱首页：家族概览、最近维护、智能线索、待审核
世系图谱：以树谱画布为核心，点击人物打开档案侧栏
人物档案：基本信息、亲属关系、生命事件、资料完整度
来源资料库：族谱原文、地方志、墓志照片、口述记录和证据绑定
修谱工作台：导入、重复合并、缺失补齐、字辈校验、关系冲突
审核中心：人物变更、关系变更、来源复核、支派变更、字辈方案变更
宗族文化：姓氏源流、堂号、家训、谱序、迁徙路线、祠堂
```

产品化页面文件：

```text
src/features/experience/GenealogyExperiencePages.tsx
```

## 五、真实接口迁移情况

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
GET  /clans/{clanId}/persons
GET  /clans/{clanId}/sources
GET  /clans/{clanId}/review-tasks/pending
GET  /logs/operations/stats
GET  /persons/{personId}/relationships
GET  /tree/person/{personId}/family
POST /persons/{personId}/submit-review
POST /review-tasks/{taskId}/approve
POST /review-tasks/{taskId}/reject
POST /clans/{clanId}/relationships/check-conflict
```

后端暂无专用接口的内容，例如宗族文化、迁徙路线、祠堂、家训等，当前仅使用宗族名称、堂号、发源地、支派名称等真实基础信息展示空态骨架，后续需要补充文化资料相关后端能力。

## 六、导航整合

主导航只保留产品化主流程：

```text
族谱首页
世系图谱
人物档案
来源资料库
修谱工作台
审核中心
宗族文化
基础数据管理
```

原来的登录、宗族、支派、人物、关系、来源、附件、导入导出、日志等旧版能力统一收进“基础数据管理”页内，通过页内 Tab 访问。

## 七、商用展示原则

商用版前端不直接展示接口响应 JSON，而是按业务视角展示：

```text
树谱画布
人物档案侧栏
来源证据流
智能线索卡片
审核任务面板
资料完整度
生命事件时间线
宗族文化卡片
操作结果 Toast
真实空态引导
```

## 八、构建

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

## 九、覆盖范围

当前前端覆盖范围：

```text
产品化体验：族谱首页 / 世系图谱 / 人物档案 / 来源资料库 / 修谱工作台 / 审核中心 / 宗族文化
基础数据管理：登录认证 / 宗族 / 成员 / 支派 / 字辈 / 人物 / 关系 / 来源 / 附件 / 审核 / 旧版世系 / 导入导出 / 日志
```

后续新增前端能力应优先进入 `frontend/genealogy-web/src/features/experience/*`，并逐步迁移真实接口。
