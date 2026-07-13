# Issue #117 执行看板

- Issue：[#117 收敛日志查询、导出权限与隐私边界](https://github.com/gyguan/genealogy/issues/117)
- Draft PR：[#126 fix: secure operation log access for issue 117](https://github.com/gyguan/genealogy/pull/126)
- 工作分支：`agent/issue-117-operation-log-access`
- 目标：为操作日志查询、统计和导出建立后端鉴权、宗族范围、最小披露和导出审计闭环。
- 最后更新时间：2026-07-13 21:05（Asia/Tokyo）

## 实现范围

1. 操作日志查询、统计、导出统一要求登录。
2. `clanId` 调整为必填，并严格校验当前用户为目标宗族有效成员。
3. 查询与统计校验 `operation_log.view`，导出校验 `operation_log.export`。
4. 普通查看者不返回 `detail`、`requestId`、`clientIp`；具备导出权限的用户可查看完整技术字段。
5. CSV 导出保留 10000 条上限，并记录导出审计日志。
6. 按 Contract First 增加操作日志 OpenAPI Overlay，并生成前端操作契约。
7. 通过前向 Flyway 迁移补齐权限点和内置角色映射。

## 非目标

- 不重构追踪中心页面。
- 不建设统一对象追踪聚合接口。
- 不新增 `trace_id` 或业务追踪数据库字段。
- 不调整现有正式数据审核流程。
- 不修复主干已有的来源模块测试和重复 Flyway V3 基线问题。

## 方案、影响与回滚

### 方案

- Controller 接收认证头和必填 `clanId`，在查询数据库前完成登录、目标宗族有效成员及权限校验。
- `AuthorizationApplicationService` 新增严格宗族成员权限入口，不允许跨宗族角色绕过目标宗族成员关系。
- 技术字段可见性由后端根据 `operation_log.export` 权限决定，不依赖前端隐藏。
- 导出通过独立应用服务写入 `operation_log_export` 审计记录；审计详情不复制用户搜索关键词。
- OpenAPI 采用仓库 Overlay 合并机制；生成器补充可复用参数引用解析。
- 权限迁移只增量补齐 `operation_log.view/export` 及角色映射，不删除或重建现有授权。

### 角色边界

- `clan_admin`、`cross_clan_admin`、`auditor`：查看和导出。
- `reviewer`：仅查看。
- `viewer` 等其他角色：默认不授予操作日志权限。
- 所有角色仍必须是目标宗族的有效成员。

### 兼容影响

- 未传 `clanId` 的历史调用将返回参数校验错误。
- 未登录、非目标宗族有效成员、无权限调用将在读取日志前被拒绝。
- 普通查看者响应中的 `detail`、`requestId`、`clientIp` 为 `null`。
- 具备导出权限的调用可获得完整 CSV，最多 10000 条。

### 回滚方式

- 先回滚应用代码和 OpenAPI 契约。
- 再按 `database/rollback/issue-117-operation-log-permissions.sql` 补偿权限数据。
- 不修改或删除任何历史 Flyway 文件。
- 若只需调整角色范围，可修改前向权限映射，不需要回滚操作日志业务数据。

## 原子任务看板

| 状态 | 任务 | 验证 |
|---|---|---|
| ✅ | 建立任务分支、执行检查点和 Draft PR | 分支、任务文件、PR 已创建 |
| ✅ | 定义日志查询、统计和导出 OpenAPI 契约 | API Contract 检查通过 |
| ✅ | 增加严格宗族成员校验与权限入口 | 聚焦授权测试通过 |
| ✅ | 实现日志技术字段最小披露 | view/export 字段裁剪测试通过 |
| ✅ | 实现受控 CSV 导出与导出审计 | 上限、审计记录和关键词保护测试通过 |
| ✅ | 补齐权限点及内置角色映射 | Flyway 治理检查通过 |
| ✅ | 验证权限迁移兼容性和幂等性 | PostgreSQL 16 上 compact/extended 两版权限 Schema 均通过 |
| ✅ | 生成前端操作契约并包含必填 `clanId` | 三个日志操作均包含 `clanId` |
| ✅ | 清理临时生成与诊断工作流 | PR 不保留 Issue 专用工作流 |
| ✅ | 完成安全与变更范围复核 | 未修改正式数据审核流程和历史迁移 |

## 影响模块

- `docs/api/openapi.operation-log-security.json`
- `scripts/api/generate-frontend-client.mjs`
- `frontend/genealogy-web/src/shared/api/generated/api-contract.ts`
- `auth`：严格目标宗族成员与 RBAC 权限入口
- `operationlog`：Controller、Application Service、导出审计服务
- `db/migration`：权限点与角色映射前向迁移
- `database/rollback`：手工补偿脚本
- 后端聚焦测试

## 验证结果

### 已通过

- Issue Delivery Governance。
- Database Migration Governance。
- API Contract。
- 前端商业版构建。
- #117 聚焦测试：
  - `AuthorizationApplicationServiceTest`
  - `OperationLogApplicationServiceTest`
  - `OperationLogExportApplicationServiceTest`
  - `OpLogControllerTest`
- PostgreSQL 16 权限迁移验证：
  - compact 历史权限表结构；
  - extended 当前实体权限表结构；
  - 重复执行幂等；
  - 管理员、审计员、审核员、查看者授权边界。

### 主干既有阻塞

以下失败与本 Issue 修改无因果关系，未在本 PR 中跨范围修复：

1. 后端全量测试已有来源模块 Mockito 严格桩缺失：
   - `SourceApplicationServiceTest` 缺少 `source:update` 等权限桩；
   - `SourceAttachmentApplicationServiceTest` 缺少 `attachment:preview` 等权限桩。
2. PostgreSQL 启动检查发现主干同时存在：
   - `V3__app_permission_schema.sql`；
   - `V3__source_library_status_and_fields.sql`。
   Flyway 因重复版本 `3` 在执行本次新迁移前即终止。

## 验收标准核对

- [x] 未登录用户不能访问日志接口。
- [x] 非当前宗族有效成员不能查询、统计或导出该宗族日志。
- [x] 无 `operation_log.view` 权限时在读取数据前返回鉴权错误。
- [x] 无 `operation_log.export` 权限时不能导出。
- [x] 普通查看者默认看不到 IP、Request ID 和原始 detail。
- [x] 导出操作形成审计记录。
- [x] CSV 导出受 10000 条上限保护。
- [x] 权限点、角色映射、契约和聚焦测试已补齐。
- [x] 未通过前端隐藏按钮替代后端鉴权。

## 当前恢复检查点

- 当前阶段：实现完成，等待代码 Review 与合入决策。
- 当前 Issue：#117。
- 当前分支：`agent/issue-117-operation-log-access`。
- 最后完成任务：清理临时工作流并固化验证结果。
- 当前进行中：更新 PR 描述与 Issue 状态说明。
- 下一步最小任务：评审 PR #126；主干基线问题需独立治理后再要求全量 CI 绿色。
- 最新已知 Commit：`f2f3ece21e7458cb33604e56506343cfbec8a8cd`（本文件更新后将变化）。
- CI 状态：#117 专项项通过；Backend CI 受主干既有测试和重复 V3 迁移阻塞。
- 未解决 Review：无已提交 Review 评论。
- 已知阻塞：主干重复 Flyway V3、来源模块既有严格桩测试失败。
