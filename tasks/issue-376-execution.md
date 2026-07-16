# Issue #376 执行看板

- Issue：[#376 [Frontend][世系图谱] 按页面模式规范整改画布工作台](https://github.com/gyguan/genealogy/issues/376)
- Draft PR：[#383](https://github.com/gyguan/genealogy/pull/383)
- 工作分支：`agent/issue-376-lineage-workbench`
- 目标：按 `docs/21-frontend-page-pattern-spec.md` 第 10 节收敛世系图谱为标准画布工作台，完善检查器、响应式、列表替代视图与可访问性。
- 实现范围：`LineageTreeProductPage.tsx`、`lineage-workbench-issue376.css` 和执行记录。
- 非目标：不修改 Tree API、世系核心数据结构、后端权限、审核流程、正式数据写入和导出业务逻辑。

## 交付分级

- Issue 类型：单页面前端调整（Tree 核心查询页面的交互与展示整改）
- 流程强度：轻量流程，保留 Tree 隐私与恢复状态专项复核
- 契约强度：无 API 契约变更
- 验证强度：最简门禁——Tree 聚焦测试、前端类型检查、生产构建与 diff 范围检查
- 拆分信号：验收项较多，但集中于同一页面和同一画布组件，不涉及跨模块契约或数据结构；本次不拆 Issue，按垂直切片提交
- 耗时口径：只记录实际活跃执行耗时；CI 排队和运行等待单独记录，不计入活跃耗时

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、Issue 与现有实现，建立执行现场 | ✅ 已完成 | 约 7 分钟 | `766bc5d`：创建任务看板、分支、Draft PR 和业务修改前检查点 |
| 2 | 重构页面结构、工具栏与响应式检查器 | ✅ 已完成 | 约 5 分钟 | `4320fcb`、`1fa8e12`：统一对象选择与画布 Card，收敛主操作、低频设置和检查器动作，增加移动端布局 |
| 3 | 增加列表替代视图与画布可访问入口 | ✅ 已完成 | 约 3 分钟 | `4320fcb`：增加图谱/列表双视图、人物与关系列表、错误态降级；masked 人物继续最小披露 |
| 4 | 执行最简门禁、检查 diff 并完成 PR 收尾 | ✅ 已完成 | 约 2 分钟 | Frontend CI 成功：Tree graph model、TypeScript typecheck、production build 均通过；diff 仅包含 3 个范围内文件 |

## 完成内容

1. 页面收敛为“对象选择 Panel + 画布工作台 Card”，删除重复的“工作台/拓扑”大标题。
2. 页面工作区唯一主操作统一为“更新图谱”；人物查找降为普通操作，“当前中心”使用状态 Tag。
3. 搜索结果行选择与“设为中心”动作分离。
4. 工具栏常驻图内定位、展开深度和更新图谱，方向、关系范围和下级支派进入“更多设置”。
5. 模式切换后自动加载人物中心或支派全局图谱，普通筛选继续通过“更新图谱”应用。
6. 增加图谱/列表双视图，列表模式提供人物、关系的键盘可访问和故障降级入口。
7. Drawer Header 显示对象类型与名称；桌面 560 px、移动端 100%；人物直接操作最多 3 个，审核/修谱入口收进“更多”。
8. 增加移动端按钮热区、单列操作、响应式工具栏和桌面浮动图例样式。

## 验证结果

GitHub Actions `Frontend CI`（run `29473462938`）成功：

- ✅ Detect Tree-related changes
- ✅ Test Tree graph model
- ✅ Typecheck frontend
- ✅ Build production frontend

本次不涉及 API 契约，因此未修改 OpenAPI 或生成类型。

## Diff 与风险复核

- 变更文件：
  - `frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`
  - `frontend/genealogy-web/src/features/tree/lineage-workbench-issue376.css`
  - `tasks/issue-376-execution.md`
- 未修改 Tree API、数据结构、权限、隐私规则或正式数据写入逻辑。
- URL 状态模型、请求版本门、人物/支派加载服务继续复用原实现。
- masked 人物在列表和检查器中继续显示安全占位，不恢复或扩展受保护信息。
- 主分支在实现期间有新提交，但 PR 当前 `mergeable=true`；合入前由 GitHub 以最新 `main` 执行合并检查。

## 耗时汇总

- 已完成任务活跃耗时：约 17 分钟
- 外部等待：Frontend CI 排队与运行，不计入活跃耗时
- 未记录历史任务：无

## 最终恢复检查点

- 当前 Issue：#376
- 当前分支：`agent/issue-376-lineage-workbench`
- 当前 Draft PR：#383
- 最后完成任务：最简门禁与 diff 复核
- 最新业务 Commit：`1fa8e12cc8b2b3e04b286f99c8ce1a05f80fcd51`
- CI 状态：成功
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：将 PR 标记为 Ready 并合入 `main`，随后回写 Issue 最终完成摘要
- 最后更新时间：2026-07-16 13:18（北京时间）
