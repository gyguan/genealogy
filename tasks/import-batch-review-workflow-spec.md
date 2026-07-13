# Spec: 导入批次审核闭环

## Objective

将已完成校验和失败行修正的人物导入批次接入统一审核中心。审核通过后，批次关联的人物草稿统一转为正式数据；审核驳回后保留草稿和原因，并允许创建新的审核轮次。

## User / Role

- 提交人：修谱主编、宗族管理员、支派管理员 / 支派编辑
- 审核人：具备审核权限且不是本批次提交人的审核员

## Scope

- 为 `import_job` 增加提交审核入口。
- 仅 `processing_status=ready_for_review` 且无失败行的批次可提交。
- 每次提交创建一条 `revision` 和一条 `review_task`。
- 审核摘要只保存文件名、支派名称、总数、草稿数和审核轮次，不保存原始行。
- 导入批次作为 `target_type=import_job` 出现在统一审核中心。
- 审核员不能审核自己提交的批次。
- 审核通过后，将批次中 `draft_created` 行关联的人物统一转为 `official`。
- 审核驳回后，批次进入 `rejected`，人物继续保持草稿。
- 驳回批次允许重新提交，并创建新的审核轮次，不覆盖历史记录。
- 导入任务列表和详情返回处理状态、审核状态和审核轮次。
- 前端支持提交审核、显示审核状态，并在提交后聚焦审核中心任务。

## Out of Scope

- 不支持部分通过。
- 不支持双人或多级审核。
- 不支持在审核中心直接编辑导入行。
- 不实现关系导入。
- 不统一清理仓库中重复的审核实体类。

## Success Criteria

- 存在失败行、空批次或非待提交状态时不能提交审核。
- 同一批次不能同时存在两条待审核任务。
- 提交人和审核人相同必须拒绝。
- 审核通过过程保持事务一致性：人物正式化、审核记录、任务和批次状态必须同时成功。
- 任一草稿人物缺失或已不属于本批次时，审核通过失败且整体回滚。
- 驳回后不删除人物草稿和导入行。
- 第二次提交的 `review_round` 为 2，历史审核记录仍可查询。
- 审核中心展示“人物导入批次”，不展示批次技术 ID。

## Affected Modules

- `docs/api/openapi.imports.json`
- `backend/genealogy-backend/src/main/java/com/genealogy/imports/**`
- `backend/genealogy-backend/src/main/java/com/genealogy/review/**`
- `frontend/genealogy-web/src/features/imports/**`
- `frontend/genealogy-web/src/features/reviews/ReviewCenterPage.tsx`
- `frontend/genealogy-web/src/shared/api/generated/api-contract.ts`
- 导入与审核模块测试

## API Impact

新增：

- `POST /api/v1/clans/{clanId}/imports/{jobId}/submit-review`

扩展导入任务响应：

- `processingStatus`
- `reviewStatus`
- `reviewRound`
- `latestReviewTaskId`（仅供前端导航，不直接展示）

## Security / Privacy Impact

- 提交审核沿用人物提交审核权限与批次支派范围。
- 审核通过/驳回沿用 `review_task:approve/reject`。
- 通用审核流程补齐禁止自审规则。
- revision 只保存批次摘要，不保存人物原始行、修正数据或在世人员字段。
- 所有提交、通过和驳回操作写入操作日志。

## Open Questions

- 多级审核和高风险批次双人复核留到后续。
- 已正式入谱批次是否允许整体撤销需单独设计，不在本次范围。
