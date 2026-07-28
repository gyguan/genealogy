# AppShell 与超大页面治理

## 已完成边界

| 边界 | 文件 | 职责 |
| --- | --- | --- |
| 全局 Provider | `AppProviders.tsx` | Ant Design Token、`WorkspaceProvider` |
| 模块注册 | `moduleRegistry.tsx` | 模块 key、名称、菜单、页面 renderer、Header 操作 |
| 认证后布局 | `AuthenticatedShell.tsx` | Sider、Header、Content、用户菜单 |
| 应用编排 | `App.tsx` | 认证状态、特殊人物路由、导航保护、URL 同步 |
| 首页派生模型 | `features/home/homeDashboardModel.ts` | 代次、支派、文化内容分组等纯派生逻辑 |
| 最近浏览模型 | `features/home/homeRecentViews.ts` | 用户/宗族隔离的最近浏览 key、合并、读写 |

新增普通一级模块只需在 `moduleRegistry.tsx` 增加一个定义；不再分别修改菜单数组、页面 switch 和 Header 操作条件分支。

## 后续候选超大页面

| 候选 | 判断依据 | 建议边界 |
| --- | --- | --- |
| `Mvp1WizardPage` | 多步骤状态、会话恢复、依赖关系、反馈与区域渲染并存 | step registry、session hook、completion model |
| `LineageTreeTabbedPage` | URL 查询、图谱请求、Canvas、Toolbar、Drawer 生命周期并存 | query model、graph loader、toolbar sections |
| `ImportPage` | 上传、预览、执行、历史、异常处理集中 | import session hook、preview model、history sections |
| `ReviewCenterPage` | 查询、批量选择、审核动作、详情联动集中 | query state、selection model、action panel |
| `LogPage` | 对象追踪、审计、风险三个工作区共享复杂 URL 状态 | tab registry、resource hooks、detail panels |

判断标准：文件同时承担三类以上职责，或页面展示区直接拼装 API、URL 和持久化逻辑时进入下一轮治理。公共抽取必须有两个以上明确复用方，否则保留在 feature 内。
