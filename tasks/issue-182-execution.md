# Issue #182 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/182
- 目标：将建谱向导步骤导航调整为顶部横向布局，并移除面向用户的 `MVP1` 文案。
- 工作分支：`agent/issue-182-horizontal-wizard`
- 执行方式：前端布局与文案调整，不修改步骤顺序、状态判断、业务流程、后端契约、权限或审核语义。

## 实现范围

1. 将 `WizardShell` 的纵向 Steps 改为顶部横向 Steps。
2. 将七个步骤标题精简为“宗族、支派、字辈、人物、关系、来源、审核”。
3. 删除页面内部重复的“MVP1 建谱向导”标题和其他面向用户的 `MVP1` 文案。
4. 清理 `.mvp1-wizard-page` 的双栏、280px 左栏、sticky 和 grid-column 旧规则。
5. 增加中等宽度与移动端响应式处理，避免七步骤拥挤和页面整体横向溢出。
6. 执行 TypeScript、生产构建和 API 契约检查。

## 非目标

- 不重命名 `Mvp1WizardPage`、`Mvp1StepKey`、`features/mvp1/`、`mvp1Wizard` 路由键或 `mvp1-*.css` 文件。
- 不调整建谱步骤数量、顺序和完成状态判断。
- 不修改各步骤内部业务功能。
- 不修改后端 API、OpenAPI、权限、隐私、审核或正式数据生效逻辑。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 与现有实现现场 | ✅ 已完成 | 约 4 分钟 | 确认首次启动；无既有分支、PR 或执行文件 |
| 2 | 建立分支、执行看板和 Draft PR | ✅ 已完成 | 约 1 分钟 | `e3387e3`，Draft PR #185 已回写 Issue |
| 3 | 调整 Steps 结构与用户文案 | ✅ 已完成 | 约 1 分钟 | `cacc770`、`e6093bf`；短标题、横向 Steps、Tooltip 帮助 |
| 4 | 清理旧双栏样式并增加响应式布局 | ✅ 已完成 | 约 1 分钟 | `37da9e8`；移除 280px 左栏和 sticky，小屏切换纵向 |
| 5 | 检查 diff、MVP1 用户文案和布局风险 | ✅ 已完成 | 约 1 分钟 | 变更仅涉及 3 个前端文件和本执行看板；无业务逻辑改动 |
| 6 | 执行前端验证并修复问题 | ✅ 已完成 | 约 1 分钟 | Frontend CI 与 Diagnostic 全部通过 |
| 7 | 更新 PR、Issue 和最终恢复检查点 | ✅ 已完成 | 约 1 分钟 | PR 描述、验证结果和恢复检查点已同步，满足合入门禁 |

## 影响模块

- `frontend/genealogy-web/src/features/mvp1/Mvp1WizardPage.tsx`
- `frontend/genealogy-web/src/features/mvp1/WizardShell.tsx`
- `frontend/genealogy-web/src/mvp1-wizard-simplified.css`

## 验证结果

- `Frontend CI / Frontend Build`：通过。
- `Run log model tests`：通过。
- `Typecheck with focused output`：通过。
- `Build production frontend`：通过。
- `Check API contract`：通过。
- PR 评论：无。
- 未解决 Review 线程：无。

## 验收检查

- 桌面端 Steps 位于页面顶部并使用横向模式。
- 七个步骤使用“宗族、支派、字辈、人物、关系、来源、审核”短标题。
- 页面内部不再展示“MVP1 建谱向导”。
- 步骤状态和点击切换逻辑未改变。
- 页面不再使用 280px 左侧步骤栏、sticky 或双栏 grid-column。
- `md` 以下通过 Ant Design breakpoint 切换为纵向 Steps。
- 未修改后端接口、审核状态机、权限和数据语义。

## 设计规范偏离说明

`docs/10-frontend-design-guidelines.md` 默认建议超过 5 步优先使用纵向 Steps；Issue #182 的已批准验收标准明确要求桌面端横向展示，因此本次按 Issue 优先级实施，并通过短标题、全宽容器和小屏纵向切换补偿拥挤风险。

## 已知风险

- 本次未新增截图回归或 Playwright 视觉用例；响应式验证依据为组件 breakpoint、CSS 规则、TypeScript、生产构建和现有 CI。
- `mvp1-wizard.css` 中仍存在旧版 `.wizard-layout` / `.wizard-steps` 兼容样式，但当前 `Mvp1WizardPage` 不使用这些类；本 Issue 未扩大到删除未知历史入口。

## 当前恢复检查点

- 当前 Issue：#182
- 当前分支：`agent/issue-182-horizontal-wizard`
- 当前 PR：#185
- 最后完成任务：更新 PR、Issue 和最终恢复检查点
- 当前进行中任务：无
- 最新代码 Commit：`37da9e84ed40d7a0e0225593cea9b1f718195889`
- CI 状态：代码 Head 两条前端工作流全部通过；最终看板提交待确认
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：确认最终 Head CI 后合入 `main`
- 最后更新时间：2026-07-14 18:05（北京时间）
