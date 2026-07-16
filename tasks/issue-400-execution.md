# Issue #400 / #404 执行看板

- 主 Issue：https://github.com/gyguan/genealogy/issues/400
- 后续 Issue：https://github.com/gyguan/genealogy/issues/404
- 目标：完善审核中心列表状态反馈，并按审核队列优化桌面列和移动端展示。
- 分支：`agent/issue-400-review-list-states-responsive`
- Issue 类型：前端列表状态与响应式体验改造
- 流程强度：标准
- 契约强度：无 API 变更
- 验证强度：Frontend CI（typecheck、build、api:check）

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
| 建立执行现场与 Draft PR | 进行中 | 当前提交 | 待创建 PR |
| #400 列表状态反馈 | 待开始 | - | - |
| #404 队列列与响应式 | 待开始 | - | - |
| Diff Review 与 CI | 待开始 | - | - |

## 风险

- 403 识别兼容 HTTP 状态、业务错误码和错误文本，不展示既有数量及内容。
- 移动端断点使用 Ant Design Grid，不引入新依赖。

## 恢复检查点

- 当前阶段：启动门禁。
- 下一步最小任务：创建 Draft PR 并改造 `ReviewCenterPage.tsx`。
- 外部等待：无。
- 最后更新时间：2026-07-16 16:00（北京时间）。
