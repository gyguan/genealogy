# Issue #390 / #392 / #394 执行看板

- 主 Issue：https://github.com/gyguan/genealogy/issues/390
- 后续 Issue：https://github.com/gyguan/genealogy/issues/392、https://github.com/gyguan/genealogy/issues/394
- 目标：按依赖顺序完善审核中心批量操作栏、批量确认和部分失败结果处理。
- 分支：`agent/issue-390-batch-review-workflow`
- Issue 类型：前端高风险交互改造
- 流程强度：标准
- 契约强度：无 API 变更
- 验证强度：Frontend CI（typecheck、build、api:check）
- 拆分结论：三个 Issue 强依赖且集中修改同一页面，按验收顺序在同一分支形成连续提交。

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
| 建立执行现场与 Draft PR | 进行中 | 当前提交 | 待创建 PR |
| #390 批量操作栏 | 待开始 | - | - |
| #392 批量确认与意见 | 待开始 | - | - |
| #394 部分失败结果与重试 | 待开始 | - | - |
| Diff Review 与 CI | 待开始 | - | - |

## 风险

- 批量失败原因依赖现有 Error message，可展示服务端可理解信息但不改变接口契约。
- 刷新列表会清空选择；部分失败场景需在刷新后仍保留结果 Modal 中的失败项快照。

## 恢复检查点

- 当前阶段：启动门禁。
- 下一步最小任务：创建 Draft PR，再修改 `ReviewCenterPage.tsx`。
- 外部等待：无。
- 最后更新时间：2026-07-16 15:25（北京时间）。
