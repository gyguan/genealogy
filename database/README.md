# Database

本目录用于存放中国式族谱系统的数据库设计、初始化脚本和迁移草案。

## 文件说明

| 文件 | 说明 |
|---|---|
| schema-draft.sql | MVP 1 核心表结构草案 |

## MVP 1 核心表

```text
clan
branch
generation_scheme
generation_word
person
relationship
source
attachment
source_binding
revision
review_task
user_account
clan_member
role
member_role
import_batch
import_row
export_task
operation_log
```

## 设计原则

1. 人物和关系分离。
2. 关系作为独立对象，可绑定来源和审核。
3. 来源通过 source_binding 绑定到不同对象。
4. 正式数据修改通过 revision + review_task。
5. 所有核心表保留 clan_id，确保宗族数据隔离。
