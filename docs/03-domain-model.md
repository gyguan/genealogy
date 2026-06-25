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
```

这样可以追溯某个人物、某个父子关系、某个支派迁徙或某个字辈来自哪本谱、哪一页、哪段原文。

## 审核模型

正式数据修改不直接落表，而是生成：

```text
revision → review_task → approve/reject → apply
```

审核通过后才写入正式数据。

## 状态枚举

人物数据状态：

```text
draft
pending_review
official
rejected
archived
```

审核状态：

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
private
```
