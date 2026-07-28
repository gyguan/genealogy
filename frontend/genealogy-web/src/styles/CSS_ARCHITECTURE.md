# CSS 分层与责任清单

## 分层规则

| 层级 | 责任 | 允许内容 | 禁止内容 |
| --- | --- | --- | --- |
| ConfigProvider Token | 品牌色、圆角、间距、阴影、组件 Token | `App.tsx` 中的 Ant Design Token | 用 CSS 重复覆盖 Token 能解决的问题 |
| Shell / Base | 应用壳、认证壳、基础排版和稳定全局布局 | `styles.css`、`auth-commercial.css`、`compact-ui.css` | 单页面业务选择器 |
| Shared UI | 跨模块共享组件的稳定 class 契约 | `entity-page-header.css`、`tabbed-module.css`、`runtime-error.css`、`shared-*.css` | 基于中文文案或 DOM 顺序的选择器 |
| Feature | `features/*` 页面与业务组件 | 带模块前缀的局部 class，由当前模块按需加载 | 无前缀 `.field`、`.data-table`、全局 `button` |
| Visualization | 世系图等特殊可视化 | 图谱画布、节点、Drawer、工具栏 | 影响非图谱页面的 Ant Design 内部类覆盖 |
| Migration Bridge | 旧页面迁移兼容 | 有明确 owner 和退出条件的最小规则 | 新增业务能力或长期扩张 |

## 当前入口文件处置

`main.tsx` 只加载 `styles/index.css`。该入口只包含应用壳、共享 UI 和迁移兼容层。建谱向导、人物、世系图谱、成员与权限、审计追踪样式由 `shared/styles/loadFeatureStyles.ts` 根据当前模块按需加载，并在单次会话内去重。

| 文件组 | 当前处置 | 责任/使用页面 | 退出条件 |
| --- | --- | --- | --- |
| `styles.css`、`compact-ui.css`、`experience.css` | 保留 | 应用壳和稳定全局基线 | AppShell 拆分后复核并缩小 |
| `auth-commercial.css` | 保留 | 登录/注册壳 | 认证页面完成 feature 内聚 |
| `entity-page-header.css`、`tabbed-module.css`、`runtime-error.css` | 保留 | Shared UI 契约 | 对应共享组件改为 colocated style |
| `shared-guidance.css` | 已迁移 | 跨页面引导信息显隐规则 | Shared UI 组件完成结构化显隐后删除 |
| `shared-module-title.css` | 已迁移 | 跨模块标题去重规则 | 页面标题全部使用统一 Header 组件后删除 |
| `shared-page-content.css` | 已迁移 | 跨页面内容密度规则 | 页面内容组件完成局部内聚后删除 |
| `shared-query-actions.css` | 已迁移 | 查询动作区统一规则 | 查询表单全部采用 Shared QueryBar 后删除 |
| `mvp1-wizard.css`、`mvp1-wizard-layout.css`、`mvp1-wizard-generation.css`、`mvp1-*-step.css` | 按职责加载 | 建谱向导壳、布局、生成步骤及各业务步骤 | 向导组件拆分后迁至 `features/mvp1` |
| `person-archive-layout.css`、`person-archive-source.css`、`person-edit-page.css`、`person-detail-page.css` | 按页面职责加载 | 人物列表、来源区、编辑、详情 | 页面组件完成 colocated style 后迁移 |
| `lineage-tree.css`、`lineage-graph.css`、`lineage-workbench.css`、`lineage-result-toolbar.css` | 按可视化职责加载 | 世系树、图谱、工作台、结果工具栏 | 迁至 `features/tree` feature style bundle |
| `audit-trace.css` | 按需加载 | 审计追踪 | 迁至 `features/logs` 并完成模块前缀复核 |
| `member-permission-page.css` | 按需加载 | 成员与权限 | 迁至 `features/members` 并完成模块前缀复核 |
| `antd-bridge.css` | 冻结，只减不增，必须最后加载 | Ant Design 迁移兼容层 | 所有规则替换为 Token、组件属性或模块前缀规则后删除 |

原 `*-cleanup.css`、`*-tweaks.css`、`*-overrides.css`、`*-unification.css` 和 `*-refinement.css` 文件名已全部退出本次治理范围；保留规则均已迁移到具名责任文件，不再以补丁顺序表达职责。

## 新增样式约束

1. 新 feature 样式必须由对应 feature 组件或 feature loader 导入，不得加入 `main.tsx` 或全局兼容入口。
2. 业务 class 必须带模块前缀，例如 `.person-archive-*`、`.source-library-*`、`.lineage-*`。
3. 禁止新增全局 `button {}`、`.field input {}`、`.data-table {}` 等污染选择器。
4. 对 `.ant-*` 的覆盖必须置于稳定模块外层 class 下；能使用 Token 或组件属性时不得新增覆盖。
5. 禁止新增包含 `cleanup`、`tweaks`、`override`、`unification`、`refinement` 的样式文件；新增规则必须落入明确责任文件。
6. 同一 feature 的多个样式文件必须按页面或组件职责拆分，禁止通过重复选择器依赖加载顺序覆盖。

## 视觉回归矩阵

CI 的 Culture Page Gate 和 Functional E2E 覆盖真实 Chromium 页面。CSS PR 额外执行 1920、1440、1366、1280 四种桌面宽度的应用壳与关键页面布局检查，验证页面不得出现水平溢出、内容区反向收缩或操作区遮挡。
