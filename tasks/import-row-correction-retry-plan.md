# Implementation Plan: 导入失败行修正与单行重试

## Overview

按契约 → DTO/Repository → 行应用服务 → Controller → 前端交互 → 测试的垂直切片推进，依赖 PR #92 的 `import_job_row` 和批次状态机。

## Dependency Order

1. 更新导入 OpenAPI 分片和生成类型。
2. 增加失败行响应与重试请求 DTO。
3. 扩展行仓储和兼容错误仓储。
4. 新增 `ImportJobRowApplicationService`，实现分页、修正、重试和批次重算。
5. Controller 暴露行查询与单行重试接口。
6. 前端允许错误文件形成批次，并提供“保存并重试”弹窗。
7. 增加权限、状态、幂等和批次重算测试。

## Tasks

### Task 1：契约

- 定义 `ImportJobRowResponse`。
- 定义 `PersonImportRowRetryRequest`。
- 定义分页响应。
- 增加失败行分页和单行重试路径。

验收：不暴露草稿人物技术 ID，不允许请求指定支派。

### Task 2：后端行服务

- 校验任务所属宗族与支派范围。
- 默认分页查询 `invalid/retry_failed`。
- 校验任务状态和期望版本。
- 保存 `corrected_data`。
- 重新校验姓名、性别、代次、出生日期和重复人物。
- 成功创建人物草稿，失败保留错误。
- 同步兼容错误表并重算批次。

验收：重复重试不会重复创建人物；最后一行成功后批次可提交审核。

### Task 3：前端闭环

- 预览有错误时不再阻断创建批次。
- 错误任务详情改为服务端分页加载失败行。
- 点击“修正”打开业务字段表单。
- 保存并重试后刷新行列表和任务统计。
- 显示原始数据但不展示人物、支派等技术 ID。

验收：用户可以在同一页面完成定位、修正和重试。

### Task 4：验证与 Review

- 权限越界测试。
- 审核中/已通过状态禁止修改测试。
- 乐观版本冲突测试。
- 成功/失败重试和批次重算测试。
- API 契约、前端类型和构建检查。

## Verification

```bash
cd backend/genealogy-backend
mvn -Dtest=ImportJobRowApplicationServiceTest test
mvn -DskipTests package

cd frontend/genealogy-web
npm run api:generate
npm run api:check
npm run typecheck
npm run build
```

## Risks

- 同一批次多人修正时可能产生覆盖，必须同时使用显式期望版本和 JPA 乐观锁。
- 重试成功后兼容错误表必须清理，否则旧页面仍显示已解决错误。
- 失败行返回原始数据属于敏感信息，权限校验必须在后端完成。
- 当前全量 CI 存在历史红灯，需要使用定向检查区分本次回归。
