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

产品化页面已从纯静态原型升级为“真实接口优先 + 空态/示例态兜底”的模式，当前已接入：

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

后端暂无专用接口的内容，例如宗族文化、迁徙路线、祠堂、家训等，当前先以宗族基础信息和示例内容展示，后续需要补充文化资料相关后端能力。

## 六、商用展示原则

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
```

主数据菜单采用“管理页”模式，不再拆成创建菜单和查询菜单。列表查询作为主页面，新建、详情、编辑等操作通过弹框完成。

## 七、构建

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

## 八、覆盖范围

当前前端覆盖范围：

```text
产品化体验：族谱首页 / 世系图谱 / 人物档案 / 来源资料库 / 修谱工作台 / 审核中心 / 宗族文化
旧版工作台：宗族概览、待审核和日志摘要
注册/登录
宗族管理：查询列表 / 新建弹框 / 详情弹框 / 修改 / 删除
成员权限管理 / 成员查询
支派管理：查询列表 / 新建弹框 / 详情弹框 / 修改 / 删除
字辈方案创建 / 字辈方案查询 / 字辈明细追加 / 按代次查询
人物管理：查询列表 / 新建弹框 / 详情弹框 / 修改 / 删除
关系管理：查询列表 / 新建弹框 / 预检 / 详情弹框 / 修改 / 删除
来源管理：查询列表 / 新建弹框 / 详情弹框 / 绑定弹框 / 绑定查询 / 解绑
附件上传 / 附件下载
审核提交 / 审核任务查询 / 审核详情 / 通过 / 驳回
旧版世系家庭图、上溯、下延
人物/关系 CSV 模板、预校验、导入、导出、按支派导出人物
操作日志多条件查询、统计和导出
```

后续新增前端能力应优先进入 `frontend/genealogy-web/src/features/experience/*`，并逐步迁移真实接口。
