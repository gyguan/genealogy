# 前端导航与 URL 状态契约

## 1. 跨页面导航

以下行为属于跨页面导航，必须通过 `shared/navigation`：

- 一级模块切换；
- 人物详情与编辑等实体路由；
- 需要 AppShell 切换页面或重新解析路由的跳转；
- 需要统一未保存数据保护的导航。

写入入口统一为：

- `navigateToView`：模块导航与目标模块 URL 参数清理；
- `commitNavigation`：提交 History 记录并发布 `genealogy:navigation`；
- `subscribeNavigation`：统一订阅浏览器 `popstate` 和应用内导航事件。

禁止：

- 业务代码主动派发伪造的 `PopStateEvent` 驱动路由刷新；
- 入口层或 AppShell 覆盖 `history.pushState/replaceState`；
- 菜单跳转先修改 React 页面状态、再写 URL。

## 2. 模块内 URL 状态

筛选、分页、排序、Tab、滚动恢复等属于模块内部可分享状态。各模块可以保留自己的 URL 状态模型，但必须满足：

- 参数必须登记在 `VIEW_QUERY_KEYS` 中；
- 只清理本模块拥有的参数；
- 默认值、重复参数和兼容规则由模块状态模型负责；
- 模块内状态写入不得承担 AppShell 页面切换职责；
- 一旦写入会触发模块或实体路由变化，必须改用 `commitNavigation`。

## 3. 导航保护

AppShell 是未保存数据和提交中状态的统一保护点。菜单导航、实体导航和浏览器前进后退均通过 `subscribeNavigation` 进入同一判断流程。

## 4. 自动治理

`navigationGovernance.test.mjs` 防止以下问题回归：

- 跨页面导航重新使用伪造 `popstate`；
- 入口层重新覆盖 History API；
- 模块与实体导航绕过共享入口；
- AppShell 绕过共享订阅机制。
