# Frontend AI Engineering Rules

适用于 `frontend/genealogy-web/` 及其子目录，继承根 `AGENTS.md`。本文件只承载前端可执行规则；复杂度阈值、拆分案例和解释见 `docs/experience/frontend-code-maintainability.md`。

## 1. 技术与设计体系

技术基线：React、TypeScript、Vite、Ant Design 5、OpenAPI 生成类型。

- 基础 UI 优先使用 Ant Design，不建立第二套 Button、Table、Form、Modal 等基础体系。
- `shared/ui` 只做薄封装；自定义组件仅用于图谱、关系连线等特殊业务可视化。
- 页面容器负责用例编排；展示组件负责渲染；Feature Hook 负责状态与副作用；Service/API 负责请求。
- UI 组件不直接调用业务 API；名称必须表达业务意图。
- 视觉规范：`docs/frontend/design-system.md`。
- 页面模式：`docs/frontend/page-patterns.md`。
- 多 Tab 页面：`docs/frontend/multi-tab-pages.md`。

## 2. 页面状态与交互

每个异步页面必须处理加载、空、错误、无权限、提交中、重复提交保护以及成功或失败反馈。

- 需要分享、刷新或返回恢复的筛选、分页、Tab 和范围进入 URL。
- Drawer、Modal 和选中项保持页面局部化。
- 表单字段由 Ant Design Form 管理。
- 可计算内容作为派生状态，不重复保存。
- 同一业务事实只能有一个权威状态源。
- 互斥流程使用联合类型、枚举或显式状态对象，不使用多个松散布尔值。

## 3. API、类型与 ViewModel

- API 变更先更新 `docs/api/openapi.json`，再执行 `npm run api:generate`。
- 优先使用生成请求和类型，不手工复制 DTO，不使用 `any` 掩盖契约问题。
- API DTO、ViewModel、FormValues 和 Submit Command 边界明确。
- 页面不散落拼接 API 路径；请求按 Feature 收敛到 `api/` 或 `services/`。
- 搜索请求考虑防抖、取消过期请求和最小触发条件。
- 页面不自行推断审核结果、正式状态、权限范围或隐私结果。
- 后端未返回的业务字段展示空态，不补造真实业务内容。

## 4. 权限与隐私

- 前端只减少误操作，后端负责最终鉴权。
- 使用后端按对象返回的 `allowedActions`，不得用角色名推断对象权限。
- 无权数据不先加载再隐藏。
- 在世人员、联系方式、附件和来源材料按后端脱敏结果展示。
- 导出、下载和附件预览保留权限和审计语义。
- 权限、状态、错误码和业务字典集中维护，不在页面重复定义。

## 5. Hook、Props 与副作用

- `useEffect` 只同步 React 与外部系统，一个 Effect 只负责一种副作用。
- 依赖数组完整；订阅、定时器和监听必须 cleanup。
- 请求竞争必须取消、使用请求序号或丢弃过期结果。
- 不在 Effect 中循环同步派生 state，不通过 DOM 查询推断业务状态。
- 自定义 Hook 以 `use` 开头并表达具体业务意图。
- Props 使用明确类型；数据字段用名词，事件使用业务动作。
- 列表 `key` 使用稳定业务标识，不使用数组下标。
- 展示组件原则上无副作用，不直接读取路由、全局对象或业务 API。

## 6. 表格、表单与弹窗

表格：

- 分页、排序和筛选与后端契约一致；大数据量使用后端分页。
- 行操作基于每行 `allowedActions`。
- render 中不发请求、不执行昂贵排序、分组和转换。

表单：

- Ant Design Form 是单一状态源。
- DTO → FormValues → Command 转换显式分离。
- 提交中防重复提交，失败后保留用户输入。
- 大表单按业务段落拆分。

Drawer / Modal：

- 打开对象、模式和动作显式；关闭时清理短生命周期状态。
- 不在多个弹窗间共享含义模糊的 `currentRecord`。
- 高风险操作明确对象、影响和原因。

## 7. 性能与特殊场景

- 列表使用后端分页和稳定 `rowKey`。
- 图谱明确查询深度、节点、边数量上限以及降级方式。
- 不一次性拉取无边界全宗族数据。
- 优先通过职责拆分减少重渲染，不盲目堆叠 `memo`、`useMemo`、`useCallback`。
- 大文件导入不在浏览器无界解析；任务状态以后端状态机为准。

## 8. 验证

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

涉及 OpenAPI 时增加：

```bash
npm run api:generate
```

页面、样式或交互变化按范围执行 Playwright、视觉发布、多浏览器和 DOM/CSS 治理门禁。

## 9. 完成检查

- 使用统一设计体系，没有重复基础组件；
- 页面状态完整且状态归属清楚；
- API 契约和类型一致；
- 权限展示未替代后端鉴权；
- 不暴露技术字段或隐私数据；
- 列表、搜索、导入和图谱具备性能边界；
- 必要测试、README 和验证结果已同步。
