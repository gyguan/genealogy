# Issue #439 执行看板

- Issue：[#439 [Frontend][世系图谱] 对齐工具栏并简化条件状态提示](https://github.com/gyguan/genealogy/issues/439)
- 工作分支：`agent/issue-439-align-toolbar-status`
- 目标：统一世系图谱工具栏控件基线，并将条件状态提示收敛为仅在待应用时展示。
- 实现范围：`LineageTreeProductPage.tsx`、`lineage-workbench-issue376.css`。
- 非目标：不修改 Tree API、URL 状态、查询参数和画布数据模型。

## 交付分级

- Issue 类型：单页面样式与交互文案调整
- 流程强度：轻量
- 契约强度：无 API 变更
- 验证强度：前端类型检查、构建、Tree 聚焦测试和 diff 范围检查
- 拆分结论：仅涉及同一工具栏，不拆分

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 建立 Issue、分支、执行看板和 Draft PR | 🔄 进行中 | 已累计约 3 分钟 | 业务修改前检查点 |
| 2 | 对齐工具栏控件并简化条件状态提示 | ⏳ 待处理 | — |  |
| 3 | 执行验证、检查 diff 并收尾 | ⏳ 待处理 | — |  |

## 验证方案

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
```

并确认 Frontend CI 中 Tree graph model 测试通过。

## 当前恢复检查点

- 当前 Issue：#439
- 当前分支：`agent/issue-439-align-toolbar-status`
- 当前阶段：业务代码修改前检查点
- 下一步最小任务：修改工具栏布局样式与条件状态渲染
- 最后更新时间：2026-07-16 14:24（北京时间）
