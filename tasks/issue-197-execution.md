# Issue #197 执行看板：服务端人物搜索与请求状态一致性

- Issue：https://github.com/gyguan/genealogy/issues/197
- EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置：#196 / PR #210 / `e7aac3e2658114257ffe20a553bc16c73e28cccf`
- 分支：`agent/issue-197-tree-request-state`
- Draft PR：https://github.com/gyguan/genealogy/pull/212
- 目标：移除前 120 人预加载依赖，使用服务端分页搜索选择中心人物，并隔离宗族、搜索、人物图和支派图请求状态，丢弃过期响应。
- 最后更新时间：2026-07-14 22:16（北京时间）

## 主要交付

- 新增 `LineageRequestGate`：按 `clan/search/personGraph/branchGraph` 分域管理请求版本；宗族切换一次性使全部旧请求失效。
- 新增服务端分页人物选择模型：支持 `records/items/content/array` 响应，保留总数、页码、页大小和总页数。
- 搜索结果只展示姓名、谱名/字号、世次和支派等业务信息，不展示人物 ID、支派 ID 等技术字段。
- 页面移除 `/persons/search?pageSize=120` 与全宗族回退，不再把前 120 位人物作为可选范围。
- 宗族、搜索、人物图、支派图分别维护 loading/error/retry，合法请求不再被一个全局 `loading` 跳过。
- 切换宗族时原子清空 Workspace、支派、人物、关系、图谱和详情，再加载新宗族数据。
- 深度变化只刷新人物图和支派图；搜索翻页不刷新图谱。
- 跨支派设为中心时一次性更新人物与支派，并并行刷新必要图谱。
- 取消/过期语义采用请求版本门等价实现：只有当前宗族、当前作用域的最新版本可写入状态；旧响应静默丢弃，不弹业务错误。

## 非目标

- 不修改后端人物搜索规则、公共 API、数据库或权限策略。
- 不调整 #196 图布局算法。
- 不实现 #198/#199 的证据、审核与风险语义。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、页面和 API Client，建立分支/看板/PR | ✅ 已完成 | 约 5 分钟 | 分支、检查点、PR #212 和 Issue 启动评论已建立 |
| 2 | 增加请求版本门与分页状态模型测试 | ✅ 已完成 | 约 5 分钟 | 5 个测试覆盖同域乱序、宗族切换、独立作用域和分页业务标签 |
| 3 | 改造服务端分页人物搜索与业务字段选择器 | ✅ 已完成 | 约 6 分钟 | 每页 20 条、上一页/下一页、明确人物选择，不自动跳到首条结果 |
| 4 | 拆分加载状态并治理宗族/深度/跨支派竞争 | ✅ 已完成 | 约 7 分钟 | 四类独立状态、版本门、原子清理、按需刷新和跨支派一致更新 |
| 5 | 执行状态测试、TypeScript、构建和 Review 后合入 | ✅ 已完成 | 约 5 分钟 | Frontend CI #233、API Contract #973、Culture Library UI CI #22 均通过 |

## 验证结果

- Tree 测试：✅ 既有 6 个图模型测试 + 新增 5 个请求状态/分页测试。
- TypeScript：✅。
- Vite 生产构建：✅。
- Frontend CI #233：✅。
- API Contract #973：✅。
- Culture Library UI CI #22：✅。
- PR diff：✅ 5 个相关文件，无后端、API、数据库或依赖变更。
- Review：✅ 无未解决线程。

## 验收核对

- [x] 超过 120 人时可通过后端分页搜索任意有权人物。
- [x] 快速切换宗族、搜索、中心人物、支派和深度时，旧响应不能覆盖新状态。
- [x] 搜索、人物图和支派图可独立加载、失败和重试。
- [x] 跨支派中心人物、支派范围和两张图谱最终一致。
- [x] 清空或切换宗族不会残留旧节点、旧关系或旧详情。
- [x] 搜索结果不展示技术 ID。

## 五轴 Review

- Correctness：✅ 请求版本与宗族键共同判定响应是否可写。
- Readability：✅ 分页/版本状态模型与页面编排分离。
- Architecture：✅ 未扩张 API，继续消费现有搜索与 Tree 契约。
- Security：✅ 搜索结果完全以后端权限过滤为准，不缓存全宗族人物。
- Performance：✅ 每次只保留当前页结果，深度和搜索变化仅刷新必要数据。

## 当前恢复检查点

- 当前 Issue：#197
- 当前分支：`agent/issue-197-tree-request-state`
- Draft PR：#212
- 最新 Commit：本次最终执行记录
- 最后完成任务：实现、前端测试、构建、契约和 Review
- 当前进行中：转 Ready 并 squash 合入 main
- CI：Frontend CI #233、API Contract #973、Culture Library UI CI #22 通过
- Review：无未解决线程
- 阻塞：无
- 下一步：合入 #212，回写 Issue/EPIC，启动 #198
- 最后更新时间：2026-07-14 22:16（北京时间）
