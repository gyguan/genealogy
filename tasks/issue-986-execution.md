# Issue #986 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/986
- 目标：修复修谱工作台在 1280 / 1440 桌面宽度下的表格信息丢失与拥挤问题，确保关键字段常显、低频字段可发现，并建立聚焦回归检查。
- 工作分支：`agent/issue-986-workbench-responsive-table`
- Draft PR：#990
- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：聚焦测试 + TypeScript / 前端构建；桌面截图作为手工验证建议
- 拆分信号：未命中。单一页面、无 API / 数据库 / 权限语义变化，可在一个 Issue 内独立验收。

## 实现范围

- 调整修谱工作台桌面表格的列分级和宽度策略。
- 关键字段在窄桌面保持直接可见；低频字段提供明确的展开查看入口。
- 避免固定操作列遮挡、标题拥挤和依赖横向滚动才能发现业务信息。
- 补充工作台聚焦治理测试。

## 非目标

- 不修改后端字段、分页接口或 OpenAPI。
- 不重构任务状态机、筛选、详情或移动端 Card List。
- 不统一其他页面的表格策略。

## 原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 现场并确认实现方案 | ✅ 已完成 | 约 6 分钟 | 已确认首次启动；采用“关键列常显 + 展开完整信息”方案 |
| 2 | 建立分支、任务看板、Draft PR 与 Issue 启动回写 | ✅ 已完成 | 约 4 分钟 | 检查点 `81cc659`；Draft PR #990 已创建 |
| 3 | 调整工作台表格列策略并补充完整信息入口 | ✅ 已完成 | 约 7 分钟 | Commit `388a877`；关键列常显，低频字段进入“完整信息”展开区 |
| 4 | 补充聚焦测试并完成 diff / 验证检查 | 🔄 进行中 | 已累计约 3 分钟 | Commit `56856c9`；正在检查 PR diff 与 CI |
| 5 | 更新 PR 看板、完成 Review 并按门禁合入 main | ⏳ 待处理 | — |  |

## 活跃耗时与外部等待口径

- 仅记录规则阅读、现场恢复、方案分析、代码与测试修改、diff 检查、验证结果读取和 GitHub 回写的实际活跃耗时。
- GitHub Actions 排队与运行时间单独记录为外部等待，不计入活跃耗时。
- 当前外部等待：CI 运行中，不计入活跃耗时。

## 复用资产

- 复用现有 `EditingWorkspacePage.tsx` 的 Ant Design `Table`、移动端 Card List、详情 Drawer 和 `WorkbenchRestructure.test.mjs` 聚焦治理测试。
- 不新增共享 Table 封装；本 Issue 仅使用页面内列配置和展开详情渲染。

## 影响模块

- `frontend/genealogy-web/src/features/workbench/EditingWorkspacePage.tsx`
- `frontend/genealogy-web/src/features/workbench/WorkbenchRestructure.test.mjs`
- `tasks/issue-986-execution.md`

## 验证方案

- 聚焦测试：`cd frontend/genealogy-web && npm run test:workbench`
- 类型检查：`cd frontend/genealogy-web && npm run typecheck`
- 前端构建：`cd frontend/genealogy-web && npm run build`
- 手工建议：检查 1280 / 1440 / 1920 下关键列、展开入口、内部滚动和操作可达性。

## 已知风险

- 当前接口没有独立“负责人”字段，本 Issue 不伪造业务语义；常显责任信息使用接口已有的“创建人”，完整任务信息在展开区和详情 Drawer 中可达。
- 不通过隐藏列、缩小字号或覆盖 Ant Design 内部 DOM 类解决问题。

## 恢复检查点

- 当前 Issue：#986
- 当前分支：`agent/issue-986-workbench-responsive-table`
- 当前 Draft PR：#990
- 最后完成任务：补充工作台窄屏信息完整性聚焦测试
- 当前进行中任务：检查 diff、读取 CI 并修复发现的问题
- 当前任务累计耗时：已累计约 3 分钟
- 最新 Commit：`56856c933fd93615331b7535593f6ea8f6c475b1`
- CI 状态：运行中 / 待读取
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：检查 PR changed files 和 patch，确认无无关修改
- 最后更新时间：2026-07-29 19:31（北京时间）
