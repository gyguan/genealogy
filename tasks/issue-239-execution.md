# Issue #239 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/239
- 分支：`agent/issue-239-tree-interaction-layout`
- PR：https://github.com/gyguan/genealogy/pull/240
- 最新基线：`main@8da463eb4a2330bdf2ff82a70bb6c722ed205e43`

## 目标

在最新世系图谱单画布工作台上修复：

1. 宗族、支派及搜索范围切换时隐式触发人物搜索；
2. 显式搜索后查询结果与人物中心图不同步；
3. 画布滚轮缩放与页面滚动同时发生；
4. 人物卡片折叠加减号入口价值不明确；
5. 人物中心拓扑缺少以中心人物为锚点的清晰层次。

## 基线变化说明

处理期间 `main` 前进 4 个提交，已经重构 Tree 页面并删除独立 `tree-release-gate.yml`。旧分支与最新页面、画布、布局模型及 E2E 大面积重叠，直接合并会覆盖新能力，因此已将当前分支重置到最新 `main`，在新架构上重新应用最小修复。旧实现仍可通过 PR #240 历史提交追溯。

## 交付分级

- Issue 类型：单页面前端调整（Tree 核心交互）
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：最新 Frontend CI（包含 Tree 模型测试、TypeScript、生产构建）+ 聚焦浏览器用例静态复核
- 非目标：不修改 API、后端、数据库、权限、依赖或正式数据结构

## 任务看板

| 序号 | 任务 | 状态 | 结果或说明 |
|---|---|---|---|
| 1 | 同步最新 main、重读规则和新 Tree 架构 | ✅ 已完成 | 基线 `8da463e`；确认独立 Tree Gate 已移除 |
| 2 | 在新架构上修复搜索状态、滚轮事件、节点交互和中心布局 | 🔄 进行中 | 待修改页面、画布、布局模型及测试 |
| 3 | 执行最新门禁、轻量 Review 并合入 main | ⏳ 待处理 | 以 Frontend CI 为当前仓库有效门禁 |

## 预计影响文件

- `frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`
- `frontend/genealogy-web/src/features/tree/LineageGraphCanvas.tsx`
- `frontend/genealogy-web/src/features/tree/lineageGraphModel.ts`
- `frontend/genealogy-web/src/features/tree/lineageGraphModel.test.mjs`
- `frontend/genealogy-web/e2e/tree-release-gate.spec.ts`
- 必要时调整 `frontend/genealogy-web/src/lineage-graph.css`

## 当前恢复检查点

业务代码尚未修改。下一步基于最新主干实现显式搜索与中心图同步刷新，再修复画布滚轮、移除折叠入口并优化人物中心布局。

- 最后更新时间：2026-07-15 15:55（北京时间）
