# 09. 中国式族谱权限管理方案

## 1. 设计目标

中国式族谱系统的权限管理不能简单等同于后台管理系统的“管理员/普通用户”。族谱数据天然具备宗族自治、房支分权、生者隐私、证据敏感、审核入谱和导出受控等特点，因此权限体系需要同时解决以下问题：

1. 多宗族权限：同一用户可能参与多个宗族或宗亲会。
2. 支派分权：支派负责人只应维护本支派及下级支派数据。
3. 生者保护：在世人物、近现代人物、家庭照片和隐私资料默认更严格。
4. 编辑发布分离：允许多人协作录入，但正式入谱必须审核。
5. 来源证据保护：人物摘要可以较开放，但原始附件和敏感材料需要更强控制。
6. 导出受控：PDF/Excel/谱书导出需要独立权限和审计。
7. 界面业务化：权限界面不暴露宗族 ID、支派 ID、人物 ID、对象 ID 等技术字段。

最终目标是形成一套适合中国式族谱的“五层权限模型”：

```text
宗族成员身份 → 角色权限 → 支派/对象范围 → 隐私规则 → 审核发布流程
```

## 2. 权限设计原则

| 原则 | 说明 |
|---|---|
| 宗族自治 | 权限首先限定在某个宗族空间内，宗族管理员只能管理自己宗族的数据 |
| 支派分权 | 支派管理员、支派编辑只能维护授权支派及下级支派 |
| 最小授权 | 默认只给查看权限，高风险权限必须显式授予 |
| 生者优先保护 | 在世人员、近亲、家庭照片、联系方式和住址默认不公开 |
| 编辑发布分离 | 录入/编辑不等于正式发布，关键变更必须进入审核 |
| 来源证据留痕 | 来源和附件独立授权，所有变更保留审计记录 |
| 导出单独控制 | 导出族谱、批量下载附件、批量导出人物关系必须独立授权 |
| 界面隐藏技术字段 | 前端统一使用宗族名称、支派名称、人物姓名、业务对象名称，不直接暴露技术 ID |

## 3. 五层权限模型

### 3.1 第一层：宗族成员身份

用户进入任何宗族数据前，必须先具备该宗族的成员身份。

```text
UserAccount
  └── ClanMember
        ├── clan
        ├── memberName
        ├── memberStatus: pending / active / disabled
        └── joinedAt
```

校验规则：

1. 非宗族成员不得访问 `clan_only` 及以上数据。
2. `pending` 成员只能查看邀请/申请状态，不可查看族谱内容。
3. `disabled` 成员不能继续访问宗族数据，但历史操作日志保留。
4. 平台管理员不默认拥有宗族内容访问权，除非进入审计/运维授权流程。

### 3.2 第二层：角色权限

角色表达“能做什么”。建议采用系统内置角色 + 后续可扩展自定义角色。

| 角色 | 定位 | 典型权限 |
|---|---|---|
| clan_owner 宗族创建人 | 初始创建者，可转让 | 宗族配置、管理员任免、导出审批 |
| clan_admin 宗族管理员 | 宗族治理负责人 | 成员管理、支派管理、权限管理、全宗族查看 |
| chief_editor 修谱主编 | 资料建设负责人 | 人物、关系、来源维护，发起审核，导出草稿 |
| reviewer 审核员 | 入谱质量把关 | 查看待审内容，通过/驳回，不能自审 |
| branch_admin 支派管理员 | 房支负责人 | 管理本支派及下级支派成员和资料 |
| branch_editor 支派编辑 | 房支采集/录入人员 | 录入本支派人物、关系和来源 |
| contributor 普通贡献者 | 族人补充资料 | 提交纠错、补充资料，不能直接发布 |
| viewer 普通成员 | 宗族内查看 | 查看允许范围内的人物、世系、来源摘要 |
| guest 访客 | 外部分享访问 | 仅查看公开谱和脱敏内容 |
| auditor 审计员 | 只读审计 | 查看操作日志、审核记录，不维护业务数据 |

角色不直接决定数据范围。比如 `branch_admin` 必须同时绑定授权支派，才能判断可操作数据。

### 3.3 第三层：授权范围

授权范围表达“管哪里”。建议支持四类范围：

| 范围类型 | 说明 | 适用角色 |
|---|---|---|
| clan | 全宗族 | 宗族管理员、主编、审核员 |
| branch | 当前支派 | 支派编辑、支派查看 |
| branch_subtree | 当前支派及下级支派 | 支派管理员、支派编辑 |
| object | 指定对象 | 临时授权、纠错协作、特殊资料查看 |

支派范围需要支持树形包含判断：

```text
scope_match(user, resource)
= user.scope = clan
  OR resource.branch in user.branch_subtree
  OR resource.id in user.object_grants
```

前端展示时不得暴露 `branchId`，应使用：

```text
授权范围：全宗族 / 长沙支 / 长沙支及下级支派 / 指定对象
```

### 3.4 第四层：隐私规则

隐私规则表达“这个对象能被谁看到”。建议以人物隐私为核心，来源和附件更严格。

| 隐私级别 | 含义 | 默认适用 |
|---|---|---|
| public | 公开可见 | 远祖、公开谱展示内容 |
| clan_only | 宗族成员可见 | 一般已故人物、普通来源摘要 |
| branch_only | 本支派及下级支派可见 | 近现代人物、支派内部资料 |
| relatives_only | 本人、直系近亲或授权成员可见 | 在世人物、配偶子女信息 |
| private | 提交人、管理员、审核员可见 | 家庭照片、口述记录、敏感备注 |
| sealed | 封存，需特殊审批 | 证件材料、争议资料、敏感家事 |

默认规则：

| 数据类型 | 建议默认隐私 |
|---|---|
| 在世人物 | relatives_only 或 branch_only |
| 近现代已故人物 | clan_only |
| 远祖人物 | clan_only，可审核后 public |
| 亲属关系 | 继承两端人物中更严格的隐私级别 |
| 来源摘要 | clan_only |
| 家庭照片 | private 或 branch_only |
| 证件/证明材料 | sealed |
| 墓碑/地方志 | clan_only，可审核后 public |

### 3.5 第五层：审核发布流程

关键数据不能因为有编辑权限就直接进入正式谱库。建议采用“草稿 → 待审核 → 正式谱”的流程。

| 操作 | 是否直接生效 | 说明 |
|---|---|---|
| 新增草稿人物 | 可以 | 草稿仅编辑者和授权人员可见 |
| 提交人物入谱 | 否 | 生成 review_task |
| 修改正式人物关键字段 | 否 | 姓名、世次、字辈、生卒、支派归属等进入审核 |
| 建立亲属关系 | 建议审核 | 父母、配偶、继嗣、出嗣等关系影响世系 |
| 删除人物/关系 | 必须审核 | 高风险操作，可先软删除 |
| 上传普通来源 | 可直接上传 | 但绑定正式谱建议审核 |
| 上传敏感附件 | 必须审核/审批 | 证件、家庭照片、口述音频等 |
| 导出族谱 | 需要权限 | 大规模导出需要单独审批和日志 |

审核约束：

1. 审核员不能审核自己提交的变更。
2. 高风险操作支持双人复核。
3. 审核通过后写入正式数据，驳回后保留原因。
4. 所有审核操作写入 `operation_log`。

## 4. 权限动作模型

建议将权限动作标准化为 `resource:action`：

| 资源 | 动作 |
|---|---|
| clan | view / update / manage_settings / delete |
| member | invite / update_role / disable / transfer_owner |
| branch | view / create / update / delete |
| person | view / create / update / delete / submit_review |
| relationship | view / create / update / delete / check_conflict / submit_review |
| source | view / create / update / delete / bind |
| attachment | view / upload / preview / download / delete |
| review_task | view / approve / reject / assign |
| export_task | create / approve / download |
| operation_log | view / export |

权限判断统一走：

```text
can(user, action, resource)
= is_active_clan_member(user, resource.clan)
  AND role_allows(user.role, action)
  AND scope_covers(user.scope, resource)
  AND privacy_allows(user, resource)
  AND workflow_allows(action, resource.status)
```

## 5. 数据模型建议

当前数据模型中已有 `user_account`、`clan_member`、`role`、`member_role` 等实体，可在此基础上增强。

### 5.1 核心表

| 表 | 作用 |
|---|---|
| user_account | 平台用户账号 |
| clan_member | 用户在某个宗族下的成员身份 |
| role | 角色定义，内置角色 + 自定义角色 |
| permission | 标准权限动作定义 |
| role_permission | 角色与权限动作关系 |
| member_role | 成员角色、授权范围和状态 |
| resource_acl | 对象级临时授权 |
| privacy_policy | 隐私规则配置 |
| review_task | 审核任务 |
| operation_log | 权限、数据、审核、导出操作日志 |

### 5.2 member_role 推荐字段

```text
id
clan_id
member_id
role_code
scope_type: clan / branch / branch_subtree / object
scope_branch_id
scope_object_type
scope_object_id
status: active / disabled
start_at
expire_at
created_by
created_at
updated_at
```

### 5.3 resource_acl 推荐字段

用于特殊对象授权，比如某份敏感来源、某个人物、某次审核任务临时授权给某个成员。

```text
id
clan_id
resource_type: person / relationship / source / attachment / review_task
resource_id
member_id
action
expire_at
reason
created_by
created_at
```

## 6. 前端产品设计

权限界面必须业务化，避免技术字段泄漏。

### 6.1 成员授权界面

推荐交互：

```text
选择宗族：黄氏江夏堂
选择成员：黄建国
授权角色：支派管理员
授权范围：长沙支及下级支派
数据权限预览：
  - 可查看长沙支人物、关系、来源
  - 可新增/编辑长沙支资料
  - 删除和导出需要额外审批
```

界面不出现：

```text
宗族ID、支派ID、成员ID、范围ID、对象ID
```

### 6.2 数据页面权限体验

| 场景 | 推荐体验 |
|---|---|
| 无查看权限 | 显示“暂无权限查看该资料”，不暴露对象是否存在 |
| 无编辑权限 | 隐藏编辑/删除按钮 |
| 需审核 | 按钮文案为“提交审核”，不是“保存生效” |
| 敏感字段 | 使用脱敏展示，如“已隐藏，需申请查看” |
| 导出受控 | 点击导出先展示权限说明和审批入口 |

### 6.3 审计可见性

管理员和审计员可以查看：

1. 谁给谁授权。
2. 权限何时生效/失效。
3. 谁查看了敏感资料。
4. 谁导出了族谱。
5. 谁审核了正式入谱变更。

普通成员不可查看后台审计日志。

## 7. 后端鉴权设计

建议所有业务接口统一经过权限校验，不依赖前端隐藏按钮。

### 7.1 鉴权拦截点

| 层级 | 职责 |
|---|---|
| Controller | 提取用户、宗族、资源和动作 |
| PermissionService | 统一鉴权入口 |
| ScopeResolver | 解析目标对象所属宗族/支派 |
| PrivacyService | 判断人物/来源/附件隐私 |
| ReviewPolicyService | 判断操作是否必须进入审核 |
| OperationLogService | 记录权限和敏感操作 |

### 7.2 示例伪代码

```java
permissionService.check(currentUser, "person:update", personId);

boolean allowed = memberActive
    && rolePermissionMatched
    && scopeMatched
    && privacyAllowed
    && workflowAllowed;
```

鉴权失败返回业务错误：

```text
您暂无权限执行该操作
该资料为敏感资料，需要申请查看
该操作需要提交审核
```

不要返回：

```text
personId not allowed
branchId mismatch
```

## 8. 权限方案落地计划

### 8.1 P0：MVP 权限闭环

目标：让系统具备可上线的基本权限隔离能力。

| 周期 | 任务 | 产出 | 验收标准 |
|---|---|---|---|
| W1 | 梳理角色和动作清单 | role、permission、role_permission 初始化脚本 | 内置角色可初始化 |
| W1 | 完善成员授权模型 | member_role 支持 scope_type、scope_branch_id | 可授权全宗族/支派子树 |
| W2 | 后端统一鉴权入口 | PermissionService、ScopeResolver | 关键接口接入鉴权 |
| W2 | 前端权限业务化 | 成员权限页面隐藏技术字段，范围用宗族/支派名称 | 用户不需要填写 ID |
| W3 | 人物/关系/来源权限校验 | person、relationship、source 关键接口鉴权 | 越权访问被拦截 |
| W3 | 操作日志 | 权限变更、审核、导出、敏感查看写日志 | 管理员可追溯操作 |

P0 必须覆盖的接口：

```text
/clans/**
/clans/{clanId}/branches/**
/clans/{clanId}/persons/**
/clans/{clanId}/relationships/**
/clans/{clanId}/sources/**
/review-tasks/**
/member-management/**
/exports/**
```

### 8.2 P1：隐私和审核增强

目标：从“角色控制”升级到“角色 + 隐私 + 审核”。

| 周期 | 任务 | 产出 | 验收标准 |
|---|---|---|---|
| W4 | 人物隐私规则 | privacyLevel 扩展为 public/clan_only/branch_only/relatives_only/private/sealed | 在世人物默认受保护 |
| W4 | 敏感字段脱敏 | 出生地、住址、联系方式、生卒、配偶子女按权限脱敏 | 无权限用户只看脱敏摘要 |
| W5 | 审核策略 | 删除、关系变更、正式人物变更进入审核 | 编辑不能直接改正式谱 |
| W5 | 附件权限 | 来源附件预览/下载独立鉴权 | 敏感附件不可被普通成员下载 |
| W6 | 导出审批 | 大规模导出任务需权限/审批 | 导出日志可追溯 |

### 8.3 P2：治理和精细化授权

目标：支撑大型宗族、多人协作和长期治理。

| 周期 | 任务 | 产出 | 验收标准 |
|---|---|---|---|
| W7 | 对象级临时授权 | resource_acl | 可临时授权查看某人物/来源 |
| W7 | 权限有效期 | member_role.expire_at | 临时角色到期自动失效 |
| W8 | 双人复核 | 高风险操作多审核人 | 删除/导出需双人确认 |
| W8 | 权限变更审计报表 | 权限审计视图 | 可查询谁在何时授权谁 |
| W9 | 自定义角色 | 宗族可配置角色模板 | 管理员可创建受限自定义角色 |
| W9 | 权限测试集 | 后端权限单测 + 集成测试 | 常见越权场景自动化覆盖 |

## 9. MVP 推荐落地边界

第一期不要追求过度精细，建议先实现：

```text
角色：clan_admin / branch_admin / editor / reviewer / viewer
范围：clan / branch_subtree
动作：view / create / update / submit_review / approve / export
对象：branch / person / relationship / source / review_task / export_task
隐私：public / clan_only / branch_only / private
```

暂缓：

```text
字段级权限
复杂近亲计算
对象级临时授权
自定义角色
双人复核
```

## 10. 验收用例

| 用例 | 预期 |
|---|---|
| 普通成员访问其他宗族 | 无权限 |
| 支派管理员访问兄弟支派人物 | 无权限 |
| 支派管理员访问下级支派人物 | 可访问 |
| 编辑修改正式人物姓名 | 生成审核任务，不直接生效 |
| 审核员审核自己提交的变更 | 不允许 |
| 普通成员下载敏感附件 | 不允许 |
| 宗族管理员导出族谱 | 允许并记录日志 |
| 访客查看在世人物详情 | 脱敏或不可见 |
| 权限被禁用成员继续访问 | 无权限 |

## 11. 结论

中国式族谱权限管理的核心不是“谁是管理员”，而是：

```text
谁属于哪个宗族，负责哪一支，能看哪些隐私资料，能改哪些正式数据，哪些动作必须审核，哪些导出必须留痕。
```

因此推荐采用：

```text
宗族成员身份 + 角色权限 + 支派子树范围 + 隐私规则 + 审核发布流 + 操作审计
```

这套模型既能满足 MVP 阶段快速上线，也能支撑后续多人协作、老谱数字化、谱书出版和宗亲社区等长期演进。
