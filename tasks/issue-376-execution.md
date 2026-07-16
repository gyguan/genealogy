# Issue #376 执行看板

- Issue：[#376 [Frontend][世系图谱] 按页面模式规范整改画布工作台](https://github.com/gyguan/genealogy/issues/376)
- 工作分支：`agent/issue-376-lineage-workbench`
- 目标：按 `docs/21-frontend-page-pattern-spec.md` 第 10 节收敛世系图谱为标准画布工作台，完善检查器、响应式、列表替代视图与可访问性。
- 实现范围：`LineageTreeProductPage.tsx`、`LineageGraphCanvas.tsx`、`lineage-tree.css` 及直接相关前端测试。
- 非目标：不修改 Tree API、世系核心数据结构、后端权限、审核流程、正式数据写入和导出业务逻辑。

## 交付分级

- Issue 类型：单页面前端调整（Tree 核心查询页面的交互与展示整改）
- 流程强度：轻量流程，保留 Tree 隐私与恢复状态专项复核
- 契约强度：无 API 契约变更
- 验证强度：最简门禁——前端类型检查、构建、API 检查、相关测试与 diff 范围检查
- 拆分信号：验收项较多，但集中于同一页面和同一画布组件，不涉及跨模块契约或数据结构；本次不拆 Issue，按 3 个原子任务独立提交
- 耗时口径：只记录实际活跃执行耗时；CI 排队、运行和 Review 等待单独记录，不计入活跃耗时

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、Issue 与现有实现，建立执行现场 | ✅ 已完成 | 约 7 分钟 | 已确认首次启动、影响范围与轻量交付策略；本提交为业务代码修改前检查点 |
| 2 | 重构页面结构、工具栏与响应式检查器 | 🔄 进行中 | 已累计 <1 分钟 | 下一步读取完整页面与样式实现并修改 |
| 3 | 增加列表替代视图、画布可访问性与聚焦测试 | ⏳ 待处理 | — |  |
| 4 | 执行最简门禁、检查 diff 并完成 PR/Issue 收尾 | ⏳ 待处理 | — |  |

## 复用与影响模块

- 复用现有 `TreeGraphResponse`、节点/连线语义模型、请求版本门和 URL 状态模型。
- 复用 Ant Design `Card`、`Drawer`、`Dropdown`、`Segmented`、`List`、`Tag`、`Grid` 等组件，不新增基础 UI 体系。
- 影响模块：`frontend/genealogy-web/src/features/tree`、`frontend/genealogy-web/src/lineage-tree.css`。

## 验证方案

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

并执行仓库中与 `LineageTreeProductPage`、`LineageGraphCanvas`、URL 状态和图谱模型直接相关的聚焦测试（以实际可用脚本为准）。

## 已知风险

1. 页面组件体量较大，结构调整需避免破坏人物/支派模式、过期响应隔离和 URL 恢复。
2. 列表替代视图必须继续遵守 masked 人物最小披露规则。
3. 大图谱键盘导航需要控制焦点数量，同时不能降低现有节点与连线可读性。
4. 当前任务不改变 API；若发现必须修改 Tree 返回结构，将停止并回写阻塞，不在本 Issue 静默扩围。

## 当前恢复检查点

- 当前 Issue：#376
- 当前分支：`agent/issue-376-lineage-workbench`
- 当前 Draft PR：待本检查点提交后立即创建
- 最后完成任务：读取规则、Issue 与已有现场；创建任务分支和执行看板
- 当前进行中任务：重构页面结构、工具栏与响应式检查器
- 最新 Commit：本文件检查点提交
- CI 状态：尚未触发
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：读取完整 `LineageTreeProductPage.tsx`、`LineageGraphCanvas.tsx`、`lineage-tree.css` 和相关测试，形成有限范围修改
- 最后更新时间：2026-07-16 13:06（北京时间）
