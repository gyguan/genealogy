# Issue #400 / #404 执行看板

- 主 Issue：https://github.com/gyguan/genealogy/issues/400
- 后续 Issue：https://github.com/gyguan/genealogy/issues/404
- 目标：完善审核中心列表状态反馈，并按审核队列优化桌面列和移动端展示。
- 分支：`agent/issue-400-review-list-states-responsive`
- PR：https://github.com/gyguan/genealogy/pull/450
- Issue 类型：前端列表状态与响应式体验改造
- 流程强度：标准
- 契约强度：无 API 变更
- 验证强度：Frontend CI（typecheck、build、既有前端测试）

## 范围

1. #400：区分首次加载、首次失败、刷新失败、空结果、未选择宗族和无权限；增加刷新、更新时间和场景动作。
2. #404：三个 Tab 使用差异化列；桌面使用 middle 表格；小屏使用 Card List；移动端 Drawer 100vw。

## 非目标

- 不新增后端风险字段。
- 不修改审核权限或正式数据生效路径。
- 不修改审核详情业务内容。

## 任务看板

| 任务 | 状态 | Commit | 验证 |
|---|---|---|---|
| 建立执行现场与 Draft PR | 已完成 | `b7bdf0e` | PR #450 |
| #400 列表状态反馈 | 已完成 | `2a20190` | CI #740 |
| #404 队列列与响应式 | 已完成 | `2a20190` | CI #740 |
| Diff Review 与 CI | 已完成 | `2a20190` | typecheck、build、既有测试通过 |

## 验证结论

- Frontend CI #740：success。
- 首次失败、刷新失败保留旧数据、403 清空、空结果和未选宗族状态均在结果 Card 内处理。
- 三个审核队列使用差异化列；桌面使用 middle 密度；移动端使用 Card List 和 100vw Drawer。
- 未修改 API、权限、数据库或正式数据生效流程。

## 已知边界

- 当前接口未返回风险字段，待审核风险区域显示“未评估”。
- 未选择宗族由现有全局宗族选择器完成，本页提供明确引导但不重复实现选择器。

## 恢复检查点

- 当前阶段：实现与验证完成。
- 最新业务 Commit：`2a201906e77edd293d1ebadf379c545a7fea0ab3`。
- 下一步：最终 CI 通过后将 PR 标记 Ready 并合入 `main`。
- 外部等待：无。
- 最后更新时间：2026-07-16 16:10（北京时间）。
