# Genealogy Web

中国式族谱系统正式前端，采用 React、TypeScript、Vite 与 Ant Design 5.x，按 Feature 组织页面、状态、请求和业务组件。

## 开始之前

进入前端目录后，按以下顺序阅读：

1. 仓库根 `AGENTS.md`
2. `frontend/genealogy-web/AGENTS.md`
3. `docs/10-frontend-design-guidelines.md`
4. `docs/21-frontend-page-pattern-spec.md`
5. `docs/22-multi-tab-page-spec.md`
6. 当前 Feature 的 README、Issue 与 Spec

代码可理解性经验见：

```text
docs/ai/frontend-code-understanding-and-maintainability-standard.md
```

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
├── features/             按业务 Feature 组织页面与交互
│   ├── auth/             登录与会话体验
│   ├── clans/            宗族管理
│   ├── branches/         支派管理
│   ├── generations/      字辈管理
│   ├── persons/          人物档案
│   ├── relationships/    关系管理
│   ├── sources/          来源资料与证据绑定
│   ├── reviews/          审核中心
│   ├── members/          成员与权限
│   ├── imports/          导入任务与结果
│   ├── logs/             审计追踪
│   ├── home/             首页与统计看板
│   ├── tree/             世系图谱
│   ├── culture/          宗族文化
│   └── mvp1/             建谱向导与闭环入口
├── shared/
│   ├── api/              生成请求、统一 Client 与错误处理
│   ├── context/          工作空间与跨页面上下文
│   ├── model/            稳定共享模型和字典
│   └── ui/               基于 Ant Design 的薄封装
└── styles/               主题和受控样式
```

实际 Feature 导航和职责见：

```text
src/features/README.md
```

## 本地启动

安装依赖：

```bash
cd frontend/genealogy-web
npm install
```

启动开发服务：

```bash
npm run dev
```

默认访问：

```text
http://localhost:5174
```

开发环境通过 Vite 代理访问后端。页面不得展示 Token、API 地址、调试配置或敏感响应。

## 代码组织约定

推荐调用链：

```text
Route / Page Container
  → Feature Hook
  → Service / Generated API Client
  → DTO → ViewModel
  → Presentational Components
```

- 页面容器负责路由、请求编排和页面状态。
- 展示组件只渲染数据和触发业务事件，不直接调用 API。
- Feature Hook 管理可复用状态、副作用和交互流程。
- Service/API 层统一封装请求、错误和取消策略。
- API DTO、ViewModel、FormValues 和 Submit Command 显式分离。

强制规则以 `frontend/genealogy-web/AGENTS.md` 为准。

## 状态归属

前端状态必须明确归属：

| 状态类型 | 推荐位置 |
|---|---|
| 服务端状态 | Feature Hook / 请求层 |
| 可分享和可恢复筛选 | URL |
| Drawer、Modal、选中项 | 页面局部状态 |
| 表单字段 | Ant Design Form |
| 可计算值 | 派生状态，不重复保存 |

同一业务事实只能有一个权威状态源，不维护表单镜像 state，不用多个布尔值隐式表达复杂互斥流程。

## API 契约

API 变更必须先更新：

```text
docs/api/openapi.json
```

然后执行：

```bash
npm run api:generate
npm run api:check
```

规则：

- 优先使用生成类型和请求能力。
- 不手工复制后端 DTO。
- 不使用 `any`、重复接口或类型断言掩盖契约问题。
- 权限、审核、正式状态和隐私结果以后端返回为准。

## 设计体系

- 基础组件优先使用 Ant Design。
- `shared/ui` 只做薄封装，不创建第二套 Button、Table、Form、Modal。
- 页面使用统一 Page Header、查询区、结果区、反馈和空态模式。
- 自定义 Canvas/SVG 仅用于世系图谱等 Ant Design 无法覆盖的业务可视化。
- 状态、类型和权限必须展示业务文案，不直接显示技术 ID、原始枚举或接口字段名。

## 页面状态

所有异步页面必须处理：

- 加载态
- 空态
- 错误态
- 无权限态
- 提交中
- 重复提交保护
- 成功或失败反馈

高风险操作必须明确对象、影响和真实不可操作原因，不用隐藏按钮替代后端鉴权。

## 性能边界

- 列表必须使用后端分页。
- 搜索处理防抖、过期请求和最小触发条件。
- Table 使用稳定业务 `rowKey`，不使用数组下标。
- 世系图谱遵循深度、节点、边上限，不一次拉取全宗族数据。
- 不在 render 中发请求或执行昂贵转换。
- `useMemo`、`useCallback` 仅用于有证据的稳定性或性能问题。

## 验证命令

```bash
npm run typecheck
npm run build
npm run api:check
```

涉及 API 契约时：

```bash
npm run api:generate
npm run api:check
```

根据变更范围还应执行：

- DOM / CSS Governance
- Style Debt Audit
- Visual Release Gate
- Multi-Browser Compatibility
- Playwright Functional E2E
- Security Penetration

## Feature README 维护规则

复杂 Feature 至少应记录：

- 业务目标和入口页面
- 目录结构和主调用链
- 服务端、URL、表单和局部状态归属
- API 与 ViewModel 边界
- 权限、审核、隐私和业务不变量
- 分页、搜索、图谱或大列表性能边界
- 关键测试与必跑命令

出现主调用链、状态归属、API 契约或关键不变量变化时，必须同步刷新对应 README。
