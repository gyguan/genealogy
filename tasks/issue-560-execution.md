# Issue #560 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/560
- 目标：移除“世系图谱”查询结果顶部的已选择条件摘要和右侧图例提示。
- 工作分支：`agent/issue-560-remove-lineage-result-meta`
- Issue 类型：单页面前端小改
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：Tree 聚焦测试 + TypeScript + 前端构建 + diff 检查
- 影响模块：`frontend/genealogy-web/src/features/tree`。

## 实现范围

1. 删除查询结果中的条件 Tag 摘要。
2. 删除“中心人物 / 正式数据 / 待核验 / 婚配关系”图例。
3. 清理无用变量、函数、导入和 CSS。
4. 收紧结果工具栏上方间距，保留人物中心、支派全局、中心人物、图内定位和图谱画布。

## 任务看板

| 序号 | 任务 | 状态 | 结果或说明 |
|---|---|---|---|
| 1 | 建立 Issue、分支与执行现场 | ✅ 已完成 | Issue #560 与当前检查点 |
| 2 | 删除结果摘要和图例并清理样式 | ⏳ 待处理 | 下一步最小任务 |
| 3 | 执行验证、检查 diff 并完成收尾 | ⏳ 待处理 | 复用 Frontend CI |

## 验证方案

```bash
cd frontend/genealogy-web
npm run test:tree
npm run typecheck
npm run build
```

## 恢复检查点

- 当前 Issue：#560
- 当前分支：`agent/issue-560-remove-lineage-result-meta`
- 当前 Draft PR：待创建
- CI 状态：未开始
- 下一步最小任务：创建 Draft PR 后修改页面和样式
- 最后更新时间：2026-07-20 16:05（北京时间）
