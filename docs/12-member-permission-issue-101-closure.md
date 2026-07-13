# 12. 成员权限 Issue #101 上线闭环

## 1. 目标

Issue #101 在现有成员权限 P0 基础上完成以下上线前收口：

1. 下线旧全量用户目录和遗留成员写入口。
2. 成员列表在数据库分页前应用操作者范围。
3. 授权修改、撤销及成员状态变更同时校验角色和目标范围。
4. 前端操作入口按目标成员和目标授权计算。
5. 以最小权限原则治理历史 `branch` 数据。
6. 增加分页、授权筛选和支派递归所需索引与 PostgreSQL 验证。

## 2. 正式接口

成员权限统一使用：

```text
GET   /api/v1/clans/{clanId}/members
GET   /api/v1/clans/{clanId}/member-candidates
GET   /api/v1/clans/{clanId}/grantable-roles
POST  /api/v1/clans/{clanId}/member-grants
PUT   /api/v1/clans/{clanId}/member-grants/{grantId}
POST  /api/v1/clans/{clanId}/member-grants/{grantId}/revoke
PATCH /api/v1/clans/{clanId}/members/{membershipId}/status
```

`/api/v1/member-management/**` 不再提供用户目录和成员写操作，仅保留角色、权限元数据及只读汇总。

## 3. 操作者范围

| 操作者 | 列表和管理范围 |
|---|---|
| 跨宗族管理员 | 当前目标宗族全部成员与授权 |
| 宗族管理员 | 当前宗族全部成员与授权 |
| `branch_admin + branch` | 精确支派 |
| `branch_admin + branch_subtree` | 支派自身及全部下级支派 |

成员列表在分页和总数统计前应用范围条件。成员进入列表后，其每条授权都会单独计算 `canEditGrant` 和 `canRevokeGrant`；前端只展示后端允许的操作按钮，后端仍执行最终校验。

成员停用、恢复和移除使用目标成员的全部有效授权校验管理范围，因此不能通过某一条可见授权绕过其他范围授权的保护。

## 4. 写操作规则

新增、修改、撤销授权以及成员状态变更必须填写原因，并记录操作日志。

成员状态变更统一校验：

```text
actorId + clanId + targetMembershipId + targetStatus + reason
```

安全规则：

1. 操作者必须具备对应 `member.*` 权限。
2. 操作者范围必须覆盖目标授权或目标成员。
3. 支派管理员不得操作父支派、兄弟支派及其他宗族成员。
4. 通过新增授权重新激活历史成员时执行相同范围校验。
5. 宗族始终至少保留一名有效 `clan_admin`。
6. 最后管理员校验使用悲观写锁和固定 ID 加锁顺序。

## 5. 历史范围迁移

迁移文件：

```text
backend/genealogy-backend/src/main/resources/db/migration/
V2026071301__member_permission_scope_and_indexes.sql
```

为避免自动扩权，只迁移语义明确的：

```text
roleCode = branch_admin
AND scopeType = branch
```

到：

```text
scopeType = branch_subtree
```

历史 editor/viewer 的 `branch` 保持“仅当前支派”，由宗族管理员按实际职责重新授权。

迁移记录写入：

```text
member_role_scope_migration_2026071301
```

回滚脚本：

```text
database/rollback/issue-101-member-permission.sql
```

回滚只恢复迁移审计表记录的授权，不修改合法或新建的 `branch_subtree` 授权。

## 6. 数据库索引

本次交付以下索引：

```text
idx_clan_membership_clan_status_id
idx_clan_membership_clan_user
idx_member_role_membership_status
idx_member_role_role_status
idx_member_role_scope_status
idx_branch_clan_parent
```

覆盖成员分页、成员唯一查询、授权聚合、角色/范围筛选和支派递归。

## 7. 自动化验证

专项验证覆盖：

- Java 17 后端编译。
- 支派管理员越级授权拒绝、子树内授权允许。
- 跨范围成员停用拒绝、本范围停用允许。
- 最后管理员撤销保护。
- 旧用户目录和遗留成员写接口不可重新暴露。
- 数据库分页前应用操作者范围。
- PostgreSQL 16 Repository 集成测试。
- 范围迁移、迁移审计、递归 CTE 和索引验证。
- OpenAPI 生成一致性。
- 成员页面定向 TypeScript 与前端生产构建。

仓库默认全量 CI 仍存在与本次改动无关的历史基线问题，本次使用专项验证链区分新增代码与基线问题。

## 8. Review 结论

| 维度 | 结论 |
|---|---|
| Correctness | 列表、分页、授权和成员状态使用统一范围模型 |
| Architecture | 正式写入口统一进入应用服务与领域策略服务 |
| Security | 旧敏感目录下线，范围过滤前置，目标操作后端强校验 |
| Performance | 数据库分页、批量聚合和必要索引已落地 |
| Documentation consistency | OpenAPI、前端契约、迁移和回滚说明已同步 |

## 9. 部署检查

1. 部署前备份数据库，并确认迁移版本未被占用。
2. 在低峰期执行迁移，核对迁移审计表记录数量。
3. 使用宗族管理员、支派管理员和普通成员账号完成回归。
4. 验证支派管理员无法查看或操作仅属于兄弟支派的成员。
5. 回滚时暂停成员权限写操作，只使用随版本交付的定向回滚脚本。
