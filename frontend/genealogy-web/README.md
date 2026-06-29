# Genealogy Web 商用版前端

该目录是 MVP1 的正式前端工程，用于替代早期 `frontend/mvp` 静态演示页。当前采用 React + TypeScript + Vite，实现特性化目录组织、统一 API Client、统一工作台上下文和商用后台布局。

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
├── app/                    应用外壳、导航、环境配置
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
│   ├── relationships/      关系管理
│   ├── reviews/            审核中心
│   ├── sources/            来源附件
│   └── tree/               世系图谱
└── shared/                 共享基础能力
    ├── api/                API Client、通用响应类型
    ├── context/            工作台上下文
    └── ui/                 通用 UI 组件
```

## 三、启动方式

先启动后端：

```bash
cd backend/genealogy-backend
docker compose up -d
mvn spring-boot:run
```

启动商用版前端：

```bash
cd frontend/genealogy-web
npm install
npm run dev
```

访问：

```text
http://localhost:5174
```

开发环境默认 API Base：

```text
/api/v1
```

Vite 会代理到：

```text
http://localhost:8080/api/v1
```

如果需要直接连接后端，也可以在页面右上角把 API Base 改为：

```text
http://localhost:8080/api/v1
```

## 四、工作台上下文

工作台提供全局业务上下文：

```text
当前宗族ID
当前支派ID
当前人物ID
当前关系ID
当前来源ID
当前附件ID
当前审核任务ID
```

这些值会保存到浏览器 localStorage，并被人物、关系、来源、审核、世系等高频页面复用，避免在每个页面反复输入 ID。

## 五、商用展示原则

商用版前端不直接展示接口响应 JSON，而是按业务视角展示：

```text
操作结果提示
业务表格
摘要卡片
下载结果提示
审核处理摘要
世系节点与关系边
```

创建类页面和查询类页面已拆分，避免“录入表单”和“列表查询”混在一个页面里。

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

当前商用版前端已覆盖 MVP1 主流程：

```text
工作台：健康检查、上下文、待审核和日志摘要
注册/登录
宗族创建 / 宗族查询
成员权限管理
支派创建 / 支派查询
字辈方案和字辈明细
人物创建 / 人物查询
关系创建 / 关系查询
来源创建 / 来源绑定 / 附件管理
审核提交 / 审核处理
世系家庭图、上溯、下延
人物/关系 CSV 导入导出
操作日志查询、统计和导出
```

## 八、与静态 MVP 页的关系

```text
frontend/mvp            早期静态演示页，保留用于快速验证
frontend/genealogy-web  商用化前端工程，后续主推演进
```

后续新增前端能力应优先进入 `frontend/genealogy-web/src/features/*`。

## 九、CI 验证

本段用于验证创建/查询拆分后的商用版前端构建。
