# CSS 分层与责任清单

## 分层规则

| 层级 | 责任 | 允许内容 | 禁止内容 |
| --- | --- | --- | --- |
| ConfigProvider Token | 品牌色、圆角、间距、阴影、组件 Token | `App.tsx` 中的 Ant Design Token | 用 CSS 重复覆盖 Token 能解决的问题 |
| Shell / Base | 应用壳、认证壳、基础排版和稳定全局布局 | `styles.css`、`auth-commercial.css`、`compact-ui.css` | 单页面业务选择器 |
| Shared UI | 跨模块共享组件的稳定 class 契约 | `entity-page-header.css`、`tabbed-module.css`、`runtime-error.css` | 基于中文文案或 DOM 顺序的选择器 |
| Feature | `features/*` 页面与业务组件 | 带模块前缀的局部 class | 无前缀 `.field`、`.data-table`、全局 `button` |
| Visualization | 世系图等特殊可视化 | 图谱画布、节点、Drawer、工具栏 | 影响非图谱页面的 Ant Design 内部类覆盖 |
| Migration Bridge | 旧页面迁移兼容 | 有明确 owner 和退出条件的最小规则 | 新增业务能力或长期扩张 |

## 当前入口文件处置

`main.tsx` 只加载 `styles/index.css`。该文件是受治理的兼容入口，不再允许业务代码继续向 `main.tsx` 增加 CSS import。

| 文件组 | 当前处置 | 责任/使用页面 | 退出条件 |
| --- | --- | --- | --- |
| `styles.css`、`compact-ui.css`、`experience.css` | 保留 | 应用壳和稳定全局基线 | AppShell 拆分后复核并缩小 |
| `auth-commercial.css` | 保留 | 登录/注册壳 | 认证页面完成 feature 内聚 |
| `entity-page-header.css`、`tabbed-module.css`、`runtime-error.css` | 保留 | Shared UI 契约 | 对应共享组件改为 colocated style |
| `mvp1-*.css` | 迁移中 | 建谱向导 | 向导组件拆分后迁至 `features/mvp1` 并合并重复规则 |
| `person-*.css` | 迁移中 | 人物列表、详情、编辑 | 页面组件完成样式就近加载 |
| `lineage-*.css` | 迁移中 | 世系图谱与 Drawer | 图谱入口改为 feature style bundle |
| `audit-trace.css` | 迁移中 | 审计追踪 | `features/logs` 样式内聚 |
| `member-permission-page.css` | 迁移中 | 成员与权限 | `MemberManagementPage` 样式内聚 |
| `guidance-cleanup.css`、`module-title-dedup.css`、`page-content-cleanup.css`、`query-button-unification.css` | 冻结，只减不增 | 历史 cleanup/unification 补丁 | 规则迁移到具体 Shared UI/Feature 后删除 |
| `antd-bridge.css` | 冻结，只减不增，必须最后加载 | Ant Design 迁移兼容层 | 所有规则替换为 Token、组件属性或模块前缀规则后删除 |

## 新增样式约束

1. 新 feature 样式必须由对应 feature 组件导入，不得加入 `main.tsx` 或兼容入口。
2. 业务 class 必须带模块前缀，例如 `.person-archive-*`、`.source-library-*`、`.lineage-*`。
3. 禁止新增全局 `button {}`、`.field input {}`、`.data-table {}` 等污染选择器。
4. 对 `.ant-*` 的覆盖必须置于稳定模块外层 class 下；能使用 Token 或组件属性时不得新增覆盖。
5. cleanup、tweaks、override、unification 文件进入冻结状态，只允许删除或迁移规则。

## 视觉回归矩阵

PR 验证需覆盖 1920、1440、1366、1280 宽度，并检查：应用壳、首页、人物列表/详情/编辑、来源资料库、成员与权限、审核中心、审计追踪、世系图谱、建谱向导。
