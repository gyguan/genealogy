# 13. Issue #102 成员权限 P1 收口记录

## 1. 实施结论

Issue #102 已完成成员权限管理的体验、契约与治理能力增强，建立了以下闭环：

1. 前端查询状态显式化，重置、切换宗族、翻页和写后刷新不再读取旧闭包状态。
2. 成员权限接口补齐标准 HTTP 错误响应和稳定业务错误码。
3. 新增成员权限变更审计分页查询，并在成员 Drawer 中展示。
4. 支派范围用户只接收自身可见授权明细，后端安全不变量仍使用全部有效授权。
5. 授权表单展示角色能力、范围预览，高风险角色增加二次确认。
6. `docs/09`、`docs/11`、OpenAPI、前端类型和运行时代码完成统一。

## 2. 正式接口

新增：

```text
GET /api/v1/clans/{clanId}/member-permission-audits
```

支持筛选：

```text
membershipId
grantId
actorId
actionType
startTime
endTime
pageNo
pageSize
```

接口要求 `operation_log.view`，并继续校验目标成员和授权是否位于操作者可见范围内。支派范围用户不得执行无目标的全宗族审计查询。

## 3. 标准错误契约

成员权限接口统一声明并返回：

| HTTP | 场景 |
|---|---|
| `400` | 参数、状态、范围、时间或动作类型不合法 |
| `401` | 未登录或登录状态失效 |
| `403` | 角色权限不足或目标超出管理范围 |
| `404` | 成员、授权、角色、用户或支派不存在 |
| `409` | 重复授权、最后管理员或成员归属冲突 |

前端统一通过 `ApiRequestError.code/status` 识别错误，不再从异常文本推断业务场景；PATCH 请求也统一进入公共 API Client。

## 4. 数据最小化与安全边界

成员聚合响应使用两套数据视图：

- `membershipGrants`：全部有效授权，仅供最后管理员、停用成员、越级与范围安全判断。
- `visibleMembershipGrants`：操作者可见授权，仅用于 API 响应和前端展示。

因此，隐藏不可见授权不会削弱以下安全不变量：

1. 最后管理员保护。
2. 成员停用、移除和恢复的目标范围校验。
3. 授权编辑和撤销的角色与范围校验。
4. 宗族成员列表的数据库分页前范围过滤。

## 5. 前端交互收口

成员权限页面完成：

1. 草稿筛选条件与已生效查询条件分离。
2. 查询、重置、切族、翻页和写后刷新显式传递 `MemberQuery`。
3. 成员 Drawer 展示当前可见授权和权限变更历史。
4. 审计记录显示操作者名称、脱敏账号、动作、前后值、原因和时间。
5. 角色能力摘要和授权范围预览。
6. 高风险角色授权二次确认。
7. 稳定业务错误码对应可理解中文提示。
8. 页面不展示 `userId`、`membershipId`、`grantId`、`scopeId` 等技术标识。

## 6. 验证结果

### 6.1 后端专项验证

```text
Java 17 编译：通过
聚焦测试：16 个通过，0 失败，0 错误
```

覆盖：

- `GlobalExceptionHandlerTest`
- `MemberGrantVisibilityPolicyTest`
- `MemberPermissionAuditControllerTest`
- `MemberPermissionAuditApplicationServiceTest`
- `MemberGrantPolicyServiceTest`
- `MemberPermissionApplicationServiceTest`
- `ClanMembershipRepositoryQueryContractTest`

### 6.2 前端与契约验证

```text
npm run test:members：4 个通过
npm run api:check：通过
npm run typecheck：通过
npm run build：通过
API Contract 工作流：通过
Issue Delivery Governance：通过
Commercial Frontend Build：通过
```

生产构建完成 1530 个模块转换。当前仅存在 Vite 大包体积告警，不影响构建成功，代码分包属于后续性能治理范围。

### 6.3 仓库既有基线问题

默认 Backend CI 仍存在两类与 Issue #102 无关的问题：

1. 全量后端测试中，4 个 Source/Attachment 测试使用旧权限码 Mockito 桩：
   - 测试桩使用 `attachment:view` 或 `attachment:download`；
   - 现有业务代码调用 `attachment:preview`；
   - 触发 `PotentialStubbingProblem`。
2. PostgreSQL 启动检查在 Flyway 初始化阶段失败：仓库存在两个版本号为 `V3` 的迁移文件，报错 `Found more than one migration with version 3`。

上述失败在成员权限专项测试之外，且启动失败发生在 Spring Bean 初始化之前；新增审计 Controller/ApplicationService 未进入初始化阶段。

## 7. 五轴 Review

| 维度 | 结论 |
|---|---|
| Correctness | 查询状态、审计筛选、分页、错误状态和前后值展示使用明确契约 |
| Architecture | 复用统一 API Client、`operation_log`、JPA Specification 和成员权限策略服务 |
| Security | 审计和授权明细均在后端执行权限与范围校验，响应裁剪不参与安全不变量判断 |
| Performance | 成员与审计均数据库分页，关联用户、成员和授权批量加载，无 Java 全量分页 |
| Documentation consistency | 角色、状态、范围、权限码、API 和 P2 边界已在 docs/09、docs/11 和 OpenAPI 中统一 |

## 8. 回滚说明

- 审计接口为新增只读能力，可回滚 Controller、ApplicationService、DTO 和 OpenAPI，不影响现有成员授权数据。
- 前端查询状态和审计 Drawer 可独立回滚，不影响后端权限校验。
- 授权明细裁剪可恢复为返回全部授权；后端安全判断始终使用全部有效授权。
- 本次未新增数据库表、字段或 Flyway 迁移，无数据库回滚动作。

## 9. 后续范围

以下能力不属于 Issue #102，继续进入 P2：

- 对象级临时授权。
- 权限有效期和自动失效。
- 自定义角色。
- 高风险操作双人复核。
- 权限审计报表与导出。
