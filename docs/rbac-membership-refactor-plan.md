# 用户、谱内人物、宗族成员与权限模型重构设计方案

## 1. 背景

当前系统围绕用户、族谱人物、宗族成员和权限存在以下几类概念：

- `app_user`：系统登录账号。
- `person`：族谱中的谱内人物。
- `clan_member`：当前同时承担“宗族成员身份”和“成员角色授权”两类职责。
- `app_role`：角色定义。
- `app_permission`：目标权限点定义表。
- `app_role_permission`：目标角色权限关系表。

当前 `clan_member` 同时包含 `user_id`、`person_id`、`branch_id`、`role_id`、`scope_type`、`scope_id`、`member_name` 等字段，导致“系统用户、谱内人物、修谱成员、角色授权、数据范围”几个概念混在一张表里。

这会导致：

1. 成员列表可能因为一个用户多个角色而重复。
2. `branch_id` 与 `scope_type='branch' + scope_id` 语义重复。
3. `member_name` 与 `app_user.display_name`、`person.name` 重复。
4. `clan_member` 既像成员表，又像授权表，后续权限判断和页面表达容易混乱。
5. 引入 `app_permission`、`app_role_permission` 后，如果不拆分成员身份与角色授权，权限链路会更加绕。

因此需要将权限体系重构为清晰的 RBAC + 数据范围授权模型。

---

## 2. 设计目标

### 2.1 核心目标

建立清晰的账号、人物、成员、角色、权限模型：

```text
app_user            = 谁能登录系统
person              = 族谱里记载了谁
clan_membership     = 某账号是否加入某宗族
app_role            = 系统有哪些角色
app_permission      = 系统有哪些权限点
app_role_permission = 某角色拥有哪些权限点
member_role         = 某宗族成员在某范围内拥有什么角色
```

### 2.2 设计原则

1. **系统账号与谱内人物分离**：不是每个谱内人物都能登录系统，也不是每个登录用户都必须入谱。
2. **成员身份与角色授权分离**：一个账号加入宗族是一件事，拥有哪个角色是另一件事。
3. **角色定义与权限点定义分离**：角色只表达职责集合，权限点表达可执行动作。
4. **角色授权支持范围**：同一个角色可以作用于整个宗族，也可以只作用于某个支派。
5. **避免重复字段**：尽量不在多张表重复保存姓名、支派、角色、范围等信息。
6. **平滑迁移**：优先新增表和兼容视图，避免一次性大面积破坏现有功能。

---

## 3. 目标数据模型

## 3.1 `app_user`：系统账号表

职责：保存登录账号、认证信息和账号状态。

```sql
create table app_user (
    id bigserial primary key,
    username varchar(100) not null unique,
    phone varchar(50),
    email varchar(100),
    password_hash varchar(255) not null,
    display_name varchar(100) not null,
    avatar_url varchar(500),
    status varchar(32) not null default 'active',
    last_login_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp
);
```

说明：

- 不存族谱业务字段。
- `display_name` 是系统展示名，不等价于谱内人物姓名。

---

## 3.2 `person`：谱内人物表

职责：保存族谱中的人物档案和世系业务信息。

```sql
create table person (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),

    person_code varchar(64),
    name varchar(100) not null,
    genealogy_name varchar(100),
    courtesy_name varchar(100),
    alias_name varchar(200),

    gender varchar(20) not null default 'unknown',
    generation_no int,
    generation_word varchar(20),
    rank_in_family varchar(50),

    birth_date date,
    birth_date_precision varchar(20),
    death_date date,
    death_date_precision varchar(20),
    is_living boolean,

    birth_place varchar(255),
    residence_place varchar(255),
    occupation varchar(100),
    education varchar(100),
    title_or_honor varchar(200),
    biography text,
    tomb_place varchar(255),
    epitaph text,

    has_descendant boolean,
    lineage_status varchar(50) not null default 'normal',
    privacy_level varchar(32) not null default 'clan_only',
    data_status varchar(32) not null default 'draft',

    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp not null default now(),
    deleted_at timestamp,

    unique (clan_id, person_code)
);
```

说明：

- `person` 是族谱系统核心业务表，不应被 `app_user` 替代。
- 已故祖先、历史人物、配偶、子女等多数不会有登录账号，但必须存在于 `person`。

---

## 3.3 `clan_membership`：宗族成员身份表

职责：表达某个系统账号是否加入某个宗族，以及该账号是否绑定到谱内人物。

```sql
create table clan_membership (
    id bigserial primary key,

    clan_id bigint not null references clan(id),
    user_id bigint not null references app_user(id),

    -- 可选：该系统账号对应族谱中的哪个人物
    person_id bigint references person(id),

    join_status varchar(32) not null default 'invited',
    member_status varchar(32) not null default 'active',

    invited_by bigint references app_user(id),
    joined_at timestamp,

    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),

    unique (clan_id, user_id)
);
```

字段说明：

| 字段 | 说明 |
|---|---|
| `clan_id` | 加入的宗族 |
| `user_id` | 登录账号 |
| `person_id` | 可选，绑定该账号对应的谱内人物 |
| `join_status` | 邀请/加入状态，如 `invited`、`joined`、`rejected` |
| `member_status` | 成员状态，如 `active`、`disabled`、`removed` |

不再保留：

- `role_id`
- `branch_id`
- `scope_type`
- `scope_id`
- `member_name`

原因：

- 角色授权迁移到 `member_role`。
- 支派范围通过 `member_role.scope_type='branch' + scope_id` 表达。
- 成员显示名从 `app_user.display_name` 或 `person.name` 派生。

---

## 3.4 `app_role`：角色定义表

职责：定义系统角色。

```sql
create table app_role (
    id bigserial primary key,
    role_code varchar(64) not null unique,
    role_name varchar(100) not null,
    description text,
    system_role boolean not null default true,
    status varchar(32) not null default 'active',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);
```

建议内置角色：

| role_code | role_name | 说明 |
|---|---|---|
| `clan_admin` | 宗族管理员 | 管理整个宗族空间 |
| `branch_admin` | 支派管理员 | 管理授权支派范围内的数据 |
| `editor` | 修谱编辑 | 维护人物、关系、来源等资料 |
| `reviewer` | 审核员 | 审核人物、关系、来源等变更 |
| `viewer` | 查看者 | 只读查看族谱信息 |

---

## 3.5 `app_permission`：权限点定义表

职责：定义系统可管控的业务动作。

```sql
create table app_permission (
    id bigserial primary key,

    permission_code varchar(128) not null unique,
    permission_name varchar(100) not null,

    module_code varchar(64) not null,
    module_name varchar(100) not null,

    resource_code varchar(64) not null,
    action_code varchar(64) not null,

    description text,
    system_permission boolean not null default true,
    status varchar(32) not null default 'active',

    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),

    unique (resource_code, action_code)
);
```

权限编码建议：

```text
资源.动作
```

例如：

| permission_code | permission_name | module_code | resource_code | action_code |
|---|---|---|---|---|
| `clan.view` | 查看宗族 | clan | clan | view |
| `clan.update` | 编辑宗族 | clan | clan | update |
| `branch.create` | 创建支派 | branch | branch | create |
| `branch.update` | 编辑支派 | branch | branch | update |
| `person.view` | 查看人物 | person | person | view |
| `person.create` | 创建人物 | person | person | create |
| `person.update` | 编辑人物 | person | person | update |
| `person.delete` | 删除人物 | person | person | delete |
| `relationship.create` | 创建关系 | relationship | relationship | create |
| `relationship.update` | 编辑关系 | relationship | relationship | update |
| `relationship.delete` | 删除关系 | relationship | relationship | delete |
| `source.create` | 创建来源 | source | source | create |
| `source.verify` | 验证来源 | source | source | verify |
| `review.submit` | 提交审核 | review | review | submit |
| `review.approve` | 审核通过 | review | review | approve |
| `review.reject` | 审核驳回 | review | review | reject |
| `tree.view` | 查看世系 | tree | tree | view |
| `export.person` | 导出人物 | export | person | export |
| `export.genealogy_book` | 导出族谱 | export | genealogy_book | export |

---

## 3.6 `app_role_permission`：角色权限关系表

职责：定义角色拥有哪些权限点。

```sql
create table app_role_permission (
    id bigserial primary key,

    role_id bigint not null references app_role(id),
    permission_id bigint not null references app_permission(id),

    effect varchar(16) not null default 'allow',
    status varchar(32) not null default 'active',

    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),

    unique (role_id, permission_id)
);
```

说明：

- MVP 阶段只使用 `allow`。
- 后续如果要支持显式拒绝，可扩展 `deny`。
- 禁止在代码里硬编码 `role_code == xxx` 来判断具体动作权限，应该统一走权限点。

---

## 3.7 `member_role`：成员角色授权表

职责：定义某个宗族成员在某个范围内拥有什么角色。

```sql
create table member_role (
    id bigserial primary key,

    membership_id bigint not null references clan_membership(id),
    role_id bigint not null references app_role(id),

    scope_type varchar(32) not null default 'clan',
    scope_id bigint not null,

    status varchar(32) not null default 'active',

    granted_by bigint references app_user(id),
    granted_at timestamp not null default now(),
    revoked_at timestamp,

    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),

    unique (membership_id, role_id, scope_type, scope_id)
);
```

授权范围说明：

| scope_type | scope_id | 说明 |
|---|---:|---|
| `clan` | `clan.id` | 整个宗族范围 |
| `branch` | `branch.id` | 指定支派范围 |
| `self` | `person.id` | 本人或本人家庭范围，后续扩展 |
| `global` | `0` | 平台级范围，谨慎使用 |

MVP 阶段建议只支持：

- `clan`
- `branch`

---

## 4. ER 关系

```text
app_user 1 ─── N clan_membership
clan     1 ─── N clan_membership
person   1 ─── 0..1 clan_membership

clan_membership 1 ─── N member_role
app_role        1 ─── N member_role

app_role        1 ─── N app_role_permission
app_permission  1 ─── N app_role_permission
```

业务语义：

```text
一个用户可以加入多个宗族。
一个宗族可以有多个修谱成员。
一个修谱成员可以绑定一个谱内人物。
一个修谱成员可以拥有多个角色授权。
一个角色可以拥有多个权限点。
一个权限点可以被多个角色拥有。
```

---

## 5. 权限判断链路

用户执行操作时，统一走以下链路：

```text
app_user
  -> clan_membership
  -> member_role
  -> app_role
  -> app_role_permission
  -> app_permission
```

判断步骤：

1. 当前用户是否登录且 `app_user.status = active`。
2. 当前用户是否加入目标宗族，即存在有效 `clan_membership`。
3. 当前成员是否有有效 `member_role`。
4. `member_role.role_id` 对应的角色是否拥有目标 `app_permission`。
5. `member_role.scope_type/scope_id` 是否覆盖当前操作对象。

示例：用户编辑人物。

```text
permission_code = person.update
目标对象 = person_id=100
目标对象所属 clan_id=1
目标对象所属 branch_id=20
```

授权判断：

- 如果用户有 `person.update` 权限，且 `member_role.scope_type='clan'`、`scope_id=1`，允许。
- 如果用户有 `person.update` 权限，且 `member_role.scope_type='branch'`、`scope_id=20`，允许。
- 如果用户只有 `scope_type='branch'`、`scope_id=30`，拒绝。

---

## 6. 推荐角色权限矩阵

### 6.1 宗族管理员 `clan_admin`

```text
clan.view
clan.update
branch.view
branch.create
branch.update
branch.delete
person.view
person.create
person.update
person.delete
relationship.view
relationship.create
relationship.update
relationship.delete
source.view
source.create
source.update
source.verify
review.submit
review.approve
review.reject
tree.view
export.person
export.genealogy_book
member.view
member.invite
member.grant_role
member.revoke_role
```

### 6.2 支派管理员 `branch_admin`

```text
clan.view
branch.view
branch.update
person.view
person.create
person.update
relationship.view
relationship.create
relationship.update
source.view
source.create
source.update
review.submit
tree.view
export.person
```

通常绑定：

```text
member_role.scope_type = branch
member_role.scope_id = branch.id
```

### 6.3 修谱编辑 `editor`

```text
clan.view
branch.view
person.view
person.create
person.update
relationship.view
relationship.create
relationship.update
source.view
source.create
review.submit
tree.view
```

### 6.4 审核员 `reviewer`

```text
clan.view
branch.view
person.view
relationship.view
source.view
review.approve
review.reject
tree.view
```

### 6.5 查看者 `viewer`

```text
clan.view
branch.view
person.view
relationship.view
source.view
tree.view
```

---

## 7. 当前模型到目标模型的迁移设计

## 7.1 新增表

建议新增迁移文件：

```text
backend/genealogy-backend/src/main/resources/db/migration/V3__rbac_membership_refactor.sql
```

新增：

- `app_permission`
- `app_role_permission`
- `clan_membership`
- `member_role`

短期不直接删除 `clan_member`，避免影响现有接口。

---

## 7.2 迁移 `clan_member` 到 `clan_membership`

```sql
insert into clan_membership (
    clan_id,
    user_id,
    person_id,
    join_status,
    member_status,
    invited_by,
    joined_at,
    created_at,
    updated_at
)
select distinct on (clan_id, user_id)
    clan_id,
    user_id,
    person_id,
    join_status,
    member_status,
    invited_by,
    joined_at,
    created_at,
    updated_at
from clan_member
order by clan_id, user_id, created_at;
```

---

## 7.3 迁移 `clan_member.role_id` 到 `member_role`

```sql
insert into member_role (
    membership_id,
    role_id,
    scope_type,
    scope_id,
    status,
    granted_by,
    granted_at,
    created_at,
    updated_at
)
select
    cmship.id,
    cm.role_id,
    cm.scope_type,
    coalesce(cm.scope_id, cm.branch_id, cm.clan_id),
    cm.member_status,
    cm.invited_by,
    coalesce(cm.joined_at, cm.created_at),
    cm.created_at,
    cm.updated_at
from clan_member cm
join clan_membership cmship
  on cmship.clan_id = cm.clan_id
 and cmship.user_id = cm.user_id;
```

---

## 7.4 初始化权限点

示例：

```sql
insert into app_permission (
    permission_code,
    permission_name,
    module_code,
    module_name,
    resource_code,
    action_code,
    description
)
values
    ('clan.view', '查看宗族', 'clan', '宗族管理', 'clan', 'view', '查看宗族基础信息'),
    ('clan.update', '编辑宗族', 'clan', '宗族管理', 'clan', 'update', '编辑宗族基础信息'),
    ('branch.view', '查看支派', 'branch', '支派管理', 'branch', 'view', '查看支派'),
    ('branch.create', '创建支派', 'branch', '支派管理', 'branch', 'create', '创建支派'),
    ('branch.update', '编辑支派', 'branch', '支派管理', 'branch', 'update', '编辑支派'),
    ('person.view', '查看人物', 'person', '人物档案', 'person', 'view', '查看人物'),
    ('person.create', '创建人物', 'person', '人物档案', 'person', 'create', '创建人物'),
    ('person.update', '编辑人物', 'person', '人物档案', 'person', 'update', '编辑人物'),
    ('person.delete', '删除人物', 'person', '人物档案', 'person', 'delete', '删除人物'),
    ('relationship.view', '查看关系', 'relationship', '亲属关系', 'relationship', 'view', '查看关系'),
    ('relationship.create', '创建关系', 'relationship', '亲属关系', 'relationship', 'create', '创建关系'),
    ('relationship.update', '编辑关系', 'relationship', '亲属关系', 'relationship', 'update', '编辑关系'),
    ('relationship.delete', '删除关系', 'relationship', '亲属关系', 'relationship', 'delete', '删除关系'),
    ('source.view', '查看来源', 'source', '来源资料', 'source', 'view', '查看来源'),
    ('source.create', '创建来源', 'source', '来源资料', 'source', 'create', '创建来源'),
    ('source.update', '编辑来源', 'source', '来源资料', 'source', 'update', '编辑来源'),
    ('source.verify', '验证来源', 'source', '来源资料', 'source', 'verify', '验证来源'),
    ('review.submit', '提交审核', 'review', '审核中心', 'review', 'submit', '提交审核'),
    ('review.approve', '审核通过', 'review', '审核中心', 'review', 'approve', '审核通过'),
    ('review.reject', '审核驳回', 'review', '审核中心', 'review', 'reject', '审核驳回'),
    ('tree.view', '查看世系', 'tree', '世系图谱', 'tree', 'view', '查看世系'),
    ('export.person', '导出人物', 'export', '导出', 'person', 'export', '导出人物'),
    ('export.genealogy_book', '导出族谱', 'export', '导出', 'genealogy_book', 'export', '导出族谱')
on conflict (permission_code) do nothing;
```

---

## 7.5 初始化角色权限关系

建议按角色权限矩阵初始化 `app_role_permission`。

示例：

```sql
insert into app_role_permission (role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on p.permission_code in (
    'clan.view',
    'branch.view',
    'person.view',
    'relationship.view',
    'source.view',
    'tree.view'
)
where r.role_code = 'viewer'
on conflict (role_id, permission_id) do nothing;
```

其他角色按权限矩阵依次初始化。

---

## 7.6 兼容视图

如果短期后端仍依赖 `clan_member`，可以先不删旧表。

中期可迁移完成后将旧表改为兼容视图：

```sql
create view clan_member_compat as
select
    mr.id,
    cm.clan_id,
    cm.user_id,
    cm.person_id,
    case when mr.scope_type = 'branch' then mr.scope_id else null end as branch_id,
    mr.role_id,
    coalesce(p.name, au.display_name) as member_name,
    cm.join_status,
    cm.invited_by,
    cm.member_status,
    mr.scope_type,
    mr.scope_id,
    cm.joined_at,
    cm.created_at,
    cm.updated_at
from clan_membership cm
join app_user au on au.id = cm.user_id
left join person p on p.id = cm.person_id
join member_role mr on mr.membership_id = cm.id
where cm.member_status = 'active'
  and mr.status = 'active';
```

---

## 8. 后端重构计划

## 阶段 1：数据库新增与数据迁移

目标：新增目标表，不破坏现有功能。

任务：

1. 新增 Flyway 迁移 `V3__rbac_membership_refactor.sql`。
2. 创建 `app_permission`、`app_role_permission`、`clan_membership`、`member_role`。
3. 从 `clan_member` 迁移成员身份和角色授权。
4. 初始化权限点和角色权限关系。
5. 保留旧 `clan_member` 表，作为兼容来源。

验收：

- 原有登录、建谱、成员权限页面不报错。
- 新表中可查询到与旧 `clan_member` 等价的成员和角色授权数据。

---

## 阶段 2：后端领域模型重构

目标：从代码层面拆分“成员身份”和“成员角色授权”。

建议新增包：

```text
backend/genealogy-backend/src/main/java/com/genealogy/auth/domain
backend/genealogy-backend/src/main/java/com/genealogy/auth/repository
backend/genealogy-backend/src/main/java/com/genealogy/auth/service
```

建议新增实体：

- `AppPermission`
- `AppRolePermission`
- `ClanMembership`
- `MemberRole`

建议保留/调整实体：

- `AppUser`
- `AppRole`
- `Person`

服务拆分：

```text
MembershipService：负责加入宗族、成员状态、绑定谱内人物
MemberRoleService：负责授予/撤销角色
PermissionService：负责权限点查询和角色权限关系
AuthorizationService：负责统一鉴权判断
```

---

## 阶段 3：统一鉴权服务

目标：所有业务写操作都通过统一权限判断。

建议核心方法：

```java
boolean hasPermission(Long userId, Long clanId, String permissionCode);

boolean hasPermission(
    Long userId,
    Long clanId,
    String permissionCode,
    String targetType,
    Long targetId
);
```

目标对象范围解析：

| targetType | 范围解析方式 |
|---|---|
| `clan` | `targetId = clan_id` |
| `branch` | `targetId = branch_id` |
| `person` | 查 `person.branch_id` |
| `relationship` | 查关系两端人物所属支派 |
| `source` | 查来源绑定对象，或按来源所属宗族 |
| `review` | 查审核对象所属宗族/支派 |

判断逻辑：

```text
1. 查询用户在宗族下的 clan_membership
2. 查询有效 member_role
3. 判断 member_role 对应角色是否拥有 permissionCode
4. 判断 scope 是否覆盖目标对象
```

---

## 阶段 4：接口替换

目标：成员权限相关接口从旧 `clan_member` 切到新模型。

建议接口：

```text
GET    /api/v1/clans/{clanId}/memberships
POST   /api/v1/clans/{clanId}/memberships
PUT    /api/v1/memberships/{membershipId}
DELETE /api/v1/memberships/{membershipId}

GET    /api/v1/memberships/{membershipId}/roles
POST   /api/v1/memberships/{membershipId}/roles
DELETE /api/v1/member-roles/{memberRoleId}

GET    /api/v1/roles
GET    /api/v1/permissions
GET    /api/v1/roles/{roleId}/permissions
PUT    /api/v1/roles/{roleId}/permissions
```

---

## 阶段 5：前端页面调整

页面命名统一：

| 页面 | 对应表 | 说明 |
|---|---|---|
| 系统用户 | `app_user` | 系统账号管理 |
| 人物档案 | `person` | 谱内人物管理 |
| 修谱成员 | `clan_membership` | 宗族协作成员 |
| 成员授权 | `member_role` | 成员角色和范围 |
| 角色管理 | `app_role` | 角色定义 |
| 权限点管理 | `app_permission` | 权限点定义 |
| 角色权限配置 | `app_role_permission` | 角色与权限点绑定 |

前端原则：

1. `person` 页面叫“人物档案/族人档案”。
2. `clan_membership` 页面叫“修谱成员/协作成员”。
3. 不再把 `clan_membership` 叫“族人”。
4. 成员授权页中，支派范围用支派名称下拉，不展示 `scope_id`。
5. 角色权限配置页面使用中文权限名称和模块分组。

---

## 9. 兼容与风险控制

### 9.1 兼容策略

短期：

- 新增新表。
- 旧 `clan_member` 保留。
- 新服务优先读新表，旧接口可暂时读旧表。

中期：

- 成员权限接口切到新表。
- 旧 `clan_member` 不再写入。
- 使用兼容视图辅助旧查询。

长期：

- 删除旧 `clan_member` 表或改为只读视图。
- 全部权限判断统一走 `AuthorizationService`。

### 9.2 风险点

| 风险 | 说明 | 缓解措施 |
|---|---|---|
| 数据重复 | 旧 `clan_member` 中同一用户多角色多记录 | 迁移 membership 时按 `(clan_id,user_id)` 去重 |
| 范围错误 | `branch_id` 与 `scope_id` 不一致 | 迁移时优先 `scope_id`，为空时再用 `branch_id` |
| 权限过大 | 支派管理员被授予 clan 范围 | 初始化和页面授权时限制角色默认范围 |
| 旧接口失效 | 后端仍查询旧表 | 分阶段替换，必要时提供兼容视图 |
| 页面概念混淆 | 修谱成员与族人混用 | 页面命名统一，文案区分“修谱成员”和“谱内人物” |

---

## 10. 推荐实施里程碑

### M1：方案落库

- 完成本文档评审。
- 明确是否保留 `app_role` 命名。
- 明确 MVP 阶段支持的 `scope_type`：建议只支持 `clan` 和 `branch`。

### M2：数据库迁移

- 新增 `V3__rbac_membership_refactor.sql`。
- 新增四张表。
- 迁移旧 `clan_member` 数据。
- 初始化权限点和角色权限关系。

### M3：后端服务重构

- 新增实体和 Repository。
- 新增 `MembershipService`、`MemberRoleService`、`PermissionService`、`AuthorizationService`。
- 保留旧接口兼容。

### M4：接口与页面切换

- 成员权限页面切换到新接口。
- 角色权限配置页面启用 `app_permission/app_role_permission`。
- 页面文案统一：系统用户、谱内人物、修谱成员、成员授权。

### M5：旧模型下线

- 停止写入旧 `clan_member`。
- 旧表转只读视图或删除。
- 所有业务接口统一使用权限点鉴权。

---

## 11. 最终结论

推荐目标模型：

```text
app_user：登录账号
person：谱内人物
clan_membership：账号加入宗族后的成员身份
app_role：角色定义
app_permission：权限点定义
app_role_permission：角色拥有的权限点
member_role：成员在某个范围内拥有的角色
```

这套设计的核心价值：

1. 消除 `app_user`、`person`、`clan_member` 的语义混乱。
2. 让“成员身份”和“角色授权”分离。
3. 让“角色”和“权限点”分离。
4. 支持宗族级、支派级的数据范围授权。
5. 为后续审核中心、来源资料库、人物档案、世系图谱等业务模块提供统一鉴权基础。
