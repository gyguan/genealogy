# Genealogy Web 商用版前端

该目录是 MVP1 的正式前端工程。当前采用 React + TypeScript + Vite，实现特性化目录组织、统一 API Client 和商用后台布局。

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
├── app/                    应用外壳、导航
├── features/               按业务特性拆分页面
│   ├── auth/               登录认证
│   ├── branches/           支派管理
│   ├── clans/              宗族管理
│   ├── dashboard/          工作台
│   ├── generations/        字辈管理
│   ├── importExport/       导入导出
│   ├── logs/               日志审计
│   ├── members/            成员权限
│   ├── persons/            人物档案
│   ├── prototype/          新版产品原型
│   ├── relationships/      关系管理
│   ├── reviews/            审核中心
│   ├── sources/            来源附件
│   └── tree/               世系图谱
└── shared/                 共享基础能力
    ├── api/                API Client、通用响应类型
    ├── context/            会话状态
    └── ui/                 通用 UI 组件
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

## 四、新版产品原型

默认入口为“新版原型”，用于评审下一阶段产品体验。该原型参考成熟族谱产品的交互范式，采用：

```text
树谱画布优先
人物档案侧栏
来源证据流
智能线索提醒
审核任务面板
快速新增亲属
```

原型文件：

```text
src/features/prototype/GenealogyProductPrototype.tsx
```

这版原型与当前已接 API 的 MVP 功能页并存。评审确认后，可逐步把现有接口能力迁移到新版原型结构中。

## 五、商用展示原则

商用版前端不直接展示接口响应 JSON，而是按业务视角展示：

```text
操作结果提示
业务表格
详情卡片
摘要卡片
下载结果提示
审核处理摘要
世系节点与关系边
```

主数据菜单采用“管理页”模式，不再拆成创建菜单和查询菜单。列表查询作为主页面，新建、详情、编辑等操作通过弹框完成。

## 六、构建

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

## 七、覆盖范围

当前前端已覆盖 MVP1 主流程，并继续补齐 MVP 规划中的前端增强项：

```text
新版原型：树谱画布 / 人物档案 / 来源证据 / 智能线索 / 审核任务
工作台：宗族概览、待审核和日志摘要
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
世系家庭图、上溯、下延
人物/关系 CSV 模板、预校验、导入、导出、按支派导出人物
操作日志多条件查询、统计和导出
```

后续新增前端能力应优先进入 `frontend/genealogy-web/src/features/*`。

## 八、CI 验证

本段用于触发新版产品原型的前端构建验证。
