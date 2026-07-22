# Issue #701 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/701
- 目标：参考宗族文化多 TAB 查询页，将世系图谱重构为“查询 Card + 结果 Card”，拆分人物中心图谱与支派全局图谱的查询条件、结果和 URL 状态。
- 工作分支：`agent/issue-701-lineage-tabs`
- Draft PR：https://github.com/gyguan/genealogy/pull/703
- 实现范围：前端页面结构、两套查询状态、人物中心 1～3 代裁剪、URL 状态、局部样式与聚焦测试。
- 非目标：不修改 Tree 后端 API、OpenAPI、数据库、权限、隐私、审核流程和现有 SVG 画布核心实现。

## 交付分级

- Issue 类型：单页面前端调整
- 流程强度：标准
- 契约强度：不涉及，复用现有 Tree API
- 验证强度：聚焦 Tree 测试 + TypeScript + 生产构建
- 拆分信号：未命中；本次仅涉及前端 Tree 模块，未跨数据库、API、后端或治理闭环，不拆分 Issue。
- 自动门禁：最简门禁，仅执行受影响 Tree 测试、TypeScript 和生产构建；复杂 E2E 不设为自动必过项。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、Issue、宗族文化参考实现和世系图谱现状 | ✅ 已完成 | 约 6 分钟 | 已确认现有页面共用查询状态，需要按 TAB 拆分 |
| 2 | 建立分支、执行检查点、Draft PR 和 Issue 回写 | ✅ 已完成 | 约 3 分钟 | `bd8ea768`，Draft PR #703 |
| 3 | 实现多 TAB 查询页与两套独立查询状态 | ✅ 已完成 | 约 18 分钟 | 新增 `LineageTreeTabbedPage`、独立 URL 状态和响应式双卡布局 |
| 4 | 实现人物中心图谱 1～3 代裁剪并补测试 | ✅ 已完成 | 约 10 分钟 | `buildPersonCenteredGraph` 支持 1～3 跳及 160 节点保护 |
| 5 | 执行聚焦验证、diff 检查和 Review 整改 | 🔄 进行中 | 已累计约 2 分钟 | 等待 Tree 测试、TypeScript 和生产构建结果 |
| 6 | 更新 PR / Issue 完成摘要并进入待合入状态 | ⏳ 待处理 | — | 门禁通过后将 PR 标记 Ready |

## 复用资产

- 复用 `CultureProductPage`、`CultureItemStandardTab` 的 TAB、查询 Card 与 URL 状态模式。
- 复用 `QueryResultCard` 双卡结构。
- 复用 `personCenteredGraphModel.test.mjs` 的节点、边和图谱 fixture。
- 复用现有 `LineageGraphCanvas`、详情 Drawer、请求版本门和错误状态。

## 已完成设计

- 人物中心 TAB：宗族、支派、中心人物、关系范围、1～3 代深度；查询只刷新人物中心结果。
- 支派全局 TAB：宗族、支派、关系范围、支派深度、包含下级支派；不依赖中心人物。
- 两个 TAB 分别维护草稿条件、已应用条件、图谱结果、加载/错误和图内定位状态。
- URL 分别保存 `personBranchId`、`personDepth`、`personRelations`、`branchId`、`branchDepth`、`branchRelations` 与 `includeSubBranches`，并兼容旧 `relations` 参数。
- 中心人物选择框留在人物 TAB 查询区，画布工具栏仅 Portal“图内定位”。

## 影响模块

- `frontend/genealogy-web/src/features/tree/LineageTreeTabbedPage.tsx`
- `frontend/genealogy-web/src/features/tree/LineageTreeProductPagePortal.tsx`
- `frontend/genealogy-web/src/features/tree/lineageUrlState.ts`
- `frontend/genealogy-web/src/features/tree/personCenteredGraphModel.ts`
- `frontend/genealogy-web/src/features/tree/treeService.ts`
- Tree 模块局部 CSS 与聚焦测试

## 验证方案

1. `npm run test:tree`
2. `npm run typecheck`
3. `npm run build`
4. 检查 PR diff，仅包含 Issue #701 范围
5. 检查 Review 线程并整改 P0/P1

## 已知风险

- 新页面组件仍较长，但请求、URL、裁剪模型和画布职责已分离；后续可在不改变行为的前提下继续拆分查询表单组件。
- 人物中心 2～3 代节点量可能上升，已保留后端 maxNodes 边界并增加客户端 160 节点裁剪与提示。
- URL 旧参数通过 fallback 兼容，新写入使用两套独立参数。

## 恢复检查点

- 当前阶段：聚焦验证与 Review
- 最后完成任务：页面多 TAB 接入、独立查询状态和人物中心 1～3 代裁剪
- 当前进行中任务：读取 CI、修复测试/类型/构建问题
- 最新 Commit：`2c4267b0ff698aa201c614a6bc774468a4467d0a`
- CI 状态：已触发，待读取
- 未解决 Review：待检查
- 已知阻塞：无
- 下一步最小任务：读取 PR 最新工作流结果并修复失败项
- 最后更新时间：2026-07-22 15:38（北京时间）

## 耗时汇总

- 已完成任务活跃耗时：约 37 分钟
- 当前进行中累计耗时：约 2 分钟
- 外部等待：CI 排队与运行单独记录，不计入活跃耗时

## 耗时口径

- 活跃耗时：仅记录规则阅读、分析、编码、测试、diff、Review 和 GitHub 回写。
- 外部等待：CI 排队、CI 运行和 Review 等待单独记录，不计入活跃耗时。
