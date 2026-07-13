# Review: 导入批次行模型与状态机基础

## Correctness

- 每一条实际执行的导入数据行都会形成唯一的 `import_job_row`。
- 成功行保存结构化业务快照并关联草稿人物。
- 失败行保留不可变原始数据、错误码和错误信息。
- 原 `import_job_error` 继续写入，现有任务详情接口保持兼容。
- 全部成功时批次进入 `ready_for_review`；存在失败行时进入 `correction_required`。
- 审核状态独立初始化为 `not_submitted`，不与文件执行状态混用。

## Readability

- 批次状态常量集中在 `ImportJobEntity`。
- 行状态常量集中在 `ImportJobRowEntity`。
- 旧 `status` 明确标记为兼容字段。
- 导入服务分别封装行初始化、结构化快照、错误码提取和旧状态转换。

## Architecture

- 本切片只建立导入领域基础，不提前修改审核中心或关系导入。
- `import_job_row` 是失败行编辑、重试和审核生效的统一基础，而不是继续扩展只读的 `import_job_error`。
- 完整审核历史后续仍由 `revision/review_task` 保存，`latest_review_task_id` 只用于批次快速定位最新轮次。
- 没有新增公开 API，避免数据模型未稳定前扩大契约范围。

## Security / Privacy

- 原始行及结构化数据可能包含在世人物信息。
- 本 PR 不增加导入行查询接口，暂不扩大数据可见范围。
- 后续行查询与修正接口必须复用宗族成员和支派写范围校验。
- 原始 `raw_data` 不允许被修正流程覆盖，后续修正写入 `corrected_data`。

## Performance

- 导入行和兼容错误记录均采用批量 `saveAll`，避免逐行 Repository 调用。
- `(job_id, row_no)` 唯一约束防止重复追溯记录。
- `(job_id, row_status, row_no)` 索引支撑后续失败行分页。
- 当前文件仍一次性读入内存，这是原有行为，不在本切片扩大；大文件流式化可作为后续性能任务。

## Verification

已通过：

- 后端 `mvn -DskipTests package`。
- `ImportApplicationServiceRowStateTest` 定向测试。
- 商业前端构建。
- PostgreSQL 启动检查完成后端打包并运行到 Flyway 初始化阶段。

仓库既有阻塞：

- PostgreSQL 启动仍因两个历史 Flyway `V3` 迁移而失败，与本次 `V5` 无关。
- 全量 Java 测试存在仓库历史失败，因此本次使用定向测试确认新增行为。

## Remaining Work

下一切片 P0-2：

- 失败行服务端分页查询。
- 结构化业务字段修正。
- 单行重新校验与幂等重试。
- 重算批次成功/失败数量和处理状态。
- 前端允许错误数据形成待修正批次，而不是仅在预览阶段阻断。
