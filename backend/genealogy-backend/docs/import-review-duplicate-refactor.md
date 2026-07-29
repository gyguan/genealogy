# 导入、审核与人物重复检测重构

## 人物重复检测

统一入口为 `PersonDuplicateDetectionService.detect(PersonDuplicateQuery)`。

`PersonDuplicateQuery` 是类型化查询，不暴露 JPA `Specification`。查询始终要求宗族与姓名，并可追加支派、代次、字辈和出生日期。候选查询最多返回 50 条，默认 10 条。

结果 `PersonDuplicateResult` 包含：

- 风险等级：`NONE`、`LOW`、`MEDIUM`、`HIGH`；
- 候选人物；
- 命中字段；
- 规则解释和候选数量。

人物创建、前端预检查和人物导入均复用该服务。旧 `/persons/check-duplicate` API 继续返回原 DTO，避免前端兼容性变化。

## 人物导入职责

导入流程拆为：

- `PersonImportParser`：CSV/XLSX 读取、模板列检查、值解析和类型化行模型；
- `PersonDuplicateDetectionService`：预览与导入前重复判断；
- `PersonImportBatchProcessor`：单批事务、人物草稿写入、行结果与错误记录；
- `ImportJobLifecycleService`：任务创建、状态汇总和响应组装；
- `ImportApplicationService`：权限校验与流程编排；
- `ImportMetrics`：耗时以及成功、失败、跳过指标。

### 批次和回滚语义

`GENEALOGY_IMPORT_BATCH_SIZE` 控制批次大小，默认 200，运行时强制限制在 100～500。

每个批次由 `REQUIRES_NEW` 事务提交：

- 行级格式或业务校验失败：写入错误和行状态，继续处理同一批次后续行；
- Repository、连接、约束提交等基础设施失败：整个批次回滚，不产生部分提交的批次；
- 已提交批次不受后续批次失败影响，可基于任务行记录审计和重试。

循环内不调用 `flush`。人物重复候选查询带固定上限，避免无界结果集。

### 指标

- `genealogy.import.duration`
- `genealogy.import.rows.success`
- `genealogy.import.rows.failure`
- `genealogy.import.rows.skipped`

指标只包含导入类型标签，不记录文件名、人物姓名、宗族或支派 ID。

## 审核质量检查

审核质量检查的职责拆为：

- `ReviewQualityCheckApplicationService`：权限、范围解析和流程编排；
- `ReviewQualityCheckExecutor`：质量规则执行与结果转换；
- `ReviewQualityCheckStateMachine`：唯一状态迁移入口；
- `ReviewQualityCheckAfterCommitActions`：事务提交后执行通知和后续动作；
- `ReviewQualityCheckStatus`、`ReviewQualityCheckMode`：类型化状态与模式。

状态迁移为：

- `QUEUED -> RUNNING`
- `RUNNING -> PASSED | ISSUES_FOUND | FAILED`
- `QUEUED -> FAILED`

终态不能再次迁移，非法迁移返回 `REVIEW_QUALITY_STATE_CONFLICT`。接口不再使用 null Request 表示默认行为，null 请求返回 `REVIEW_QUALITY_REQUEST_REQUIRED`。

完成后的后续动作通过 Spring 事务同步在 `afterCommit` 执行，避免事务回滚后仍发送完成通知或执行下游动作。

## 成员授权分层修正

`MemberGrantPolicy` 保留角色、范围、管理边界和最后一个管理员等领域不变量。Application Service 只装载成员、角色、支派和管理员计数，并将事实传给 Domain Policy；Domain 不依赖 Repository 或 Application。

## 本地验证

```bash
cd backend/genealogy-backend
mvn verify
```

PostgreSQL 集成、成员范围和真实浏览器 E2E 由现有 GitHub Actions 执行。
