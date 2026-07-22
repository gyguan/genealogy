# Issue #701 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/701
- 目标：参考宗族文化多 TAB 查询页，将世系图谱重构为“查询 Card + 结果 Card”，拆分人物中心图谱与支派全局图谱的查询条件、结果和 URL 状态。
- 工作分支：`agent/issue-701-lineage-tabs`
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
| 2 | 建立分支、执行检查点、Draft PR 和 Issue 回写 | 🔄 进行中 | 已累计约 2 分钟 | 当前检查点提交 |
| 3 | 实现多 TAB 查询页与两套独立查询状态 | ⏳ 待处理 | — | 包含 URL 状态和响应式布局 |
| 4 | 实现人物中心图谱 1～3 代裁剪并补测试 | ⏳ 待处理 | — | 复用现有 Tree fixture |
| 5 | 执行聚焦验证、diff 检查和 Review 整改 | ⏳ 待处理 | — | Tree 测试、TypeScript、生产构建 |
| 6 | 更新 PR / Issue 完成摘要并按门禁合入 main | ⏳ 待处理 | — | 满足门禁后 Squash Merge |

## 复用资产

- 复用 `CultureProductPage`、`CultureSearchHeader` 的 TAB 与 URL 状态模式。
- 复用 `QueryResultCard` 双卡结构。
- 复用 `personCenteredGraphModel.test.mjs` 的节点、边和图谱 fixture。
- 复用现有 `LineageGraphCanvas`、详情 Drawer、请求版本门和错误状态。

## 影响模块

- `frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`
- `frontend/genealogy-web/src/features/tree/lineageUrlState.ts`
- `frontend/genealogy-web/src/features/tree/personCenteredGraphModel.ts`
- Tree 模块局部 CSS 与测试

## 验证方案

1. `npm run test:tree`
2. `npm run typecheck`
3. `npm run build`
4. 检查 PR diff，仅包含 Issue #701 范围

## 已知风险

- 当前页面状态集中在单个大组件，拆分查询状态时需避免宗族切换、中心人物切换和图内定位互相污染。
- 人物中心 2～3 代节点量可能上升，需要保留后端 maxNodes 边界并在客户端按跳数裁剪。
- URL 旧参数需要兼容并规范化为新默认值。

## 恢复检查点

- 当前阶段：执行治理启动门禁
- 最后完成任务：规则、参考实现和现状分析
- 当前进行中任务：创建 Draft PR 并回写 Issue
- 最新 Commit：本检查点提交
- CI 状态：尚未触发
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，回写 Issue 后开始修改业务代码
- 最后更新时间：2026-07-22 15:16（北京时间）

## 耗时口径

- 活跃耗时：仅记录规则阅读、分析、编码、测试、diff、Review 和 GitHub 回写。
- 外部等待：CI 排队、CI 运行和 Review 等待单独记录，不计入活跃耗时。
