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
- 补充领域规则和应用层聚焦测试。

## 非目标

- 不新增数据库迁移。
- 不改变正式文化对象删除审核 apply 流程。
- 不调整页面布局和前端按钮；前端由 #583 承载。
- 不修改来源绑定、附件、追踪模型和 Tree 模块。

## 交付分级

- Issue 类型：审核 / 权限闭环。
- 流程强度：标准。
- 契约强度：无新增接口，仅收敛响应语义。
- 验证强度：后端编译、聚焦测试、现有 API 契约、前端类型检查与构建。
- 拆分信号：已拆分；前端入口由 #583 承载。

## 原子任务

| 序号 | 任务 | 状态 | 结果 / Commit |
|---:|---|---|---|
| 1 | 拆分文化资料编辑与删除状态规则 | 进行中 | 新增草稿删除专用门禁 |
| 2 | 收敛迁徙事件与文化场所删除规则 | 待开始 | 保留正式删除审核路由 |
| 3 | 收敛三类对象 `allowedActions.delete` | 待开始 | 列表与详情一致 |
| 4 | 聚焦测试、CI、Review 与合入 | 待开始 | 远程门禁与最终 diff |

## 验证方案

- `CultureItemDomainServiceTest`
- `MigrationEventDomainServiceTest` 或等价聚焦测试
- `CultureSiteDomainServiceTest`
- Backend CI
- API Contract
- Frontend Typecheck and Build
- diff 检查：无迁移、无 Tree 写操作、无前端页面改动

## 恢复检查点

- 当前 Issue：#582
- 当前分支：`agent/issue-582-culture-draft-delete`
- 当前 Draft PR：待创建
- 最后完成任务：分支与执行看板建立
- 当前任务：文化资料删除专用门禁
- CI 状态：未触发
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR 并回写 Issue
- 最后更新时间：2026-07-21（北京时间）
