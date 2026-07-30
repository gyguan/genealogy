# 11. 成员权限安全加固与接口契约

## 1. 文档定位

本文档是成员权限模块的运行时实施基线，覆盖 P0 安全闭环和 P1 体验、契约、审计增强。概念性权限规划见 `docs/09-permission-management.md`；两份文档发生冲突时，以本文档、OpenAPI 和后端代码为准。

正式成员管理统一使用：

```text
/api/v1/clans/{clanId}/...
```

旧 `/api/v1/member-management/**` 仅保留角色、权限元数据及兼容汇总，不再提供用户目录和成员写入口。

## 2. 核心对象与 ID 契约

| 对象 | 标识 | 说明 |
|---|---|---|
| 平台用户 | `userId` | 平台账号，不代表已经加入宗族 |
| 宗族成员身份 | `membershipId` | 用户在某个宗族中的成员身份和启停状态 |
| 成员授权 | `grantId` | 某个成员身份的一条角色、范围授权记录 |
| 权限审计记录 | `auditId` | 一次成员状态或授权变更日志 |

禁止使用含义不明确的 `memberId` 同时表达成员身份和授权记录。前端不直接展示上述技术 ID。

## 3. 状态契约

### 3.1 成员身份状态

```text
active / disabled / removed
```

- `active`：有效成员，可按授权访问数据。
- `disabled`：成员被停用，历史记录保留。
- `removed`：成员已移除，历史记录保留。
- 历史 `inactive` 仅作为兼容输入读取，写入统一使用 `disabled`。

### 3.2 授权状态

```text
active / revoked
```

撤销授权不等同于停用成员。成员可以存在多条有效授权。

## 4. 角色和授权范围

当前运行时内置角色：

```text
clan_admin / branch_admin / editor / reviewer / viewer
```

当前正式写入范围：

```text
clan / branch_subtree
```

- `clan`：当前宗族全部数据。
- `branch_subtree`：指定支派自身及全部下级支派。
- 历史 `branch` 只表示“当前支派”，仅用于兼容读取，不再由新接口写入。
- 对象级授权、自定义角色和权限有效期属于后续 P2 范围。

角色与范围矩阵：

| 角色 | 允许范围 |
|---|---|
| `clan_admin` | `clan` |
| `reviewer` | `clan` |
| `branch_admin` | `branch_subtree` |
| `editor` | `clan`、`branch_subtree` |
| `viewer` | `clan`、`branch_subtree` |

支派包含关系以 `branch.parent_id` 为事实来源，通过 PostgreSQL 递归 CTE 判断。

## 5. 授权层级与安全不变量

### 5.1 可授予角色

| 操作者 | 可授予角色 |
|---|---|
| 跨宗族管理员 | 可管理宗族，但不能通过宗族页面授予跨宗族管理员 |
| `clan_admin` | `clan_admin`、`branch_admin`、`editor`、`reviewer`、`viewer` |
| `branch_admin` | `editor`、`viewer` |
| `editor`、`reviewer`、`viewer` | 不允许调整成员权限 |

### 5.2 范围规则

- 宗族管理员可以管理本宗族全部成员和授权。
- 支派管理员只能查看和管理自身授权支派及下级支派内的成员授权。
- 支派管理员不能管理全宗族、父支派、兄弟支派或其他宗族范围。
- 成员列表在数据库分页和总数计算前应用操作者范围。
- 聚合响应只返回操作者可见的授权明细；最后管理员、成员停用和越级校验始终使用全部有效授权，不能使用裁剪后的响应数据。

### 5.3 最后管理员保护

有效管理员定义：

```text
membershipStatus = active
AND grantStatus = active
AND roleCode = clan_admin
AND scopeType = clan
```

以下操作在只剩一名管理员时必须拒绝：

1. 撤销该管理员授权。
2. 将该授权改为其他角色或范围。
3. 停用或移除该管理员成员身份。

校验与写操作处于同一事务，并通过固定顺序的悲观锁防止并发绕过。

### 5.4 原因与审计

新增、修改、撤销授权及成员停用、恢复、移除必须填写原因。审计记录包含：

```text
actorId
clanId
membershipId / grantId
before
after
reason
actionType
changedAt
```

权限审计查询只向具备 `operation_log.view` 权限且目标范围可见的操作者开放。返回用户名称和脱敏账号，不返回手机、邮箱或完整账号。

## 6. 用户目录隐私

旧全量用户目录和遗留成员写入口已下线。正式候选成员接口：

```text
GET /api/v1/clans/{clanId}/member-candidates
```

规则：

1. 必须具备 `member.invite` 权限。
2. 关键词至少两个字符。
3. 数据库分页，最大每页 50 条。
4. 只返回 `userId`、显示名、脱敏账号、是否已是成员。
5. 不返回手机、邮箱、最近登录时间、创建时间或完整用户档案。

## 7. 正式 API

```text
GET   /api/v1/clans/{clanId}/members
GET   /api/v1/clans/{clanId}/member-candidates
GET   /api/v1/clans/{clanId}/grantable-roles
GET   /api/v1/clans/{clanId}/member-permission-audits
POST  /api/v1/clans/{clanId}/member-grants
PUT   /api/v1/clans/{clanId}/member-grants/{grantId}
POST  /api/v1/clans/{clanId}/member-grants/{grantId}/revoke
PATCH /api/v1/clans/{clanId}/members/{membershipId}/status
```

机器可读契约：

```text
docs/api/openapi.member-permission.json
```

该文件由 `api:generate` 叠加到主 OpenAPI 并生成前端契约，不手工修改生成文件。

### 7.1 标准错误响应

成员权限接口统一声明并返回：

| HTTP | 场景 |
|---|---|
| `400` | 参数、状态、范围或审计筛选不合法 |
| `401` | 未登录或登录状态失效 |
| `403` | 角色权限不足或目标超出管理范围 |
| `404` | 成员、授权、角色、用户或支派不存在 |
| `409` | 重复授权、最后管理员或成员归属冲突 |

前端依据稳定业务错误码展示提示，不解析后端异常文本，不展示堆栈。

## 8. 查询与性能

成员列表以 `clan_membership` 为分页主表：

1. 在数据库分页前应用操作者范围、关键词、角色、范围和状态筛选。
2. 角色和范围筛选使用 `EXISTS` 子查询。
3. 当前页批量加载用户、授权、角色和支派。
4. 应用层聚合为“一名成员一条记录，多条可见授权嵌套展示”。

权限审计查询以 `operation_log` 为分页主表，通过结构化字段过滤宗族、操作者、动作、目标和时间，不在 Java 中全量加载后过滤。

已通过 Flyway 交付以下索引：

```text
clan_membership(clan_id, member_status, id)
clan_membership(clan_id, user_id)
member_role(membership_id, status)
member_role(role_id, status)
member_role(scope_type, scope_id, status)
branch(clan_id, parent_id)
```

## 9. 前端交互

成员权限页面采用列表优先结构：

1. 草稿筛选条件与已生效查询状态分离。
2. 重置、切换宗族、翻页和写后刷新显式传递完整查询条件。
3. 候选成员在新增授权 Modal 中远程搜索。
4. 可授予角色和范围由后端返回。
5. 表单展示角色能力摘要和授权范围预览。
6. 高风险角色授权必须二次确认。
7. 多条可见授权在成员 Drawer 中管理。
8. 具备权限时在 Drawer 中查看权限变更历史。
9. 撤销授权和成员状态变更必须填写原因。
10. 页面展示业务名称和脱敏账号，不展示技术 ID、内部枚举或原始异常。

## 10. 验收用例

### 10.1 支派范围和数据最小化

| 用例 | 结果 |
|---|---|
| 支派管理员查看自身支派授权 | 允许 |
| 支派管理员查看下级支派授权 | 允许 |
| 支派管理员查看父支派或兄弟支派授权 | 不返回 |
| 成员同时具有可见和不可见授权 | 只返回可见授权，安全校验使用全部授权 |
| 宗族管理员查看本宗族授权 | 返回全部授权 |

### 10.2 授权安全

| 用例 | 结果 |
|---|---|
| 支派管理员授予宗族管理员 | 拒绝 |
| 支派管理员授予自身子树查看者 | 允许 |
| 支派管理员授予兄弟支派查看者 | 拒绝 |
| 唯一管理员撤销、降权或停用 | `409 LAST_CLAN_ADMIN_REQUIRED` |
| 权限变更未填写原因 | `400 MEMBER_PERMISSION_REASON_REQUIRED` |
| 重复授权 | `409 MEMBER_GRANT_DUPLICATED` |

### 10.3 审计和交互

| 用例 | 结果 |
|---|---|
| 无 `operation_log.view` 权限查询审计 | `403` |
| 支派范围用户执行无目标的全宗族审计查询 | `403` |
| 管理员按成员、授权、操作者、动作、时间查询 | 数据库分页返回 |
| 重置筛选后立即查询 | 不携带旧条件 |
| 切换宗族后加载列表 | 使用新宗族和空筛选条件 |
| 高风险授权提交 | 展示角色能力、范围预览和二次确认 |

## 11. 验证命令

```bash
cd backend/genealogy-backend
mvn test

cd ../../frontend/genealogy-web
npm run test:members
npm run api:generate
npm run api:check
npm run typecheck
npm run build
```

合入前必须完成 Correctness、Architecture、Security、Performance 和 Documentation consistency 五轴 Review。
