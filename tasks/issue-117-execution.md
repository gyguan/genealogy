# Issue #117 执行看板

- Issue：[#117 收敛日志查询、导出权限与隐私边界](https://github.com/gyguan/genealogy/issues/117)
- 工作分支：`agent/issue-117-operation-log-access`
- 目标：为操作日志查询、统计和导出建立后端鉴权、宗族范围、最小披露和导出审计闭环。
- 最后更新时间：2026-07-13 19:36（Asia/Shanghai）

## 实现范围

1. 操作日志查询、统计、导出统一要求登录。
2. `clanId` 调整为必填，并严格校验当前用户为目标宗族有效成员。
3. 查询与统计校验 `operation_log.view`，导出校验 `operation_log.export`。
4. 普通查看者不返回 `detail`、`requestId`、`clientIp`；具备导出权限的用户可查看完整技术字段。
5. CSV 导出保留 10000 条上限，并记录导出审计日志。
6. 按 Contract First 更新 OpenAPI，并补充权限、跨宗族、缺参和导出审计测试。

## 非目标

- 不重构追踪中心页面。
- 不建设统一对象追踪聚合接口。
- 不新增 `trace_id` 或数据库字段。
- 不调整现有正式数据审核流程。

## 方案、影响与回滚

### 方案

- Controller 仅接收认证头、校验必填参数并调用应用服务。
- 权限判断复用 `AuthorizationApplicationService`，新增“目标宗族严格有效成员”校验能力，避免跨宗族管理员绕过成员身份规则。
- 技术字段可见性由后端根据 `operation_log.export` 权限决定，不依赖前端隐藏。
- 导出审计在导出用例内部写入 `operation_log`，审计失败不影响 CSV 生成。

### 兼容影响

- 未传 `clanId` 的历史调用将返回参数校验错误。
- 未登录、非目标宗族有效成员、无权限调用将返回稳定鉴权错误。
- 普通查看者响应中的 `detail`、`requestId`、`clientIp` 将为 `null`。
- 具备导出权限的现有调用仍可获得完整 CSV，最多 10000 条。

### 回滚方式

- 代码回滚即可恢复旧接口行为；本 Issue 不涉及数据库迁移。
- 若调用方尚未完成 `clanId` 适配，可回滚 Controller/OpenAPI 的必填约束，但不得回滚后端权限校验。
- 若技术字段最小披露影响审计角色，可仅调整权限映射或字段可见策略，不需要数据回滚。

## 原子任务看板

| 状态 | 任务 | 验证 |
|---|---|---|
| ✅ | 建立任务分支与执行检查点 | 任务文件已提交 |
| 🔄 | 更新 OpenAPI：认证头、必填 `clanId`、权限错误和敏感字段语义 | JSON 可解析、契约结构检查 |
| ⏳ | 增加严格宗族成员校验与操作日志权限入口 | 单元测试覆盖未登录、跨宗族、无权限 |
| ⏳ | 实现日志技术字段最小披露 | 服务测试覆盖 view/export 两种权限 |
| ⏳ | 实现受控导出与导出审计 | 上限、CSV、审计记录测试 |
| ⏳ | 完成 Controller/应用服务测试与 Review | Maven/CI、diff 检查、安全复核 |

## 影响模块

- `docs/api/openapi.json`
- `auth`：严格成员校验
- `operationlog`：Controller、Application Service、DTO 输出策略
- 后端测试

## 验证方案

- 聚焦测试：操作日志 Controller、Application Service、Authorization Application Service。
- 全量验证：`cd backend/genealogy-backend && mvn test`。
- 契约验证：OpenAPI JSON 解析和仓库 API 检查。
- CI：以 Draft PR 的 GitHub Actions 结果为最终可执行证据。

## 已知风险

- 当前运行环境无法直接克隆仓库和执行 Maven；本地不可执行项将依赖仓库 CI，并在 PR 中显式记录。
- 权限种子若尚未包含 `operation_log.view/export`，需要前向补充权限数据；若涉及 Flyway，将单独说明迁移与回滚。
- 导出审计采用 best-effort，不因审计写入失败阻断用户导出，需通过测试确认无递归记录。

## 当前恢复检查点

- 当前阶段：启动门禁 / Draft PR 建立前。
- 最后完成任务：创建远程分支并提交执行看板。
- 当前进行中任务：创建 Draft PR 并回写 Issue。
- 最新 Commit：由本文件创建提交生成。
- CI 状态：尚未触发。
- 未解决 Review：无。
- 已知阻塞：本地无 `gh` 且无法联网克隆，改用 GitHub 连接器与 CI。
- 下一步最小任务：创建 Draft PR，回写 Issue，然后开始 OpenAPI 契约修改。
