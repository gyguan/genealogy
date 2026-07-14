# 03. 数据模型设计

## 设计原则

MVP 1 不使用简单的 `parent_id` 或 `spouse_id` 表达族谱关系，而是采用人物与关系分离的模型。

```text
Person 人物
+
Relationship 关系
+
Source 来源
+
Revision 审核变更
```

这样可以支持中国式族谱中的继嗣、出嗣、兼祧、多配偶、证据来源和审核留痕。

## 核心实体

| 实体 | 说明 |
|---|---|
| clan | 宗族空间，承载姓氏、堂号、郡望、始祖等信息 |
| branch | 支派/房支，支持多级树形结构 |
| generation_scheme | 字辈方案，支持宗族级和支派级 |
| generation_word | 世次与字辈映射 |
| person | 人物档案 |
| relationship | 人物关系 |
| source | 资料来源 |
| attachment | 来源附件 |
| source_binding | 来源与人物、关系等对象的绑定 |
| revision | 变更记录 |
| review_task | 审核任务 |
| user_account | 用户账号 |
| clan_member | 宗族成员 |
| role | 角色 |
| member_role | 成员角色和授权范围 |
| import_batch | 导入批次 |
| import_row | 导入明细 |
| export_task | 导出任务 |
| operation_log | 操作日志 |
| culture_item | 文本型宗族文化档案，支持宗族级和支派级 |
| migration_event | 支派的结构化迁徙事件 |
| culture_site | 祠堂、祖居、墓园和纪念设施等文化场所 |

## 人物模型重点

`person` 表保存人物基础档案，包括姓名、谱名、字号、性别、世次、字辈、排行、生卒、居住地、职业、人物传记、墓葬、隐私级别、数据状态等。

父母、配偶、子女不直接放在 `person` 表中，而是统一放在 `relationship` 表中。

## 关系模型重点

`relationship` 表使用：

```text
from_person_id
到
to_person_id
+
relation_type
```

常见关系类型：

```text
father_of
mother_of
spouse_of
adoptive_father_of
adoptive_mother_of
heir_of
adopted_out_to
jiantiao_of
ruzhui_to
other
```

关系本身需要支持状态、来源、说明、可信度、审核和软删除。

## 来源证据模型

资料来源可绑定到不同对象：

```text
person
relationship
branch
clan
generation_word
culture_item
migration_event
culture_site
```

这样可以追溯某个人物、某个父子关系、某个支派迁徙、某个字辈或某项宗族文化结论来自哪本谱、哪一页、哪段原文。

### 来源资料库模块定位

`source` 不是普通附件记录，而是族谱系统的证据中心。它负责统一管理来源资料、附件、引用关系、复核状态、权限隐私和操作留痕。

来源资料库需要回答四个问题：

| 问题 | 数据模型支撑 |
|---|---|
| 资料从哪里来 | `source.source_name/source_type/provider_name/book_title/volume_no/page_no/source_date` |
| 资料是否可信 | `source.confidence_level/source.verification_status` |
| 资料被谁引用 | `source_binding.target_type/target_id` 与聚合查询 |
| 资料是否安全 | `source.privacy_level/sensitive_level` 与附件权限 |

### source 推荐字段

| 字段 | 说明 |
|---|---|
| id | 来源主键，前端普通用户不直接展示 |
| clan_id | 所属宗族 |
| source_name | 来源名称 |
| source_type | 来源类型 |
| provider_name | 提供者 / 收藏机构 |
| book_title | 书名 / 文献名 |
| volume_no | 卷号 |
| page_no | 页码 / 位置 |
| source_date | 资料年代 |
| excerpt | 原文摘录 |
| description | 资料说明 |
| confidence_level | 可信度：high / medium / low / unknown |
| verification_status | 来源状态：draft / pending_review / official / rejected / archived |
| privacy_level | 隐私级别：public / clan_only / branch_only / relatives_only / private / sealed |
| sensitive_level | 敏感级别：normal / sensitive / highly_sensitive |
| created_by | 创建人 |
| created_at | 创建时间 |
| updated_at | 更新时间 |
| deleted_at | 软删除时间，后续需要软删除时使用 |

### source_attachment 推荐字段

| 字段 | 说明 |
|---|---|
| id | 附件主键，前端普通用户不直接展示 |
| source_id | 所属来源 |
| file_name | 文件名 |
| file_type | 文件类型 |
| file_size | 文件大小 |
| storage_path | 存储路径，仅后端使用，不直接返回普通前端 |
| checksum | 文件校验值，仅后端或管理员诊断使用 |
| privacy_level | 附件隐私级别，默认继承来源 |
| sensitive_level | 附件敏感级别 |
| upload_status | 上传状态 |
| uploaded_by | 上传人 |
| uploaded_at | 上传时间 |
| deleted_at | 软删除时间 |

### source_binding 推荐字段

| 字段 | 说明 |
|---|---|
| id | 绑定主键 |
| clan_id | 所属宗族 |
| source_id | 来源 ID |
| target_type | 绑定对象类型：person / relationship / branch / clan / generation_word / culture_item / migration_event / culture_site |
| target_id | 绑定对象 ID，前端展示时必须转换为业务名称 |
| binding_reason | 绑定原因 |
| excerpt | 本次引用摘录 |
| confidence_level | 本次引用可信度 |
| binding_status | 绑定状态：draft / pending_review / official / rejected / archived |
| created_by | 创建人 |
| created_at | 创建时间 |
| updated_at | 更新时间 |
| deleted_at | 软删除时间 |

### 聚合展示字段

以下字段不一定落表，但来源资料库列表和详情接口需要聚合返回，避免前端自行拼凑：

| 字段 | 说明 |
|---|---|
| binding_count | 来源被引用次数 |
| attachment_count | 来源附件数 |
| target_display_name | 绑定对象业务名称 |
| target_branch_name | 绑定对象所属支派 |
| target_summary | 绑定对象摘要 |
| permissions | 当前用户对来源的可操作权限 |

## 审核模型

正式数据修改不直接落表，而是生成：

```text
revision → review_task → approve/reject → apply
```

审核通过后才写入正式数据。

来源资料库和宗族文化相关审核规则：

1. 新增来源和文化对象默认进入 `draft`。
2. 提交复核后进入 `pending_review`。
3. 审核通过后进入 `official`，审核驳回后进入 `rejected`。
4. `official` 对象的关键字段修改、删除、归档和首页精选变更必须走 `revision → review_task → apply`。
5. 正式人物、正式关系、正式支派、正式字辈和正式文化对象的来源绑定或解绑必须走审核。
6. 审核员不能审核自己提交的来源、来源绑定或文化变更。
7. 来源附件上传可以先进入来源详情，但敏感附件上传、预览、下载需要单独权限和审计。

## 状态枚举

人物、关系、来源、来源绑定及宗族文化对象统一使用以下数据状态：

```text
draft
pending_review
official
rejected
archived
```

历史兼容规则：

| 历史状态 | 目标状态 | 说明 |
|---|---|---|
| unverified | draft | 未复核来源先按草稿处理 |
| verified | official | 已验证来源迁移为正式来源 |
| reviewed | official | 如历史数据存在该值，迁移为正式来源 |
| approved | official | 如历史数据存在该值，迁移为正式来源 |

审核任务状态：

```text
pending
approved
rejected
cancelled
```

隐私级别：

```text
public
clan_only
branch_only
relatives_only
private
sealed
```

可信度：

```text
high
medium
low
unknown
```

敏感级别：

```text
normal
sensitive
highly_sensitive
```

## 宗族文化领域模型

### culture_item

`culture_item` 保存文本型和内容型文化档案。`branch_id` 为空表示宗族级，不为空表示支派级。

分类：

```text
surname_origin
hall_name
commandery
family_instruction
ancestor_instruction
clan_rule
genealogy_preface
genealogy_rule
person_story
custom_tradition
other
```

核心字段：

| 字段 | 说明 |
|---|---|
| clan_id | 所属宗族 |
| branch_id | 可空，表示宗族级或支派级范围 |
| category | 文化分类 |
| title | 业务标题 |
| summary | 列表和首页摘要 |
| content | 正文，列表默认不返回 |
| historical_period | 历史时期文本 |
| location_text | 相关地点文本 |
| confidence_level | 可信度 |
| privacy_level | 隐私级别 |
| sensitive_level | 敏感级别 |
| data_status | 数据状态 |
| is_featured_on_home | 是否进入首页候选；正式展示仍需状态和权限过滤 |
| sort_order | 排序 |
| version | 乐观锁版本 |
| created_by / created_at / updated_at / deleted_at | 审计和软删除字段 |

### migration_event

`migration_event` 表达某一支派的一次迁徙事实：

```text
branch_id + sequence_no + from_location + to_location + migration_time_text + founder_person_id
```

- `branch_id` 必填。
- 同一未删除支派下 `sequence_no` 唯一且大于 0。
- 迁出地和迁入地至少一个非空。
- `founder_person_id` 可空，但补绑时必须与宗族一致。
- 历史时期使用文本，避免将朝代、年号或模糊年代错误转换为精确日期。

### culture_site

`culture_site` 管理文化场所：

```text
ancestral_hall
ancestral_home
cemetery
memorial
other
```

`current_status` 描述场所的现实状态；`data_status` 描述资料的审核状态，两者不得混用。纬度、经度可空并设置合法范围约束，接口仍需按隐私规则最小披露。

### 兼容与单一事实源

- `clan.hall_name`、`clan.commandery`、`clan.origin_place` 暂时保留只读兼容，不与 `culture_item` 双写。
- `branch.migration_from`、`branch.migration_to` 暂时保留只读兼容，不再作为多事件迁徙的事实源。
- 本阶段不自动迁移历史数据。
- 只有新模型的维护、审核、来源、权限、追踪、首页和文化页全部完成，并经过数据核验和回滚演练后，才能另行收口旧字段。

完整设计、迁移和回滚策略见 `docs/17-culture-domain-foundation.md`。
