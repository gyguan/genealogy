# 09. 中国式族谱权限管理方案

## 1. 设计目标

中国式族谱权限不能简化为“管理员/普通用户”。权限判断必须同时回答：

```text
用户属于哪个宗族
→ 具备什么角色能力
→ 能访问哪个宗族或支派范围
→ 数据隐私是否允许
→ 当前流程状态是否允许该动作
```

核心目标：

1. 宗族自治：权限首先限定在宗族空间内。
2. 支派分权：支派管理员只管理授权支派及下级支派。
3. 生者保护：在世人物和敏感材料默认采用更严格隐私。
4. 编辑发布分离：录入、审核和正式发布职责分离。
5. 来源证据保护：来源和附件按敏感级别控制。
6. 导出受控：导出需要独立权限、审批和审计。
7. 界面业务化：页面使用宗族、支派和成员名称，不展示技术 ID。

## 2. 权限判断模型

统一权限判断：

```text
can(user, action, resource)
= active_membership(user, resource.clan)
  AND role_allows(user.role, action)
  AND scope_covers(user.scope, resource)
  AND privacy_allows(user, resource)
  AND workflow_allows(action, resource.status)
```

后端是权限判定的唯一可信来源。前端隐藏按钮、选项过滤和风险提示仅用于改善体验，不能替代后端校验。

## 3. 当前运行时契约

### 3.1 宗族成员身份

当前成员状态：

```text
active / disabled / removed
```

- `active`：有效成员。
- `disabled`：停用，不能继续访问宗族数据。
- `removed`：已移除，保留历史操作记录。
- 历史 `inactive`、`invited` 仅用于兼容读取，不作为正式写入状态。

### 3.2 内置角色

| 角色 | 定位 | 典型能力 |
|---|---|---|
| `clan_admin` | 宗族治理负责人 | 成员、支派、权限及全宗族数据治理 |
| `branch_admin` | 支派负责人 | 管理指定支派及全部下级支派 |
| `editor` | 资料编辑 | 在授权范围内录入和维护资料 |
| `reviewer` | 审核员 | 审核正式数据变更 |
| `viewer` | 查看者 | 查看授权范围内允许访问的数据 |
| `cross_clan_admin` | 平台级跨宗族管理 | 系统内置，不允许通过宗族成员页面授予 |

自定义角色、宗族创建人、主编、贡献者、访客和独立审计员属于后续角色扩展，不属于当前成员权限写接口。

### 3.3 授权范围

正式写入范围：

| 范围 | 含义 | 当前用途 |
|---|---|---|
| `clan` | 当前宗族全部数据 | 宗族管理员、审核员及全宗族编辑/查看 |
| `branch_subtree` | 指定支派自身及全部下级支派 | 支派管理员、支派编辑和查看 |

兼容与规划边界：

- 历史 `branch` 只表示“当前支派”，新接口不再写入。
- `object` 对象级授权尚未实现，后续通过 `resource_acl` 建设。
- 支派包含关系以 `branch.parent_id` 为事实来源，通过递归查询判断。

### 3.4 授权状态

```text
active / revoked
```

撤销一条授权不等同于停用成员。一名成员可以同时拥有多条有效授权。

## 4. 权限动作模型

权限码统一使用点号格式：

```text
resource.action
```

| 资源 | 当前主要动作 |
|---|---|
| `clan` | `view / update / manage_settings / delete` |
| `member` | `view / invite / grant_role / revoke_role / disable` |
| `branch` | `view / create / update / delete` |
| `person` | `view / create / update / delete / submit_review` |
| `relationship` | `view / create / update / delete / check_conflict / submit_review` |
| `source` | `view / create / update / delete / bind` |
| `attachment` | `view / upload / preview / download / delete` |
| `review_task` | `view / approve / reject / assign` |
| `export_task` | `create / approve / download` |
| `operation_log` | `view / export` |

例如：

```text
member.grant_role
member.revoke_role
operation_log.view
```

历史冒号格式只作为兼容输入标准化，不再作为文档和新代码的正式格式。

## 5. 隐私规则

| 隐私级别 | 含义 | 典型适用 |
|---|---|---|
| `public` | 公开可见 | 审核后公开的远祖资料 |
| `clan_only` | 宗族成员可见 | 一般已故人物、来源摘要 |
| `branch_only` | 本支派及下级支派可见 | 近现代人物、内部资料 |
| `relatives_only` | 本人、近亲或授权人员可见 | 在世人物和家庭关系 |
| `private` | 提交人、管理员、审核员可见 | 家庭照片、口述记录、敏感备注 |
| `sealed` | 封存，需要特殊审批 | 证件、争议资料、敏感家事 |

默认建议：

- 在世人物：`branch_only` 或 `relatives_only`。
- 一般已故人物：`clan_only`。
- 家庭照片：`private` 或 `branch_only`。
- 证件材料：`sealed`。
- 关系数据继承两端人物中更严格的隐私级别。

## 6. 审核发布流程

关键数据采用：

```text
草稿 → 待审核 → 正式谱
```

| 操作 | 建议策略 |
|---|---|
| 新增草稿人物 | 可直接保存草稿 |
| 修改正式人物关键字段 | 进入审核 |
| 建立或修改重要关系 | 建议审核 |
| 删除人物或关系 | 必须审核，优先软删除 |
| 上传普通来源 | 可直接上传，正式绑定建议审核 |
| 上传敏感附件 | 必须审核或审批 |
| 大规模导出 | 独立权限、审批和日志 |

审核约束：

1. 审核员不能审核自己提交的变更。
2. 驳回必须保留原因。
3. 审核操作写入 `operation_log`。
4. 双人复核属于后续 P2 治理能力。

## 7. 数据模型

当前主要表：

| 表 | 作用 |
|---|---|
| `app_user` | 平台用户账号 |
| `clan_membership` | 用户在宗族中的成员身份 |
| `role` | 内置角色定义 |
| `app_permission` | 标准权限动作 |
| `app_role_permission` | 角色与权限映射 |
| `member_role` | 成员角色、范围和授权状态 |
| `operation_log` | 权限、数据、审核和导出操作日志 |

当前 `member_role` 核心语义：

```text
id = grantId
membership_id = membershipId
role_id
scope_type: clan / branch_subtree（branch 仅历史兼容）
scope_id
status: active / revoked
granted_by / granted_at / revoked_at
created_at / updated_at
```

规划表：

- `resource_acl`：对象级临时授权。
- `privacy_policy`：可配置隐私策略。
- 权限有效期字段和自动失效调度。

## 8. 成员权限产品体验

成员权限页面遵循：

1. 一名成员一条聚合记录，多条可见授权嵌套展示。
2. 候选成员通过脱敏、分页搜索选择。
3. 角色和可用范围由后端返回。
4. 显示角色能力摘要和范围预览。
5. 高风险角色二次确认。
6. 停用、恢复、撤销和修改必须填写原因。
7. 具备 `operation_log.view` 时展示权限变更历史。
8. 根据稳定错误码展示业务提示，不展示堆栈或内部异常。
9. 支派管理员只看到自身范围内的授权明细。
10. 页面不展示 `userId`、`membershipId`、`grantId`、`scopeId` 等技术字段。

成员权限的详细接口、安全不变量和验收标准见：

```text
docs/11-member-permission-hardening.md
```

## 9. 分阶段落地状态

### P0：成员权限安全闭环

已完成：

- 用户目录隐私收口。
- 成员、身份、授权 ID 契约拆分。
- `clan / branch_subtree` 范围语义。
- 数据库分页前范围过滤。
- 越级、超范围和最后管理员保护。
- 目标级操作权限和必要索引。

### P1：体验、契约与审计

本阶段建设：

- 查询状态一致性。
- 标准 HTTP 和业务错误契约。
- 成员权限审计分页查询。
- Drawer 权限变更历史。
- 角色能力、范围预览和高风险确认。
- 文档、OpenAPI、代码和测试一致性。

### P2：治理和精细化授权

尚未实现：

- 对象级临时授权。
- 权限有效期和自动失效。
- 高风险操作双人复核。
- 自定义角色。
- 权限审计报表和导出。

## 10. 核心验收场景

| 用例 | 预期 |
|---|---|
| 普通成员访问其他宗族 | 拒绝 |
| 支派管理员访问兄弟支派数据 | 拒绝或不返回 |
| 支派管理员访问下级支派数据 | 允许 |
| 支派管理员查看混合范围成员 | 只返回自身范围内授权 |
| 唯一管理员被撤销、降权或停用 | 拒绝并返回冲突错误 |
| 普通成员查询权限审计 | 拒绝 |
| 管理员查看成员权限历史 | 返回操作者、前后值、原因和时间 |
| 访客查看在世人物详情 | 脱敏或不可见 |
| 权限被停用成员继续访问 | 拒绝 |

## 11. 结论

中国式族谱权限管理的核心不是“谁是管理员”，而是：

```text
谁属于哪个宗族，负责哪一支，能看哪些隐私资料，能改哪些正式数据，哪些动作必须审核，哪些操作必须留痕。
```

推荐持续演进：

```text
宗族成员身份 + 角色权限 + 支派子树范围 + 隐私规则 + 审核发布流 + 操作审计
```
