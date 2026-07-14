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
| 1 | 刷新规则、Issue 与现有实现现场 | ✅ 已完成 | 约 6 分钟 | 确认首次启动；无既有分支、PR 或执行文件 |
| 2 | 建立分支、执行看板和 Draft PR | ✅ 已完成 | 约 2 分钟 | `e3387e3`，Draft PR #185 已回写 Issue |
| 3 | 调整 Steps 结构与用户文案 | 🔄 进行中 | 已累计约 2 分钟 | `cacc770`、`e6093bf`；等待样式联调与验证 |
| 4 | 清理旧双栏样式并增加响应式布局 | ⏳ 待处理 | — |  |
| 5 | 检查 diff、MVP1 用户文案和布局风险 | ⏳ 待处理 | — |  |
| 6 | 执行前端验证并修复问题 | ⏳ 待处理 | — |  |
| 7 | 更新 PR、Issue 和最终恢复检查点 | ⏳ 待处理 | — |  |

## 影响模块

- `frontend/genealogy-web/src/features/mvp1/Mvp1WizardPage.tsx`
- `frontend/genealogy-web/src/features/mvp1/WizardShell.tsx`
- `frontend/genealogy-web/src/mvp1-wizard-simplified.css`
- 必要时检查其他 `.mvp1-wizard-page`、`.wizard-ant-steps` 相关样式

## 验证方案

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

补充检查：

- 搜索面向用户渲染的 `MVP1` 文案。
- 检查七个步骤状态和点击切换逻辑未改变。
- 检查 1440px、1366px、1280px 和小屏响应式规则。
- 检查页面没有遗留 280px 左栏、sticky 或错误的 grid-column。

## 设计规范偏离说明

`docs/10-frontend-design-guidelines.md` 默认建议超过 5 步优先使用纵向 Steps；Issue #182 的已批准验收标准明确要求桌面端横向展示，因此本次按 Issue 优先级实施，并通过短标题、全宽容器和小屏响应式切换补偿拥挤风险。

## 已知风险

- 七个步骤在较窄桌面宽度下可能拥挤，需要控制标题长度和间距。
- 现有 CSS 中存在双栏与 grid-column 规则，清理不完整可能导致内容错位。
- Ant Design Steps 的响应式行为需要与页面容器样式配合，避免整体横向溢出。

## 当前恢复检查点

- 当前 Issue：#182
- 当前分支：`agent/issue-182-horizontal-wizard`
- 当前 Draft PR：#185
- 最后完成任务：建立分支、执行看板、Draft PR 并回写 Issue
- 当前进行中任务：调整 Steps 结构与用户文案
- 当前任务累计耗时：约 2 分钟
- 最新 Commit：`e6093bfb49fe2297dbc7a2b33fbbaa4849faf9c4`
- CI 状态：代码提交已触发，待汇总
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：清理旧双栏样式并增加响应式布局
- 最后更新时间：2026-07-14 18:00（北京时间）
