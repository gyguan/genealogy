# Implementation Plan: 导入批次审核闭环

## Overview

按导入任务响应契约 → 审核提交编排 → 审核 apply/reject → 审核中心展示 → 导入页面操作 → 测试验证的顺序完成垂直切片。复用通用 `revision/review_task`，不新增第三套审核模型。

## Dependency Order

1. 扩展导入任务 DTO 和 OpenAPI，返回处理状态与审核状态。
2. 在通用审核服务中增加 `import_job` 提交能力，并补齐禁止自审。
3. 在 `RevisionApplyService` 增加导入批次通过和驳回处理。
4. 增加导入专用提交审核接口。
5. 审核中心识别导入批次类型并展示业务标题。
6. 导入任务面板增加提交审核与审核状态。
7. 补提交、通过、驳回、重提和事务边界测试。

## Tasks

### Task 1：任务响应与契约

- `ImportJobSummaryResponse` 和 `ImportJobResponse` 增加处理状态、审核状态、审核轮次、最新审核任务。
- 新增批次提交审核路径和请求 Schema。
- 同步前端生成操作表。

验收：前端无需根据旧 `status` 猜测是否可提交审核。

### Task 2：提交审核

- `ApprovalApplicationService` 支持 `import_job`。
- 校验批次属于请求宗族和提交人支派范围。
- 校验批次已 `ready_for_review`、失败数为 0、存在至少一条草稿行。
- 校验所有可入谱行均关联草稿人物。
- 创建摘要型 revision 和 review task。
- 设置 `review_status=pending`、增加 `review_round`、记录最新任务。

验收：重复提交和未修正批次均被拒绝，revision 不保存原始人物数据。

### Task 3：审核通过与驳回

- 通用 approve/reject 增加禁止自审。
- `RevisionApplyService` 支持 `import_job`。
- 通过时逐个校验人物归属和草稿状态，再统一转 `official`。
- 同步批次 `review_status=approved`。
- 驳回时仅更新批次 `review_status=rejected`，人物继续保持草稿。

验收：任一人物异常时整个审核事务回滚；驳回不丢失修正内容。

### Task 4：前端联动

- 导入任务列表展示处理状态和审核状态。
- 只有可提交批次显示“提交审核”。
- 提交成功后刷新批次，并将审核任务写入工作区聚焦状态。
- 审核中心增加 `import_job → 人物导入批次` 映射和批次业务标题。

验收：用户不看到批次 ID；审核员能识别文件名、支派和人数摘要。

### Task 5：验证与 Review

- 未修正批次提交失败。
- 重复提交失败。
- 自审失败。
- 通过后全部人物 official。
- 人物缺失时回滚。
- 驳回后仍为草稿且可重提。
- 第二轮提交保留历史记录。
- API、前端类型和构建检查。

## Verification

```bash
cd backend/genealogy-backend
mvn -Dtest=ImportJobReviewApplicationServiceTest,ApprovalImportJobTest,RevisionApplyImportJobTest test
mvn -DskipTests package

cd frontend/genealogy-web
npm run api:generate
npm run api:check
npm run typecheck
npm run build
```

## Risks

- 通用审核服务当前涉及多种业务对象，新增禁止自审可能暴露历史测试中不合理的同人提交/审核数据，需要修正测试而不是放宽规则。
- 批次通过可能涉及大量人物更新，P0 使用单事务保证一致性；大批量异步发布留到性能阶段。
- 审核摘要不能包含原始行或人物详情，否则会扩大隐私数据复制面。
- 仓库存在两套 Java 审核实体映射同一组表，本切片只复用通用审核链路，不扩大技术债。
