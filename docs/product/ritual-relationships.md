# 中国式宗法关系模型

## 设计目标

在原有 `parent_child / spouse / adoptive / successor / out_adoption` 基础上，补强中国式族谱中的宗法语义，核心是把关系拆成两条轴：

```text
血缘关系：说明自然亲缘，例如生父、生母、生子。
礼法承嗣关系：说明谱牒与宗法身份，例如入继、出继、承祧、兼祧、嗣子。
```

## 字段模型

`relationship` 表新增字段：

| 字段 | 含义 |
|---|---|
| relation_category | 关系分类：blood / ritual / marriage / status |
| ritual_relation_type | 宗法承嗣细分类型：in_adoption / out_adoption / successor / dual_successor / heir_son / no_descendant |
| succession_reason | 立嗣原因、承嗣说明、谱文考证说明 |
| successor_branch_id | 承继房支 ID，用于表示入继/承祧/兼祧承接哪一房 |

## 关系类型

| relation_type | relation_category | 中文语义 |
|---|---|---|
| parent_child | blood | 生父母/亲生子女关系 |
| spouse | marriage | 配偶、继配、侧室 |
| adoptive | ritual | 收养/嗣养关系，历史兼容 |
| in_adoption | ritual | 入继/继嗣 |
| out_adoption | ritual | 出继/出嗣 |
| successor | ritual | 承祧 |
| dual_successor | ritual | 兼祧 |
| heir_son | ritual | 嗣子 |
| no_descendant | status | 无嗣状态标记 |

## 常用标签

| relation_label | 中文语义 |
|---|---|
| biological_father | 生父 |
| biological_mother | 生母 |
| biological_parent | 生父母 |
| legal_father | 嗣父 |
| legal_mother | 嗣母 |
| legal_parent | 嗣父母 |
| spouse | 配偶/正配 |
| second_spouse | 继配 |
| concubine | 侧室 |
| heir_successor | 承祧人 |
| dual_successor | 兼祧人 |
| heir_son | 嗣子 |
| in_adopted | 入继人 |
| out_adopted | 出继人 |
| no_descendant | 无嗣 |

## 示例

### 生父子

```json
{
  "fromPersonId": 1,
  "toPersonId": 2,
  "relationType": "parent_child",
  "relationLabel": "biological_father",
  "relationCategory": "blood",
  "isBiological": true,
  "isLineageRelation": true
}
```

### 入继

```json
{
  "fromPersonId": 10,
  "toPersonId": 20,
  "relationType": "in_adoption",
  "relationLabel": "legal_father",
  "relationCategory": "ritual",
  "ritualRelationType": "in_adoption",
  "successorBranchId": 3,
  "successionReason": "本房无嗣，入继承祧",
  "isBiological": false,
  "isLineageRelation": true
}
```

### 兼祧

```json
{
  "fromPersonId": 30,
  "toPersonId": 40,
  "relationType": "dual_successor",
  "relationLabel": "dual_successor",
  "relationCategory": "ritual",
  "ritualRelationType": "dual_successor",
  "successorBranchId": 5,
  "successionReason": "兼祧二房"
}
```

### 继配

```json
{
  "fromPersonId": 50,
  "toPersonId": 60,
  "relationType": "spouse",
  "relationLabel": "second_spouse",
  "relationCategory": "marriage"
}
```

### 无嗣

```json
{
  "fromPersonId": 70,
  "toPersonId": 70,
  "relationType": "no_descendant",
  "relationLabel": "no_descendant",
  "relationCategory": "status",
  "ritualRelationType": "no_descendant",
  "successionReason": "谱载无嗣"
}
```

## 分阶段落地建议

1. 第一阶段：后端模型、DTO、校验和数据库迁移，已实现。
2. 第二阶段：前端关系录入页增加关系分类、宗法类型、承继房支、立嗣原因字段。
3. 第三阶段：把血缘树和礼法承嗣树在世系图中分层展示。
4. 第四阶段：增加承嗣规则校验，例如同房承祧唯一、兼祧可多房、无嗣后不允许再挂生子等。
