# Implementation Plan: 导入批次行模型与状态机基础

## Overview

按数据模型 → 实体与仓储 → 导入写入 → 测试验证的顺序完成一个后端垂直切片。公开 API 和前端保持不变。

## Dependency Order

1. 增加 Flyway 迁移，建立批次状态字段和 `import_job_row`。
2. 增加 `ImportJobRowEntity` 与 Repository。
3. 扩展 `ImportJobEntity`。
4. 修改人物导入流程，为每一行写入状态并关联草稿人物。
5. 增加状态机和行追溯测试。
6. 执行定向 Maven 测试与后端打包。

## Tasks

### Task 1：数据库基础

- 为 `import_job` 增加处理状态、审核状态、审核轮次、最新审核任务、父批次和更新时间。
- 创建 `import_job_row`。
- 增加 `(job_id, row_no)` 唯一约束。
- 增加按批次和状态查询的索引。

验收：迁移可重复执行关键 DDL，不覆盖历史批次执行状态。

### Task 2：实体与仓储

- 扩展 `ImportJobEntity`。
- 新增 `ImportJobRowEntity`。
- 新增 `ImportJobRowRepository`，支持按批次和状态分页、计数及按行号查询。

验收：字段与数据库列名明确映射；行记录支持乐观锁。

### Task 3：导入写入链路

- 创建任务时初始化处理状态和审核状态。
- 每一行先建立追溯记录。
- 成功保存人物草稿后记录 `draft_person_id` 和 `draft_created`。
- 失败时记录 `invalid`、错误码和错误信息。
- 批次结束后根据失败数量更新为 `correction_required` 或 `ready_for_review`。
- 继续写入 `import_job_error`，保持现有详情接口兼容。

验收：不会因失败行中断整个批次；成功行不会重复创建行记录。

### Task 4：测试与 Review

- 验证全部成功时批次进入 `ready_for_review`。
- 验证部分失败时批次进入 `correction_required`。
- 验证成功行关联草稿人物。
- 验证失败行保留错误信息。
- Review 权限、隐私、事务一致性和索引边界。

## Verification

```bash
cd backend/genealogy-backend
mvn -Dtest=ImportApplicationServiceTest,ImportJobRowStateTest test
mvn -DskipTests package
```

数据库启动检查可能仍受仓库既有重复 Flyway `V3` 问题影响，需区分本迁移语法问题和历史版本冲突。

## Risks

- 当前导入在单个事务中执行；后续重试必须保证已成功人物不会重复创建。
- 原始行可能包含隐私数据，后续行查询接口必须沿用宗族和支派权限校验。
- `import_job_error` 与 `import_job_row` 在过渡期会同时保存错误信息，后续稳定后再评估兼容表下线。
- 审核历史不能依赖 `latest_review_task_id` 单字段，完整历史仍由审核表保存。
