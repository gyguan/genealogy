# Issue #558 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/558
- 目标：修正查询结果中“中心人物”和“图内定位”组件未对齐的问题。
- 工作分支：`agent/issue-558-align-lineage-toolbar`
- PR：https://github.com/gyguan/genealogy/pull/559
- Issue 类型：样式 / 单页面前端小改
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：TypeScript + 前端构建 + diff 检查
- 拆分结论：未命中拆分信号；仅调整结果区工具栏对齐样式。
- 影响模块：`frontend/genealogy-web/src/features/tree/lineage-double-card.css`。

## 根因

公共样式 `.lineage-result-toolbar` 使用 `align-items: end`。人物中心字段包含额外说明文字，Form.Item 高度大于“图内定位”，底部对齐会导致“中心人物”Select 整体上移，两个控件无法保持同一水平基线。

## 实现结果

1. 在双 Card 专属工具栏样式中显式设置 `align-items: start`。
2. 人物中心 TAB 中两个 Form.Item 从顶部对齐，标签与 Select 控件保持同一基线。
3. 不改动组件结构、说明文字、查询状态或图谱请求逻辑。
4. 支派全局仍保持单个“图内定位”右对齐。
5. 移动端继续使用单列布局。

## 验证结果

- Frontend CI Run #1003：通过。
- Tree graph model 测试：通过。
- 前端工作流现有测试：通过。
- TypeScript 类型检查：通过。
- 生产构建：通过。
- diff 检查：业务变更仅在 `lineage-double-card.css` 增加 `align-items: start`。

## 执行过程说明

- 建立治理现场时曾误创建一个空占位文件 `tasks/issue-PLACEHOLDER.md` 到 `main`，随后立即删除；该文件为空且当前仓库中不存在，不包含业务代码、数据或敏感信息。
- 正式业务变更全部通过 Issue #558、分支和 PR #559 交付。

## 风险与回滚

- 风险低：仅覆盖双 Card 结果工具栏的交叉轴对齐方式。
- 不影响支派全局、移动端单列和图谱数据行为。
- 回滚：回退 PR #559 即可恢复原样式。

## 恢复检查点

- 当前 Issue：#558
- 当前分支：`agent/issue-558-align-lineage-toolbar`
- 当前 PR：#559
- 业务提交：`7a5a1297b7101e19075faa661571d69eebb6a5cc`
- CI 状态：Frontend CI Run #1003 success
- 未解决 Review：无
- 下一步最小任务：标记 Ready 并合入 `main`
- 最后更新时间：2026-07-20 16:05（北京时间）

## 耗时汇总

- 活跃耗时：约 12 分钟
- 外部等待：Frontend CI 运行时间，未计入活跃耗时
