# Implementation Plan: 导入任务管理第一阶段

## Overview

按“契约 → 后端 → 前端 → 测试”的垂直切片推进，不修改数据库和审核流程。除任务管理外，同步收口人物导入模板和支派权限边界。

## Dependency Order

1. API 契约明确模板、预览、任务导入、分页列表和详情响应。
2. Repository 支持 Specification 分页及宗族内任务查询。
3. 新增 `ImportJobApplicationService` 管理任务查询边界。
4. 增加人物模板和文件策略服务，禁止文件携带支派技术列。
5. Controller 接入分页、详情、模板和后端权限校验。
6. 前端拆出任务管理面板、修正人物导入端点并要求选择支派。
7. 补回归测试并做五轴 Review。

## Tasks

### Task 1：契约与 DTO

- 新增 `openapi.imports.json` 领域分片。
- 生成脚本合并基础契约和领域分片。
- 新增 `ImportJobSummaryResponse`。
- 任务列表返回 `PageResponse<ImportJobSummaryResponse>`。
- 任务详情返回 `ImportJobResponse`。
- 旧 `/imports/persons` 标记为 deprecated。

验收：预览返回预览 DTO；任务导入返回任务 DTO；列表不包含 errors；详情包含 errors。

### Task 2：后端任务查询

- `ImportJobRepository` 支持 Specification 和 `findByIdAndClanId`。
- 新增分页筛选和详情查询。
- 列表校验宗族或支派写范围。
- 详情先校验宗族成员，再按任务所属支派校验写范围。

验收：分页正确；跨宗族或越支派任务不可访问；列表无 N+1 错误查询。

### Task 3：模板与文件策略

- 人物模板只保留业务字段。
- 未选择目标支派时拒绝预览和导入。
- CSV/XLSX 表头包含支派、支派 ID 或 `branchId` 时后端拒绝。
- 导入映射强制忽略 `branchIdIndex`，人物统一归入工作区所选支派。

验收：模板不包含技术 ID；无法通过构造文件跨支派写入。

### Task 4：前端任务管理

- 人物确认导入改用 `/imports/persons.csv`。
- 新增任务筛选、分页、加载态、空态和错误态。
- 点击任务后按需加载错误明细。
- 未选支派时禁用文件选择、映射、预览和确认导入。
- 切换支派时清空文件、预览和重复确认。

验收：页面不展示技术 ID；切页和筛选触发服务端查询；支派上下文不会串用。

### Task 5：验证

- Application Service 权限、分页及错误按需加载测试。
- 文件策略和模板字段测试。
- Controller Bean 名、模板归属和人物路由唯一性测试。
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
- API 分片采用同名路径覆盖规则，领域所有权必须在 `docs/api/README.md` 中保持明确。
- 旧缓存模板可能仍包含支派列，后端会给出明确错误并引导重新下载模板。
