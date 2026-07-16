# Issue #390 / #392 / #394 执行看板

- 主 Issue：https://github.com/gyguan/genealogy/issues/390
- 后续 Issue：https://github.com/gyguan/genealogy/issues/392、https://github.com/gyguan/genealogy/issues/394
- 目标：按依赖顺序完善审核中心批量操作栏、批量确认和部分失败结果处理。
- 分支：`agent/issue-390-batch-review-workflow`
- Draft PR：https://github.com/gyguan/genealogy/pull/442
- Issue 类型：前端高风险交互改造
- 流程强度：标准
- 契约强度：无 API 变更
- 验证强度：Frontend CI（typecheck、build、api:check）
- 拆分结论：三个 Issue 强依赖且集中修改同一页面，按验收顺序在同一分支形成连续交付。

## 范围

1. #390：选中后显示批量操作栏，明确当前页范围、选中数量和取消选择。
2. #392：批量通过/驳回二次确认，展示对象类型分布；驳回原因必填。
3. #394：展示批量成功/失败明细，失败项可重试，保留筛选和分页。

## 非目标

- 不支持跨页全选。
- 不修改审核 API、权限或正式数据生效路径。
- 不处理单条审核入口和详情 Diff。

## 任务看板

| 任务 | 状态 | Commit | 验证 |
|---|---|---|---|
| 建立执行现场与 Draft PR | 已完成 | `839e20b` | PR #442 |
| #390 批量操作栏 | 已完成 | `122b322` | Diff Review |
| #392 批量确认与意见 | 已完成 | `122b322` | Frontend CI #681 |
| #394 部分失败结果与重试 | 已完成 | `122b322` | Frontend CI #681 |
| Diff Review 与 CI | 已完成 | `122b322` | success |

## 验证结果

- Frontend CI run #681：success。
- 批量操作栏仅在当前页存在选中项时展示。
- 批量驳回原因使用 Form 规则强制必填，确认过程中禁止关闭和重复提交。
- 部分失败时展示任务标题、对象类型和服务端错误信息，并支持仅重试失败项。
- 全部成功使用轻量成功反馈；筛选、Tab 和分页状态保持不变。

## 风险与后续

- 失败原因沿用现有服务端 Error message；后续可在状态冲突 Issue 中进一步结构化错误码。
- 不支持跨页全选，符合当前 Issue 范围。

## 恢复检查点

- 当前阶段：实现与验证完成。
- 最新业务 Commit：`122b322ba59ef3c1de24c1ceaa4bf9177ecdb05d`。
- CI：Frontend CI #681 success。
- 下一步最小任务：将 PR 标记为可评审并合入 `main`。
- 外部等待：无。
- 最后更新时间：2026-07-16 15:32（北京时间）。
