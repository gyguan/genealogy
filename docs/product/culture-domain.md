# 宗族文化领域基础设计

> 关联 Issue：#165、#166  
> 本文定义宗族文化第一阶段的领域边界、数据模型、状态、兼容窗口、迁移及回滚策略。完整后端用例、审核接入、权限运行时、追踪和页面分别由 #167～#172 实现。

## 1. 目标与边界

宗族文化不再作为 `clan.description` 或前端静态卡片的附属展示，而是拆分为三个可独立维护、审核和追踪的领域对象：

| 对象 | 职责 | 典型内容 |
|---|---|---|
| `culture_item` | 文本型、内容型文化档案 | 姓氏源流、堂号、郡望、家训、祖训、族规、谱序、凡例、人物故事、传统习俗 |
| `migration_event` | 支派的结构化迁徙事件 | 迁出地、迁入地、时期、始迁祖、原因、顺序和来源 |
| `culture_site` | 具有地点和现实状态的文化场所 | 祠堂、祖居、墓园、纪念设施 |

本阶段只建立模型、数据库和 API 契约，不实现完整写入用例。三类对象的正式数据后续必须进入：

```text
revision → review_task → approve/reject → apply
```

## 2. 通用领域规则

### 2.1 数据范围

- `clan_id` 必填，标识对象所属宗族。
- `branch_id` 为空表示宗族级文化；不为空表示支派级文化。
- `migration_event.branch_id` 必填，因为迁徙顺序必须归属于明确支派。
- 应用服务必须校验 `branch_id`、`founder_person_id` 与 `clan_id` 一致，不能只依赖前端选项。

### 2.2 数据状态

三类对象统一使用：

```text
draft
pending_review
official
rejected
archived
```

- 新建对象默认 `draft`。
- `draft`、`rejected` 可由有权限人员继续维护。
- `official` 的关键字段修改、归档、删除和首页精选变更必须走审核。
- `archived` 只表示不再作为当前有效资料展示，不等同于物理删除。
- `deleted_at` 仅用于技术软删除；正式对象删除仍需审核。

### 2.3 可信度、隐私和敏感级别

可信度：

```text
high / medium / low / unknown
```

隐私级别：

```text
public / clan_only / branch_only / relatives_only / private / sealed
```

敏感级别：

```text
normal / sensitive / highly_sensitive
```

接口必须在后端完成成员身份、角色、支派范围、隐私、敏感级别和工作流状态的联合判定。`private`、`sealed` 数据不得先返回正文、地址、摘录或附件元数据，再由前端隐藏。

## 3. `culture_item`

### 3.1 分类

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

`hall_name` 与现有 `clan.hall_name` 保持稳定语义，便于兼容读取和后续数据迁移。

### 3.2 核心字段

| 字段 | 说明 |
|---|---|
| `clan_id` | 所属宗族 |
| `branch_id` | 可空；空表示宗族级 |
| `category` | 文化分类 |
| `title` | 业务标题 |
| `summary` | 列表和首页摘要，不替代正文 |
| `content` | 正文，列表接口默认不返回 |
| `historical_period` | 历史时期文本，不强制转换为现代日期 |
| `location_text` | 相关地点文本 |
| `confidence_level` | 可信度 |
| `privacy_level` | 隐私级别 |
| `sensitive_level` | 敏感级别 |
| `data_status` | 数据状态 |
| `is_featured_on_home` | 是否进入首页候选；只有 `official` 且当前用户可见时才能展示 |
| `sort_order` | 精选和同类内容排序 |
| `version` | JPA 乐观锁版本 |

## 4. `migration_event`

迁徙事件使用明确支派和顺序表达，不再以“祖籍 → 首个支派 → 待维护地点”拼装路线。

```text
支派 → sequence_no → 迁出地 → 迁入地 → 时期 → 始迁祖 → 原因 → 说明
```

规则：

- 同一未删除支派下 `sequence_no` 唯一。
- `sequence_no` 必须大于 0。
- `from_location`、`to_location` 至少有一个非空。
- `founder_person_id` 可空，允许人物尚未录入；补绑时必须校验同宗族。
- 历史时间先使用 `migration_time_text`，避免将朝代、年号和模糊年代错误压缩为精确日期。

## 5. `culture_site`

场所类型：

```text
ancestral_hall
ancestral_home
cemetery
memorial
other
```

`current_status` 描述现实状态，例如现存、重建、迁建、损毁；它与 `data_status` 的审核状态是两个不同维度。

坐标字段可空：

- 纬度范围 `[-90, 90]`；
- 经度范围 `[-180, 180]`；
- 对私人住宅、墓地或封存地点，即使数据库保存坐标，接口仍必须按隐私策略最小披露。

## 6. 来源、审核和追踪目标类型

通用目标类型增加：

```text
culture_item
migration_event
culture_site
```

- `source_binding.target_type` 可以引用三类文化对象。
- `revision.target_type` 和审核提交契约预留三类对象。
- 追踪对象搜索与统一 trace 契约预留三类对象。
- 本阶段只定义数据和契约；来源绑定校验、审核应用、权限、日志与追踪运行时由 #168、#170、#171 实现。

## 7. API 聚合边界

### 7.1 列表

- 使用后端分页，不允许前端全量拉取后截取。
- 支持关键词、分类/类型、支派、状态、隐私、来源覆盖、精选状态和排序。
- 列表 DTO 不返回完整长正文、封存地址、原始附件路径或完整审核 Diff。

### 7.2 详情

详情契约聚合：

- 宗族和支派业务名称；
- 关联人物业务名称；
- 来源和附件摘要；
- 审核摘要；
- 当前对象 `allowedActions`；
- 创建、更新、状态和版本信息。

`allowedActions` 只是后端授权结果的展示契约，前端按钮隐藏不能替代后端鉴权。

### 7.3 文化总览

`culture-overview` 只返回当前用户可见且 `official` 的摘要，并对每类结果设置数量上限。首页不得自行尝试不存在的 `familyInstruction`、`familyMotto`、`clanMotto` 等字段。

## 8. 旧字段兼容策略

### 8.1 兼容字段

| 旧字段 | 新模型映射方向 | 本阶段策略 |
|---|---|---|
| `clan.hall_name` | `culture_item(category=hall_name)` | 旧字段只读兼容，不自动生成新记录，不双写 |
| `clan.commandery` | `culture_item(category=commandery)` | 旧字段只读兼容，不自动生成新记录，不双写 |
| `clan.origin_place` | `culture_item(category=surname_origin)` 的辅助信息 | 保留宗族基础字段，不等同完整源流正文 |
| `branch.migration_from` / `migration_to` | `migration_event` | 旧字段只读兼容，不作为多事件事实源，不双写 |

### 8.2 单一事实源切换条件

只有满足以下条件后，才能另行 Issue 收口旧字段：

1. 新模型的维护、审核、来源、权限和追踪闭环已上线；
2. 历史数据完成可审计迁移和抽样核验；
3. 首页和文化页全部使用新聚合接口；
4. 旧客户端和导出链路不再依赖旧字段；
5. 已完成灰度、回滚演练和正式评审。

在此之前禁止新旧模型双向同步。

## 9. 数据库迁移与回滚

本阶段迁移只新增表、约束和索引，不更新历史业务数据，因此锁影响主要是系统目录和新对象创建，不扫描 `clan`、`branch`、`person` 等历史大表。

回滚原则：

- 未产生业务数据时，可以使用 `database/rollback/` 中的人工脚本按依赖逆序删除新表；
- 已产生业务数据后不得直接执行破坏性回滚，必须先备份并使用更高版本的前向补偿迁移；
- 不修改已经进入 `main` 或共享环境的历史 Flyway 文件；
- 不使用 `flyway repair` 或手工修改 `flyway_schema_history` 掩盖问题。

## 10. 后续实现顺序

```text
#166 模型与契约
  → #167 文化资料核心后端
    → #168 来源、审核、权限与追踪
      → #169 文化资料库前端
        → #170 迁徙脉络
          → #171 文化场所
            → #172 首页单一事实源与端到端准出
```
