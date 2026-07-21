# Issue #582 执行任务看板

## Issue

- 链接：https://github.com/gyguan/genealogy/issues/582
- 前置：#581 已合入，Commit `e793447249d19f728d187aef808f31497dc830dc`
- 目标：收敛文化资料、迁徙事件、文化场所的直接删除状态与 `allowedActions`。

## 实现范围

- 文化资料：仅 `draft` 可直接软删除；`rejected` 保持可编辑但不可直接删除。
- 迁徙事件：仅 `draft` 可直接软删除；`official` 继续走既有删除审核。
- 文化场所：仅 `draft` 可直接软删除；`official` 继续走既有删除审核。
- `pending_review / rejected / archived` 均不得走直接删除。
- 列表与详情响应中的 `allowedActions.delete` 与真实后端规则一致。
- 补充领域规则、动作响应和编排测试。

## 非目标

- 不新增数据库迁移。
- 不改变正式文化对象删除审核 apply 流程。
- 不调整页面布局和前端按钮；前端由 #583 承载。
- 不修改来源绑定、附件、追踪模型和 Tree 模块。

## 交付分级

- Issue 类型：审核 / 权限闭环。
- 流程强度：标准。
- 契约强度：无新增接口，仅收敛响应语义。
- 验证强度：后端编译、聚焦测试、现有 API 契约、diff 检查。
- 拆分信号：已拆分；前端入口由 #583 承载。
- 活跃耗时：约 18 分钟，覆盖规则拆分、编排、动作收敛、测试和 diff。
- 外部等待：远程 CI 约 3 分钟，未计入活跃耗时。

## 原子任务

| 序号 | 任务 | 状态 | 结果 / Commit |
|---:|---|---|---|
| 1 | 拆分文化资料编辑与删除状态规则 | ✅ 已完成 | 草稿删除专用门禁；已驳回仍可编辑 |
| 2 | 收敛迁徙事件与文化场所删除规则 | ✅ 已完成 | 草稿直删；正式继续走治理审核；其他状态拒绝 |
| 3 | 收敛三类对象 `allowedActions.delete` | ✅ 已完成 | 草稿返回 delete，驳回无 delete，正式仅 request_delete |
| 4 | 聚焦测试、CI、Review 与合入 | 进行中 | Backend CI、API Contract 成功；无未解决 Review，待合入 |

## 关键实现

- 新增 `CultureDeletionApplicationService`，在 DELETE API 边界统一执行可见性、状态资格和既有应用服务委托。
- 文化资料直接删除必须为草稿。
- 迁徙事件、文化场所：正式状态委托既有治理服务生成删除审核；非正式状态仅草稿可直删。
- `CultureItemMapper` 过滤非草稿对象的 direct delete 动作。
- 迁徙事件和文化场所权限策略保持驳回态更新/重提能力，但不再返回 direct delete。
- 未修改原有软删除字段、操作日志和正式审核 apply 流程。

## 验证结果

- Backend CI / Backend Compile, Unit Tests and Package：✅ success（run #2683）。
- API Contract / API Contract Check：✅ success（run #1455）。
- 聚焦测试：`CultureDraftDeletePolicyTest`、`CultureAllowedActionsDeleteTest`、`CultureItemMapperDeleteActionTest` 已纳入 Backend CI。
- PR diff：✅ 无数据库迁移、无前端页面改动、无 Tree 写操作。
- 未解决 Review：无。

## 恢复检查点

- 当前 Issue：#582
- 当前分支：`agent/issue-582-culture-draft-delete`
- 当前 Draft PR：#585
- 最后完成任务：远程 CI 与 Review 检查
- 当前任务：PR 合入收尾
- 最新业务 Commit：`9de35960f556f0e944ce3850a34d4300db932b31`
- CI 状态：Backend、API Contract 成功
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：标记 Ready 并合入 main
- 最后更新时间：2026-07-21（北京时间）
