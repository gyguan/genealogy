# Issue #476 执行看板

## Issue 与目标

- Issue：#476 `[宗族文化 P1-01] 收敛宗族文化查询与新增操作布局`
- 目标：删除重复页面头，将宗族条件与新增操作下沉至三个业务 Tab，统一查询列表页面结构。
- 工作分支：`agent/issue-476-culture-layout`

## 范围

- `frontend/genealogy-web/src/features/culture/CultureProductPage.tsx`
- `CultureItemMaintenanceTab.tsx`
- `CultureItemStandardTab.tsx`
- `MigrationEventStandardTab.tsx`
- `CultureSiteStandardTab.tsx`
- 必要的样式和定向测试

## 非目标

- 不修改 API、OpenAPI、数据库、权限或审核语义。
- 不重构详情 Drawer 和编辑表单字段。

## 交付分级

- Issue 类型：单页面前端调整
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦测试 + `typecheck` + `build` + `api:check`
- 拆分信号：未命中；改动集中于同一页面模块，保留单 Issue 单 PR。

## 原子任务看板

| 任务 | 状态 | 产物/验证 | 活跃耗时 |
|---|---|---|---|
| T1 收缩父页面职责并调整 Tab 容器 | 进行中 | 页面头、Tab 挂载逻辑 | 待记录 |
| T2 将宗族选择与新增入口下沉至三个 Tab | 待开始 | 三个查询 Card 与列表工具栏 | 待记录 |
| T3 更新定向测试与样式 | 待开始 | 页面测试、样式收敛 | 待记录 |
| T4 执行前端门禁并 Review diff | 待开始 | typecheck/build/api:check | 待记录 |

## 复用策略

- 复用 `WorkspaceContext` 保存跨 Tab 宗族上下文。
- 复用现有编辑器状态和 URL 状态，不新增全局状态。
- 复用 Ant Design `Card`、`Form`、`Select`、`Button`、`Tabs`。

## 验证方案

1. 定向执行 culture 相关测试。
2. 执行 `npm run typecheck`。
3. 执行 `npm run build`。
4. 执行 `npm run api:check`。
5. 检查 PR diff 无 API、权限和审核语义变化。

## 已知风险

- 创建入口从父页面下沉后，需要确保三类编辑器的 URL 恢复和未保存确认保持有效。
- 宗族切换需要继续清理支派筛选、已选详情和编辑器状态。

## 耗时口径

- 活跃耗时仅记录实际分析、修改、验证和 Review 时间。
- CI、网络和外部工具等待单独记录，不计入活跃耗时。

## 恢复检查点

- 已完成 Issue 创建和影响范围分析。
- 已创建任务分支并提交本执行看板。
- 下一步最小任务：创建 Draft PR 后开始修改 `CultureProductPage.tsx`。

最后更新时间：2026-07-16 19:04（北京时间）
