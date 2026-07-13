# Review: 导入批次审核闭环

## Correctness

- 只有处理状态为 `ready_for_review`、失败数为 0、存在人物草稿的批次才能提交审核。
- 同一批次只能存在一条待审核记录。
- 每次提交创建新的 `revision` 与 `review_task`，审核轮次递增，历史记录不覆盖。
- 提交审核时，批次关联人物从 `draft/rejected` 统一进入 `pending_review`，避免与人物单独审核并行。
- 审核通过时，全部批次人物统一转为 `official`，批次进入 `approved`。
- 审核驳回时，人物恢复 `draft`，批次进入 `rejected`，可再次提交新轮次。
- 任一人物缺失、跨宗族/支派或状态不一致时，审核生效失败并由事务整体回滚。
- 通用审核通过和驳回入口统一禁止提交人自审。

## Readability

- 导入批次提交审核编排集中在 `ImportJobReviewApplicationService`。
- 审核结果生效集中在 `RevisionApplyService`，没有把正式化逻辑放入 Controller。
- 导入任务响应显式返回处理状态和审核状态，前端不再依赖旧 `status` 猜测业务阶段。
- 审核中心使用“人物导入批次、文件名、支派、草稿人数、审核轮次”等业务语言，不展示批次技术 ID。

## Architecture

- 复用通用 `revision/review_task` 表和 `ApprovalApplicationService`，没有新增第三套审核模型。
- 导入模块负责判断批次能否提交、构造摘要和锁定人物草稿。
- 通用审核模块负责审核权限、自审约束、任务状态流转和 apply/reject 调度。
- `RevisionApplyService` 负责批次人物正式化或退回草稿。
- 待审任务通过批量加载 revision 形成聚合响应，避免列表 N+1。
- 本 PR 保持堆叠范围，只处理人物导入批次，不扩展关系导入。

## Security / Privacy

- 提交审核使用人物提交审核权限并校验批次所属支派。
- 审核通过和驳回沿用 `review_task:approve/reject` 权限。
- 审核员不能审核自己提交的批次或其他业务变更。
- revision 的 before/after 只保存文件名、支派名称、统计数量、处理状态和审核轮次，不复制原始行、修正字段或在世人物详情。
- 操作日志只保存批次摘要，不保存人物原始数据。
- 人物和批次的审核状态在同一事务中更新，避免部分正式化。

## Performance

- 审核任务列表一次批量加载关联 revision，避免逐任务查询。
- 批次提交使用数据库计数确认行状态，再加载需要锁定的人物行。
- 审核通过和驳回使用 `saveAll` 批量保存人物。
- P0 采用单事务批量发布，适合当前 MVP；超大批次异步发布、分段锁定和进度恢复应单独作为性能任务。

## Verification

临时定向 CI 已全部通过，验证后已删除工作流：

- 后端 `mvn -DskipTests package`。
- `ImportApplicationServiceRowStateTest`。
- `ImportJobRowApplicationServiceTest`。
- `ImportJobReviewApplicationServiceTest`。
- `RevisionApplyImportJobTest`。
- `ApprovalSelfReviewTest`。
- `npm run api:check`。
- `PersonImportWorkspace`、`ImportJobManagementPanel`、`ReviewCenterPage` 定向 TypeScript 检查。
- `npm run build`。

仓库全量 Java/TypeScript 和 PostgreSQL 启动检查仍可能受到历史测试错误与重复 Flyway `V3` 迁移影响；本 PR 新增范围已通过定向验证。

## Risk Assessment

### 已控制

- 重复提交、自审、跨支派人物、缺失人物、状态漂移和隐私数据复制均已由后端规则限制。
- 审核事务中任一人物异常会整体回滚，不会出现半批正式入谱。

### 后续风险

- 当前审核中心列表仍是全量待审列表，后续应增加服务端分页和支派审核范围过滤。
- 大批量人物在单事务中正式化可能造成长事务，进入大规模导入阶段后需要异步发布设计。
- 仓库存在两套 Java 审核实体映射同一组表，应在独立重构任务中统一，不能与本业务 PR 混改。
- 驳回批次当前允许不修改数据直接再次提交；如产品需要强制“发生修正后才能重提”，需增加批次内容版本或 `last_corrected_at` 与驳回时间比较规则。

## Next Priority

P0 主闭环完成后，下一优先级建议为：

1. 合并并验证 #92 → #93 → #94。
2. 增加“我提交的 / 已处理”审核任务分页和审核意见查看。
3. 增加失败行批量重试与错误文件下载。
4. 处理超大批次异步发布和长事务风险。
5. 人物导入框架稳定后，再复用该框架实现关系导入。
