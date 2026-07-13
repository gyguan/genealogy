# Spec: 导入批次行模型与状态机基础

## Objective

为人物导入建立可追溯的批次行模型和独立状态机，使后续失败行修正、重试、批次提交审核和驳回重提能够在同一条业务链路上实现。

## User / Role

- 修谱主编
- 宗族管理员
- 支派管理员 / 支派编辑

## Scope

- 新增 `import_job_row`，一条文件数据行对应一条导入行记录。
- 导入成功行关联生成的草稿人物 `draft_person_id`。
- 导入失败行保存错误码、错误信息和不可变原始数据。
- `import_job` 新增处理状态、审核状态、审核轮次和最新审核任务关联字段。
- 保留现有 `status` 字段及 `import_job_error`，兼容现有接口和页面。
- 新创建批次默认 `processing_status=processing`、`review_status=not_submitted`。
- 导入结束后：存在失败行进入 `correction_required`；全部成功进入 `ready_for_review`。

## Out of Scope

- 不开放失败行编辑接口。
- 不实现单行或批量重试。
- 不创建审核任务。
- 不实现审核通过后的批量正式入谱。
- 不修改关系导入。
- 不修改审核中心页面。

## Success Criteria

- 每一条被处理的文件行都有唯一的 `import_job_row` 记录。
- 成功行状态为 `draft_created` 且关联草稿人物。
- 失败行状态为 `invalid` 且保留错误信息。
- 同一批次的行号不能重复。
- 导入批次处理状态能区分“等待修正”和“可提交审核”。
- 现有导入任务查询和错误明细接口保持兼容。

## Affected Modules

- `backend/genealogy-backend/src/main/resources/db/migration/`
- `backend/genealogy-backend/src/main/java/com/genealogy/imports/entity/`
- `backend/genealogy-backend/src/main/java/com/genealogy/imports/repository/`
- `backend/genealogy-backend/src/main/java/com/genealogy/imports/application/ImportApplicationService.java`
- 导入模块单元测试

## API / Data Model Impact

本切片不新增公开 API。数据模型新增：

- `import_job.processing_status`
- `import_job.review_status`
- `import_job.review_round`
- `import_job.latest_review_task_id`
- `import_job.parent_job_id`
- `import_job.updated_at`
- `import_job_row` 表

## Security / Privacy Impact

- `raw_data` 和 `normalized_data` 可能包含在世人物信息，只允许在已有宗族与支派权限校验后访问。
- 原始行不可被修正流程覆盖；后续修改只能写入 `corrected_data`。
- 本切片不新增返回行数据的接口，避免提前扩大隐私暴露面。

## Open Questions

- 下一切片确定失败行编辑时采用结构化 JSON Patch 还是完整业务字段请求体。
- 审核接入时决定是否在 `import_job` 保存最新审核任务 ID，历史轮次仍由 `revision/review_task` 保留。
