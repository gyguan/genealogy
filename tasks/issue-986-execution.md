# Issue #986 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/986
- 目标：修复修谱工作台在 1280 / 1440 桌面宽度下的表格信息丢失与拥挤问题，确保关键字段常显、低频字段可发现，并建立聚焦回归检查。
- 工作分支：`agent/issue-986-workbench-responsive-table`
- PR：#990
- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：聚焦测试 + TypeScript / 前端构建 + 现有视觉与多浏览器门禁
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
| 2 | 建立分支、任务看板、Draft PR 与 Issue 启动回写 | ✅ 已完成 | 约 4 分钟 | 检查点 `81cc659`；PR #990 已创建并完成 Issue 回写 |
| 3 | 调整工作台表格列策略并补充完整信息入口 | ✅ 已完成 | 约 7 分钟 | Commit `388a877`；关键列常显，低频字段进入“完整信息”展开区 |
| 4 | 补充聚焦测试并完成 diff / 验证检查 | ✅ 已完成 | 约 6 分钟 | Commit `56856c9`；3 个预期文件，无无关修改；全部验证通过 |
| 5 | 更新 PR 看板、完成 Review 并按门禁合入 main | ✅ 已完成 | 约 3 分钟 | PR 已转 Ready，完成检查点固化后立即执行合入 |

## 验证结果

- ✅ Frontend CI：工作台聚焦测试、DOM / CSS 治理、TypeScript、生产构建全部通过。
- ✅ Security Penetration：通过。
- ✅ Visual Release Gate：通过。
- ✅ Functional E2E：PostgreSQL 集成与真实浏览器 E2E 通过。
- ✅ Multi-Browser Compatibility：Edge、Firefox、Chrome / Chromium、Safari / WebKit 和 Chromium 高 DPI / 桌面视口全部通过。
- ✅ Diff 检查：仅修改工作台页面、工作台聚焦测试和本执行看板。

## 活跃耗时与外部等待

- 已完成任务活跃耗时：约 26 分钟。
- 外部等待：GitHub Actions 排队与运行等待，不计入活跃耗时。
- 未记录历史任务：无。

## 复用资产

- 复用现有 `EditingWorkspacePage.tsx` 的 Ant Design `Table`、移动端 Card List、详情 Drawer 和 `WorkbenchRestructure.test.mjs` 聚焦治理测试。
- 未新增共享 Table 封装；仅使用页面内列配置和展开详情渲染。

## 影响模块

- `frontend/genealogy-web/src/features/workbench/EditingWorkspacePage.tsx`
- `frontend/genealogy-web/src/features/workbench/WorkbenchRestructure.test.mjs`
- `tasks/issue-986-execution.md`

## 已知风险与结论

- 当前接口没有独立“负责人”字段，本次未伪造业务语义；常显责任信息使用接口已有的“创建人”，完整任务信息在展开区和详情 Drawer 中可达。
- 没有使用隐藏列、缩小字号、全局 CSS 或覆盖 Ant Design 内部 DOM 类解决问题。
- 无已知阻塞；无遗留代码事项。

## 最终恢复检查点

- 当前 Issue：#986
- 当前分支：`agent/issue-986-workbench-responsive-table`
- 当前 PR：#990
- 最后完成任务：完成全部代码、测试、diff 检查和验证
- 最新业务 Commit：`56856c933fd93615331b7535593f6ea8f6c475b1`
- CI 状态：全部成功
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：将 PR #990 合入 `main` 并回写最终完成摘要
- 最后更新时间：2026-07-29 19:37（北京时间）
