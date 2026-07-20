# Issue #556 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/556
- 目标：将“世系图谱”重构为统一四条件查询，并把“人物中心 / 支派全局”模式切换下沉到结果 Card。
- 工作分支：`agent/issue-556-unified-lineage-query`
- PR：https://github.com/gyguan/genealogy/pull/557
- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：Tree 聚焦测试 + TypeScript + 前端构建 + diff 检查
- 拆分结论：未命中拆分信号；不涉及 API、数据库、权限、审核或 Tree 核心数据结构。
- 活跃耗时口径：记录规则读取、代码实现、验证、diff 检查和 GitHub 收尾；CI 等待单独记录。
- 测试复用：复用现有 `test:tree`、`typecheck` 和 `build`，不新增重复 fixture。
- 影响模块：`frontend/genealogy-web/src/features/tree` 页面及专属样式。

## 实现范围

1. 查询 Card 标题改为“图谱查询”，移除查询区模式 TAB。
2. 查询条件统一为一行四项：宗族、支派、关系范围、展开深度，全部必选。
3. 关系范围保留多选、搜索、全选、清空和标签折叠。
4. 结果 Card 标题为“查询结果”，使用“人物中心 / 支派全局”TAB。
5. 两个结果模式共用同一组已应用条件；查询时刷新两类图谱。
6. 人物中心结果区提供中心人物切换入口，无有效人物时使用当前支派搜索结果首位人物。
7. 保留图内定位、图谱画布、详情 Drawer、隐私展示、URL 恢复、加载/空/错状态和请求隔离。

## 非目标

- 不修改 Tree API、OpenAPI、后端或数据库。
- 不修改节点/边核心数据结构。
- 不新增正式数据维护入口。
- 不新增依赖或第二套基础组件。
- 不保留“图谱 / 列表”结果 TAB。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、确认原型差异并建立执行现场 | ✅ 已完成 | 约 8 分钟 | `5b68c307`：Issue、分支、任务文件和 Draft PR 已建立 |
| 2 | 重构统一查询状态与结果模式 Tabs | ✅ 已完成 | 约 15 分钟 | `b0527d0b`、`257172de`：页面状态、结构和响应式样式已完成 |
| 3 | 执行聚焦验证、检查 diff 并完成 PR 收尾 | ✅ 已完成 | 约 6 分钟 | Frontend CI Run #1000 成功，diff 仅包含 3 个目标文件 |

## 验证结果

- Frontend CI Run #1000：`success`。
- `Test Tree graph model`：通过。
- 前端全量现有测试步骤：通过。
- `Typecheck frontend`：通过。
- `Build production frontend`：通过。
- `api:check` 未单独执行：本次未修改 OpenAPI、生成类型、请求契约或 API 脚本，且当前 Frontend CI 不包含该步骤；按“不涉及 API 契约”处理。
- PR diff 已检查，仅包含：
  - `frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`
  - `frontend/genealogy-web/src/features/tree/lineage-double-card.css`
  - `tasks/issue-556-execution.md`
- 查询 Card 复核通过：标题为“图谱查询”，仅包含宗族、支派、关系范围、展开深度四个必选字段。
- 结果 Card 复核通过：标题为“查询结果”，仅包含人物中心、支派全局两个 TAB。
- 人物中心的中心人物切换位于结果区工具栏，不进入查询 Card，也不改变统一查询范围。
- 查询同时刷新人物中心和支派全局图谱，模式 TAB 切换不重复提交查询。
- URL 继续保存宗族、支派、中心人物、结果模式、统一深度和关系范围。
- Tree 模块仍只做查询和导航，不承载正式数据修改。

## 风险与补偿措施

- 统一深度使用人物图和支派图共同支持的 3、5、8 代，旧 URL 中不兼容的深度回退为 3 代。
- 查询同时触发人物图和支派图两次请求，但仍受既有 `maxNodes=500`、`maxEdges=1000` 和深度限制保护。
- 支派切换后查询会重新解析该支派内中心人物；原中心人物不在新支派时自动使用首位搜索结果。
- 页面使用现有 Ant Design Card、Select、Tabs、Button 和业务图谱组件，无新增依赖。
- 回滚方式：回退 PR #557，即可恢复 #547 合入后的页面结构。

## 恢复检查点

- 当前 Issue：#556
- 当前分支：`agent/issue-556-unified-lineage-query`
- 当前 PR：#557
- 最后完成任务：统一查询重构、CI 验证和 diff 复核
- 当前进行中任务：无
- 业务提交：`b0527d0b47b93eda51dfe9a35cb5d1a4ec3b6a1a`、`257172ded3fbbff983d247c296ae539829e10497`
- CI 状态：Frontend CI Run #1000 success
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：标记 PR Ready 并合入 `main`
- 最后更新时间：2026-07-20 15:49（北京时间）

## 耗时汇总

- 已完成任务活跃耗时：约 29 分钟
- 外部等待：Frontend CI 运行时间，未计入活跃耗时
