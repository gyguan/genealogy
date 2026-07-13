# 12. 成员权限 Issue #101 上线闭环

## 1. 实施目标

Issue #101 在既有成员权限 P0 基础上完成上线前安全收口，重点解决：

1. 旧全量用户目录和旧成员写入口绕过正式权限策略。
2. 支派管理员可通过通用权限查看或操作其他支派成员。
3. 成员级操作按钮没有按目标成员和目标授权计算。
4. 历史 `branch` 与 `branch_subtree` 语义不统一。
5. 成员分页、授权筛选和支派递归查询缺少明确索引及 PostgreSQL 集成验证。

正式成员权限入口统一为：

```text
GET   /api/v1/clans/{clanId}/members
GET   /api/v1/clans/{clanId}/member-candidates
GET   /api/v1/clans/{clanId}/grantable-roles
POST  /api/v1/clans/{clanId}/member-grants
PUT   /api/v1/clans/{clanId}/member-grants/{grantId}
POST  /api/v1/clans/{clanId}/member-grants/{grantId}/revoke
PATCH /api/v1/clans/{clanId}/members/{membershipId}/status
```

## 2. 遗留接口收口

`/api/v1/member-management/**` 不再提供用户目录及成员新增、修改、撤销能力，只保留：

- 角色元数据查询。
- 权限元数据查询。
- 角色权限查询。
- 成员权限只读汇总。

以下旧入口已经下线：

```text
GET /api/v1/member-management/users
GET /api/v1/member-management/clans/{clanId}/members
POST/PUT/DELETE 旧成员管理接口
```

候选成员必须通过正式分页搜索接口获取，只返回 `userId`、显示名、脱敏账号和是否已加入当前宗族。

## 3. 操作者范围模型

成员管理不再只判断 `member.*` 权限码，还需要解析操作者的数据范围。

| 操作者范围 | 列表范围 | 可管理范围 |
|---|---|---|
| 跨宗族管理员 | 当前目标宗族全部成员 | 当前目标宗族全部授权 |
| 宗族管理员 | 当前宗族全部成员 | 当前宗族全部授权 |
| 支派管理员：`branch` | 精确支派 | 精确支派内的 editor/viewer 授权 |
| 支派管理员：`branch_subtree` | 支派自身及下级支派 | 覆盖子树内的 editor/viewer 授权 |

支派子树通过 `branch.parent_id` 递归计算。成员列表在数据库分页和总数统计前应用操作者范围，禁止应用层加载全量成员后过滤。

当一名成员同时拥有多个范围的授权时：

- 该成员只要存在一条操作者可见授权即可进入列表。
- 响应只返回操作者范围覆盖的授权明细。
- 成员停用校验仍使用该成员全部有效授权，防止通过隐藏授权绕过范围保护。

## 4. 写操作安全规则

新增、修改、撤销授权以及成员状态变更都必须填写原因并记录操作日志。

成员状态变更统一校验：

```text
actorId
clanId
target membershipId
target status
reason
```

规则：

1. 操作者必须具备对应权限码。
2. 操作者范围必须覆盖目标成员全部有效授权。
3. 支派管理员不得停用、恢复或移除父支派、兄弟支派及其他宗族成员。
4. 通过新增授权重新激活历史成员时执行相同范围校验。
5. 唯一有效 `clan_admin` 不允许被撤销、降权、停用或移除。

最后管理员保护通过宗族成员悲观写锁和固定 ID 加锁顺序执行，降低并发绕过与死锁风险。

## 5. 目标级操作能力

`MemberGrantResponse` 增加：

```text
canEditGrant
canRevokeGrant
```

`MemberAggregateResponse.allowedActions` 根据目标成员计算：

```text
canGrantRole
canEditGrant
canRevokeGrant
canDisableMember
canViewHistory
```

前端只展示后端返回为 `true` 的按钮，但后端仍是最终安全边界。

## 6. 历史范围迁移

迁移文件：

```text
V2026071301__member_permission_scope_and_indexes.sql
```

为避免自动扩大权限，不对全部 `scope_type=branch` 记录进行批量转换。

自动迁移范围限定为：

```text
roleCode = branch_admin
AND scopeType = branch
```

这类角色的正式契约要求 `branch_subtree`，语义明确。历史 editor/viewer 的 `branch` 保持“仅当前支派”，由宗族管理员按实际职责重新授权。

迁移前后值记录在：

```text
member_role_scope_migration_2026071301
```

手工回滚脚本：

```text
database/rollback/issue-101-member-permission.sql
```

回滚只恢复迁移审计表记录的授权，不修改合法或迁移后新建的 `branch_subtree` 授权。

## 7. 数据库索引

新增或确认以下索引：

```text
clan_membership(clan_id, member_status, id)
clan_membership(clan_id, user_id)
member_role(membership_id, status)
member_role(role_id, status)
member_role(scope_type, scope_id, status)
branch(clan_id, parent_id)
```

对应索引名称：

```text
idx_clan_membership_clan_status_id
idx_clan_membership_clan_user
idx_member_role_membership_status
idx_member_role_role_status
idx_member_role_scope_status
idx_branch_clan_parent
```

## 8. 测试与验证

专项验证覆盖：

- Java 17 后端编译。
- 支派管理员越级授权拒绝。
- 支派管理员子树内授权允许。
- 支派管理员跨范围停用拒绝。
- 支派管理员本范围停用允许。
- 最后管理员撤销保护。
- 遗留用户目录及成员写接口不可重新暴露。
- 成员分页查询必须在数据库层应用操作者范围。
- 悲观锁和固定加锁顺序契约。
- PostgreSQL 16 Repository 集成测试。
- 历史范围最小权限迁移、审计表、递归 CTE 和索引验证。
- OpenAPI 生成一致性、成员页面定向 TypeScript 和前端生产构建。

仓库默认全量 CI 仍存在与本次改动无关的历史基线问题；Issue #101 使用专项验证链明确区分新增代码问题与基线问题。

## 9. 五轴 Review 结论

| 维度 | 结论 |
|---|---|
| Correctness | 列表、分页、授权与成员状态使用同一范围模型；空关键词 PostgreSQL 类型问题已覆盖 |
| Architecture | 正式写入口统一进入 `MemberPermissionApplicationService` 和 `MemberGrantPolicyService` |
| Security | 旧敏感目录下线；范围过滤前置；按目标授权返回操作能力；迁移遵循最小权限 |
| Performance | 数据库分页、当前页批量聚合、递归支派索引及授权筛选索引已落地 |
| Documentation consistency | OpenAPI、前端生成契约、迁移说明、回滚说明和本实施记录保持一致 |

## 10. 部署注意事项

1. 部署前备份数据库，并确认当前环境不存在同版本 Flyway 迁移。
2. 在低峰期执行迁移，检查迁移审计表记录数量是否符合历史 `branch_admin` 数据规模。
3. 部署后验证宗族管理员、支派管理员和普通成员三类账号。
4. 重点验证支派管理员看不到兄弟支派成员及授权明细。
5. 回滚时暂停成员权限写操作，并只使用随版本交付的定向回滚脚本。
