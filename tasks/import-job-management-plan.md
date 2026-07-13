# Implementation Plan: 导入任务管理第一阶段

## Overview

按“契约 → 后端 → 前端 → 测试”的垂直切片推进，不修改数据库和审核流程。

## Dependency Order

1. API 契约明确任务导入、分页列表和详情响应。
2. Repository 支持 Specification 分页及宗族内任务查询。
3. 新增 `ImportJobApplicationService` 管理任务查询边界。
4. Controller 接入分页、详情和后端权限校验。
5. 前端拆出任务管理面板并修正人物导入端点。
6. 补回归测试并做五轴 Review。

## Tasks

### Task 1：契约与 DTO

- 新增 `ImportJobSummaryResponse`。
- 任务列表返回 `PageResponse<ImportJobSummaryResponse>`。
- 任务详情返回 `ImportJobResponse`。

验收：列表不包含 errors；详情包含 errors。

### Task 2：后端任务查询

- `ImportJobRepository` 支持 Specification 和 `findByIdAndClanId`。
- 新增分页筛选和详情查询。
- 校验登录、宗族和支派范围。

验收：分页正确；跨宗族或越支派任务不可访问；无 N+1 错误查询。

### Task 3：前端任务管理

- 人物确认导入改用 `/imports/persons.csv`。
- 新增任务筛选、分页、加载态、空态和错误态。
- 点击任务后按需加载错误明细。

验收：页面不展示技术 ID；切页和筛选触发服务端查询。

### Task 4：验证

- Repository / Application Service 权限与分页测试。
- Controller 路由和响应边界测试。
- 前端 typecheck、build、api:check。

## Verification

```bash
cd backend/genealogy-backend && mvn test
cd frontend/genealogy-web && npm run api:generate && npm run api:check && npm run typecheck && npm run build
```

## Risks

- 原始错误行可能包含隐私字段，详情必须按任务所属支派校验。
- 保留旧 `/imports/persons` 兼容接口，但正式前端不再使用，避免返回结构混用。
- 任务状态历史值可能包含 `partial_completed`，前端需要提供明确中文状态。
