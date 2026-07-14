# Issue #197 执行看板：服务端人物搜索与请求状态一致性

- Issue：https://github.com/gyguan/genealogy/issues/197
- EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置：#196 / PR #210 / `e7aac3e2658114257ffe20a553bc16c73e28cccf`
- 分支：`agent/issue-197-tree-request-state`
- Draft PR：待创建
- 目标：移除 120 人预加载，使用服务端分页搜索选择中心人物，并隔离宗族、搜索、人物图和支派图请求状态，丢弃过期响应。
- 最后更新时间：2026-07-14 22:08（北京时间）

## 方案与边界

- API Client 支持 `AbortSignal`，取消请求不作为业务错误提示。
- 新增纯状态模型管理请求版本、分页结果和业务展示字段。
- 页面将 base/search/personGraph/branchGraph 状态拆分，不使用全局串行 loading。
- 切换宗族时先原子清空 Workspace 与页面数据，再加载支派和搜索第一页。
- 中心人物由服务端搜索结果选择，展示姓名、字号/谱名、世次和支派，不显示技术 ID。
- 跨支派设为中心时一次性更新人物与支派，再并行加载两张图。
- 不修改后端人物搜索规则、Tree 布局、API 或数据库。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、页面和 API Client，建立分支/看板/PR | 🔄 进行中 | 已累计约 4 分钟 | 分支与检查点已建立，待创建 PR/回写 Issue |
| 2 | 增加可取消请求和版本门状态模型测试 | ⏳ 待处理 | — |  |
| 3 | 改造服务端分页人物搜索与业务字段选择器 | ⏳ 待处理 | — |  |
| 4 | 拆分加载状态并治理宗族/深度/跨支派竞争 | ⏳ 待处理 | — |  |
| 5 | 执行状态测试、TypeScript、构建和 Review 后合入 | ⏳ 待处理 | — |  |

## 验证

- 快速连续搜索、宗族切换、深度切换、过期响应、跨支派中心人物测试。
- `npm run test:tree`、`npm run typecheck`、`npm run build`、API Contract。

## 恢复检查点

- 当前 Issue：#197
- 当前分支：`agent/issue-197-tree-request-state`
- Draft PR：待创建
- 当前进行中：创建 PR 并回写 Issue
- CI：未运行
- 阻塞：无
- 下一步：读取 API Client 请求实现并加入 signal
