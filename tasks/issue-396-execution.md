# Issue #396 / #397 / #399 执行看板

- 主 Issue：https://github.com/gyguan/genealogy/issues/396
- 后续 Issue：https://github.com/gyguan/genealogy/issues/397、https://github.com/gyguan/genealogy/issues/399
- 目标：依次统一单条审核入口、补齐审核详情决策信息并处理并发状态冲突。
- 分支：`agent/issue-396-review-detail-conflict`
- Draft PR：https://github.com/gyguan/genealogy/pull/448
- Issue 类型：前端高风险审核交互改造
- 流程强度：标准
- 契约强度：复用现有审核详情与 `ReviewDiffResponse` 契约，未修改正式数据生效接口
- 验证强度：Frontend CI（typecheck、build、api:check）
- 拆分结论：三个 Issue 强依赖且集中修改审核中心页面，按验收顺序在同一分支交付。

## 完成范围

1. #396：行内操作统一为“详情 + 审核”；决策 Modal 统一选择通过/驳回，驳回原因必填。
2. #397：Drawer 展示审核摘要、字段 Diff、来源证据、风险冲突、影响范围和审核历史；无数据时展示明确空态。
3. #399：兼容 HTTP 409、业务错误码与冲突文本；单条冲突刷新详情和列表，批量冲突进入失败明细。

## 任务看板

| 任务 | 状态 | Commit | 验证 |
|---|---|---|---|
| 建立执行现场与 Draft PR | 已完成 | `4215002` | PR #448 |
| #396 单条审核入口与校验 | 已完成 | `01386d4` | Frontend CI #719 |
| #397 审核详情信息结构 | 已完成 | `01386d4` | Frontend CI #719 |
| #399 并发冲突处理 | 已完成 | `01386d4` | Frontend CI #719 |
| Diff Review 与 CI | 已完成 | `01386d4` | success |

## 验证结果

- Frontend Typecheck：通过。
- Production Build：通过。
- 既有前端定向测试：通过。
- Diff Review：未修改审核 API、权限判定、数据库或正式数据生效路径。

## 已知边界

- 来源、风险和影响信息受当前详情契约限制；未返回的数据使用明确空态，不进行前端推断。
- 冲突后的最新处理人和处理时间以重新加载的详情接口返回值为准。

## 恢复检查点

- 当前阶段：实现与验证完成。
- 最新业务 Commit：`01386d495e7df660846c4afd070e31357d526d7b`。
- CI：Frontend CI #719 success。
- 下一步最小任务：将 PR 标记为 Ready 并合入 `main`。
- 外部等待：无。
- 最后更新时间：2026-07-16 15:58（北京时间）。
