# Genealogy Web 商用版前端

该目录是 MVP1 的正式前端工程，用于替代早期 `frontend/mvp` 静态演示页。当前采用 React + TypeScript + Vite，实现特性化目录组织和统一 API Client。

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

## 四、构建

```bash
npm run build
```

构建产物：

```text
dist/
```

## 五、覆盖范围

当前商用版前端已覆盖 MVP1 主流程：

```text
注册/登录
宗族创建与列表
成员权限管理
支派维护
字辈方案和字辈明细
人物录入与查询
关系冲突预检、创建、查询
来源创建、来源绑定、附件上传下载
审核提交、审核详情、通过和驳回
世系家庭图、上溯、下延
人物/关系 CSV 导入导出
操作日志查询、统计和导出
```

## 六、与静态 MVP 页的关系

```text
frontend/mvp            早期静态演示页，保留用于快速验证
frontend/genealogy-web  商用化前端工程，后续主推演进
```

后续新增前端能力应优先进入 `frontend/genealogy-web/src/features/*`。
