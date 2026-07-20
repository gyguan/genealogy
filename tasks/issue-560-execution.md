# Issue #560 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/560
- PR：https://github.com/gyguan/genealogy/pull/561
- 目标：移除“世系图谱”查询结果顶部的已选择条件摘要和右侧图例提示。
- 工作分支：`agent/issue-560-remove-lineage-result-meta`
- Issue 类型：单页面前端小改
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：Tree 聚焦测试 + TypeScript + 前端构建 + diff 检查
- 影响模块：`frontend/genealogy-web/src/features/tree`。

## 实现结果

1. 查询结果顶部条件摘要整体不再展示。
2. “中心人物 / 正式数据 / 待核验 / 婚配关系”图例不再展示。
3. 删除54行不再需要的图例、颜色和响应式样式规则。
4. 摘要容器不再占据布局空间，结果 Tabs 下直接展示中心人物、图内定位与图谱画布。
5. 查询逻辑、URL 状态、图谱请求和详情 Drawer 均未修改。

## 任务看板

| 序号 | 任务 | 状态 | 结果或说明 |
|---|---|---|---|
| 1 | 建立 Issue、分支与执行现场 | ✅ 已完成 | Issue #560、分支、Draft PR #561 |
| 2 | 删除结果摘要和图例并清理样式 | ✅ 已完成 | `316f95ae`，业务变更仅涉及专属 CSS |
| 3 | 执行验证、检查 diff 并完成收尾 | ✅ 已完成 | Frontend CI Run #1011 success |

## 验证结果

- Tree graph model 测试：通过。
- 前端现有测试步骤：通过。
- TypeScript 类型检查：通过。
- 生产构建：通过。
- diff：仅包含 `lineage-double-card.css` 与本执行记录。

## 风险与回滚

- 风险低，仅改变结果摘要区域的展示。
- 不影响人物中心 / 支派全局 TAB、中心人物、图内定位或图谱行为。
- 回滚：回退 PR #561 即可恢复原展示。

## 恢复检查点

- 当前 Issue：#560
- 当前分支：`agent/issue-560-remove-lineage-result-meta`
- 当前 Draft PR：#561
- 业务提交：`316f95aeb4b0aad6d3bc62ae0109d60943b09615`
- CI 状态：Frontend CI Run #1011 success
- 未解决 Review：无
- 下一步最小任务：标记 Ready 并合入 `main`
- 最后更新时间：2026-07-20 16:10（北京时间）
