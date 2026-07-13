# Spec: 导入失败行修正与单行重试

## Objective

让人物导入中的失败行进入可分页、可修正、可重新校验的处理闭环。用户无需重新上传整份文件，即可修正单行业务字段并重新生成人物草稿。

## User / Role

- 修谱主编
- 宗族管理员
- 支派管理员 / 支派编辑

## Scope

- 按批次分页查询导入行，默认只返回失败行。
- 返回原始数据、标准化数据、已修正数据、错误状态和重试次数。
- 支持使用完整业务字段“保存并重试”单行。
- 修正后的数据写入 `corrected_data`，不覆盖 `raw_data`。
- 重试成功后创建人物草稿并关联 `draft_person_id`。
- 重试失败后保留修正数据、错误码和错误信息。
- 重算批次成功数、失败数、兼容执行状态和处理状态。
- 重试成功后同步清理兼容 `import_job_error`。
- 前端允许含错误行的文件创建待修正批次。
- 导入任务详情提供失败行修正入口。

## Out of Scope

- 不实现批量修正或批量重试。
- 不实现排除行。
- 不创建审核任务。
- 不实现审核通过后的正式入谱。
- 不修改关系导入。

## Success Criteria

- 失败行查询必须经过宗族成员和支派写范围校验。
- 列表采用服务端分页，默认查询 `invalid + retry_failed`。
- 重试请求不能修改目标支派。
- 已成功、审核中、已通过或已取消批次不能重复修正。
- 重试接口使用版本号防止覆盖他人修改。
- 成功重试不会重复创建人物草稿。
- 最后一个失败行修复后，批次进入 `ready_for_review`。
- 原始行始终保持不变。

## Affected Modules

- `docs/api/openapi.imports.json`
- `backend/genealogy-backend/src/main/java/com/genealogy/imports/**`
- `frontend/genealogy-web/src/features/imports/**`
- `frontend/genealogy-web/src/shared/api/generated/api-contract.ts`
- 导入模块测试

## API Impact

新增：

- `GET /api/v1/clans/{clanId}/imports/{jobId}/rows`
- `POST /api/v1/clans/{clanId}/imports/{jobId}/rows/{rowId}/retry`

重试请求只接收人物业务字段、重复确认和期望版本，不接收 `clanId`、`branchId` 或人物 ID。

## Security / Privacy Impact

- 行数据可能包含在世人物信息，必须复用任务所属宗族和支派权限。
- API 不返回 `draft_person_id`，只返回是否已生成草稿。
- 操作日志只记录批次、行号和结果，不复制人物原始数据。
- 审核中和已通过批次禁止修改。

## Open Questions

- 批量重试和错误文件下载放入后续 P1。
- 排除无效行需要单独的原因字段和审核摘要规则，暂不在本切片实现。
