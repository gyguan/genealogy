# Genealogy Web

中国式族谱系统正式前端，采用 React、TypeScript、Vite 与 Ant Design 5，按 Feature 组织页面、状态、请求和业务组件。

## 阅读顺序

1. 根 `AGENTS.md`
2. `frontend/genealogy-web/AGENTS.md`
3. `docs/standards/README.md`
4. `frontend/genealogy-web/src/features/README.md`
5. 当前 Feature README、Issue 与 Spec

专项规范：

- `docs/frontend/design-system.md`
- `docs/frontend/page-patterns.md`
- `docs/frontend/multi-tab-pages.md`
- `docs/experience/frontend-code-maintainability.md`

## 技术栈

```text
React
TypeScript
Vite
Ant Design 5.x
OpenAPI generated client/types
Playwright
Feature-based Architecture
```

## 目录结构

```text
src/
├── app/                  应用外壳、路由、导航、主题和全局边界
├── features/             按业务 Feature 组织页面和交互
│   ├── auth/
│   ├── clans/
│   ├── branches/
│   ├── generations/
│   ├── persons/
│   ├── relationships/
│   ├── sources/
│   ├── reviews/
│   ├── members/
│   ├── imports/
│   ├── logs/
│   ├── home/
│   ├── tree/
│   ├── culture/
│   └── mvp1/
└── shared/
    ├── api/
    ├── context/
    ├── model/
    └── ui/
```

Feature 职责、状态归属和性能边界见 `src/features/README.md`。

## 本地启动

```bash
cd frontend/genealogy-web
npm install
npm run dev
```

默认访问：

```text
http://localhost:5174
```

开发环境通过 Vite 代理访问后端，不在页面展示 API 地址、Token 或开发配置。

## 页面与状态原则

- Ant Design 优先，不重复自研基础组件。
- 页面容器、Feature Hook、Service/API 和展示组件职责分离。
- 服务端状态、URL 状态、局部状态、表单状态和派生状态明确归属。
- API DTO、ViewModel、FormValues 和 Submit Command 不混用。
- 权限、审核、正式状态和隐私结果以后端返回为准。
- 加载、空、错误、无权限和提交状态必须完整。

## API 契约

```bash
npm run api:generate
npm run api:check
```

优先使用 OpenAPI 生成的类型和请求能力，不手工复制后端 DTO，不使用 `any` 掩盖契约差异。

## 验证

```bash
npm run typecheck
npm run build
npm run api:check
```

页面、样式和交互变化按范围执行 Playwright、视觉发布、多浏览器和 DOM/CSS 治理门禁。

## README 维护

技术栈、启动命令、Feature 目录、状态模型、接口生成方式或验证命令变化时，必须同步更新本文件。
