# 11. 成员权限安全加固与接口契约

## 1. 目标与范围

本方案是成员权限 P0 安全加固的实施基线，覆盖：

1. 用户目录隐私保护。
2. `branch_subtree` 正确语义。
3. 越级授权、超范围授权、最后管理员保护。
4. 成员、成员身份、授权记录的 ID 契约拆分。
5. 数据库分页和成员聚合列表。
6. 前端列表优先交互。
7. 自动化测试和权限 Review。

旧 `/api/v1/member-management/**` 接口仅用于兼容，不再承载新增能力。新代码统一使用 `/api/v1/clans/{clanId}/...` 成员权限接口。

## 2. 核心业务对象

| 对象 | 标识 | 说明 |
|---|---|---|
| 平台用户 | `userId` | 平台账号，不代表已经加入宗族 |
| 宗族成员身份 | `membershipId` | 用户在某个宗族中的身份和启停状态 |
| 成员授权 | `grantId` | 某个成员身份的一条角色与范围授权 |

禁止继续使用含义不明确的 `memberId` 同时表达成员身份和授权记录。

## 3. 状态契约

### 3.1 成员身份状态

```text
active / disabled / removed
```

历史 `inactive` 仅作为兼容输入读取，写入统一使用 `disabled`。

### 3.2 授权状态

```text
active / revoked
```

撤销授权不等同于停用成员。成员可以存在多条有效授权。

## 4. 授权范围

一期正式写入范围仅支持：

```text
clan
branch_subtree
```

- `clan`：当前宗族全部数据范围。
- `branch_subtree`：指定支派自身及全部下级支派。
- 历史 `branch` 作为兼容输入时按 `branch_subtree` 解释，新接口不再写入 `branch`。

支派包含关系以 `branch.parent_id` 为事实来源，通过 PostgreSQL 递归 CTE 判断，不依赖可能因支派移动而过期的 `branch_path`。

## 5. 角色与范围矩阵

| 角色 | 允许范围 |
|---|---|
| `clan_admin` | `clan` |
| `reviewer` | `clan` |
| `branch_admin` | `branch_subtree` |
| `editor` | `clan`、`branch_subtree` |
| `viewer` | `clan`、`branch_subtree` |

不符合矩阵的请求由后端拒绝，前端选项只用于改善体验，不能替代后端校验。

## 6. 授权层级与范围不变量

### 6.1 可授予角色

| 操作者 | 可授予角色 |
|---|---|
| 跨宗族管理员 | P0 内置角色，但不能通过宗族页面授予跨宗族管理员 |
| `clan_admin` | `clan_admin`、`branch_admin`、`editor`、`reviewer`、`viewer` |
| `branch_admin` | `editor`、`viewer` |
| `editor`、`reviewer`、`viewer` | 不允许调整成员权限 |

### 6.2 范围规则

操作者的数据范围必须覆盖目标授权范围：

- 宗族管理员可以授予本宗族范围或任意支派子树范围。
- 支派管理员只能在自身授权支派子树内授权。
- 支派管理员不能授予全宗族范围、父支派、兄弟支派或其他宗族范围。

### 6.3 最后管理员保护

任何权限变更都不得使宗族失去全部有效管理员。

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

校验与写操作处于同一事务，并通过宗族成员记录悲观锁防止并发绕过。

### 6.4 原因与审计

新增、修改、撤销授权及成员停用/恢复必须填写原因。操作日志至少记录：

```text
actorId
clanId
membershipId / grantId
before
before
reason
action
changedAt
```

实现中实际记录为 `before / after / reason`；上表重复的 `before` 应理解为 `after`。

## 7. 用户目录隐私

旧全量用户目录接口已限制为：

- 必须指定 `clanId`。
- 必须具备 `member.invite` 权限。
- 标记为兼容接口。

正式候选成员接口：

```text
GET /api/v1/clans/{clanId}/member-candidates
```

规则：

1. 关键词至少两个字符。
2. 数据库分页，最大每页 50 条。
3. 只返回 `userId`、显示名、脱敏账号、是否已是成员。
4. 不返回手机、邮箱、最近登录时间、创建时间或完整用户档案。

## 8. 正式 API

```text
GET   /api/v1/clans/{clanId}/members
GET   /api/v1/clans/{clanId}/member-candidates
GET   /api/v1/clans/{clanId}/grantable-roles
POST  /api/v1/clans/{clanId}/member-grants
PUT   /api/v1/clans/{clanId}/member-grants/{grantId}
POST  /api/v1/clans/{clanId}/member-grants/{grantId}/revoke
PATCH /api/v1/clans/{clanId}/members/{membershipId}/status
```

完整机器可读契约位于：

```text
docs/api/openapi.member-permission.json
```

该文件由仓库现有 `api:generate` 脚本自动叠加到主 OpenAPI，不应手工复制到前端页面。

## 9. 数据库分页

成员列表以 `clan_membership` 为分页主表：

1. 数据库分页查询成员身份。
2. 角色和范围筛选使用 `EXISTS` 子查询。
3. 批量加载当前页用户、授权、角色和支派。
4. 应用层聚合为“一名成员一条记录，多条授权嵌套展示”。

禁止先加载全宗族成员和授权后在 Java 内过滤、分页。

建议确认以下索引存在：

```text
clan_membership(clan_id, member_status, id)
clan_membership(clan_id, user_id)
member_role(membership_id, status)
member_role(role_id, status)
member_role(scope_type, scope_id, status)
branch(clan_id, parent_id)
```

## 10. 前端交互

成员权限页面采用列表优先结构：

1. 首屏展示成员聚合列表。
2. 候选成员在新增授权 Modal 中远程搜索。
3. 可授予角色和范围由后端返回。
4. 多条授权在成员 Drawer 中管理。
5. 撤销授权和停用成员必须填写原因。
6. 不提供“一键设为管理员”等绕过完整表单的快捷操作。
7. 页面展示业务名称，不展示技术 ID。

## 11. 验收用例

### 11.1 支派范围

| 用例 | 结果 |
|---|---|
| 授权支派自身 | 允许 |
| 直接下级支派 | 允许 |
| 多级下级支派 | 允许 |
| 父支派 | 拒绝 |
| 兄弟支派 | 拒绝 |
| 其他宗族支派 | 拒绝 |

### 11.2 授权安全

| 用例 | 结果 |
|---|---|
| 支派管理员授予宗族管理员 | 拒绝 |
| 支派管理员授予自身子树查看者 | 允许 |
| 支派管理员授予兄弟支派查看者 | 拒绝 |
| 唯一管理员撤销授权 | 拒绝 |
| 唯一管理员降权 | 拒绝 |
| 唯一管理员成员身份停用 | 拒绝 |
| 存在另一管理员后自我降权 | 允许 |
| 权限变更未填写原因 | 拒绝 |

### 11.3 隐私与分页

| 用例 | 结果 |
|---|---|
| 普通登录用户读取旧用户目录 | 拒绝 |
| 候选搜索无邀请权限 | 拒绝 |
| 候选响应包含完整手机或邮箱 | 不允许 |
| 一名成员拥有多条授权 | 列表只占一条成员记录 |
| 角色筛选后分页 | 总数按成员身份计算 |
| 查询停用成员 | 可按状态正确查询 |

## 12. 验证命令

```bash
cd backend/genealogy-backend
mvn test

cd ../../frontend/genealogy-web
npm run api:generate
npm run api:check
npm run typecheck
npm run build
```

合入前必须完成 Correctness、Architecture、Security、Performance 和 Documentation consistency 五轴 Review。
