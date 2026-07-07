# Revision Review Closed Loop

## 1. 目标

族谱正式数据必须经过审核闭环后才能进入下一步关联和正式展示。核心路径如下：

```text
业务对象创建/修改 -> 草稿态 -> 提交审核 -> 待审核态 -> 审核通过/驳回 -> 生效/退回
```

正式数据只能通过以下路径写入：

```text
business mutation -> revision/audit_record -> review_task -> approve/reject -> RevisionApplyService
```

## 2. 审核对象范围

当前进入审核流的核心业务对象包括：

```text
person              人物
relationship        关系
source              来源
generation_scheme   字辈方案
branch              支派
```

宗族 `clan` 暂不纳入审核流，作为建谱容器先行创建。

附件、来源绑定、导入任务、操作日志暂不作为独立审核对象；其中来源绑定依赖已审核通过的来源和已审核通过的绑定对象。

## 3. 业务对象状态模型

业务对象统一使用以下生命周期状态：

```text
draft -> pending_review -> official
                  \
                   -> rejected
```

| 状态 | 语义 | 是否可编辑 | 是否可提交审核 | 是否可被下一步关联 |
|---|---|---:|---:|---:|
| `draft` | 草稿，尚未提交审核 | 是 | 是 | 否 |
| `pending_review` | 待审核，已生成审核任务 | 否，或仅允许撤回 | 否 | 否 |
| `official` | 正式数据，审核通过并生效 | 否，需走变更审核 | 否 | 是 |
| `rejected` | 已驳回，可修改后重新提交 | 是 | 是 | 否 |

### 3.1 rejected 可重新提交

`rejected` 不是终态。被驳回对象允许用户修改后重新提交审核：

```text
rejected -> 修改 -> pending_review -> official/rejected
```

重新提交审核时，应复用原业务对象 ID，并创建新的审核记录和审核任务。

### 3.2 状态字段映射

不同对象历史上使用了不同字段，统一语义如下：

| 对象 | 状态字段 | 合法业务状态 |
|---|---|---|
| 人物 | `person.data_status` | `draft / pending_review / official / rejected` |
| 关系 | `relationship.data_status` | `draft / pending_review / official / rejected` |
| 来源 | `source.verification_status` | `draft / pending_review / official / rejected` |
| 支派 | `branch.status` | `draft / pending_review / official / rejected` |
| 字辈方案 | `generation_scheme.status` | `draft / pending_review / official / rejected` |

审核任务和审核记录属于流程状态，仍可使用：

```text
pending / approved / rejected
```

它们不等同于业务对象状态，不应混用。

## 4. 创建页内提交审核

审核入口不再只放在单独的“提交审核”步骤中。P0 改造后，每个创建页面都应提供：

```text
保存草稿
保存并提交审核
```

### 4.1 建谱向导入口设计

| 页面 | 入口设计 | 审核对象 |
|---|---|---|
| 建立支派 | 保存草稿 / 保存并提交审核 / 追加草稿 | `branch` |
| 维护字辈 | 保存草稿 / 保存并提交审核 | `generation_scheme` |
| 录入人物 | 保存草稿 / 保存草稿继续录入 / 保存并提交审核 | `person` |
| 建立关系 | 保存关系草稿 / 保存并提交审核 | `relationship` |
| 绑定来源 | 保存来源草稿 / 保存并提交审核 / 绑定来源 | `source` |

### 4.2 审核进度步骤

原“提交审核”步骤调整为“审核进度”。定位如下：

```text
查看待审任务
查看审核结果
补充提交草稿/驳回对象
```

它不再是唯一提交入口，而是审核进度和兜底补充入口。

## 5. 下一步关联门禁

新创建对象默认不是正式数据，必须审核通过后才能被下一步选择和关联。

| 当前步骤 | 下一步依赖 | 允许被选择的对象 |
|---|---|---|
| 维护字辈 | 支派 | `branch.status = official` |
| 录入人物 | 支派、字辈方案 | `branch.status = official`，`generation_scheme.status = official` |
| 建立关系 | 中心人物 | `person.data_status = official` |
| 绑定来源 | 来源、人物、关系、支派 | 对应对象状态为 `official` |
| 查看世系 | 人物、关系 | 对应对象状态为 `official` |

草稿、待审核、驳回对象不允许进入正式关联链路，避免未审核数据污染正式族谱。

## 6. 后端审核语义

### 6.1 提交审核

提交审核时，业务对象状态从 `draft` 或 `rejected` 进入 `pending_review`。

```text
draft/rejected -> submit review -> pending_review
```

重复提交控制：同一对象存在待审核任务时，应拒绝再次提交。

建议后端强校验：

```text
允许提交：draft、rejected
禁止提交：pending_review、official、archived
```

### 6.2 审核通过

审核通过时，`RevisionApplyService.apply` 将业务对象状态统一写为 `official`。

```text
pending_review -> approve -> official
```

适用对象：

```text
person.data_status = official
relationship.data_status = official
source.verification_status = official
branch.status = official
generation_scheme.status = official
```

### 6.3 审核驳回

审核驳回时，`RevisionApplyService.reject` 将业务对象状态统一写为 `rejected`。

```text
pending_review -> reject -> rejected
```

驳回对象可以修改后重新提交审核。

## 7. Revision payload 语义

以人物为例：

```text
changeType=person_create
before_data=null
after_data=full person snapshot with pending_review status

changeType=person_update
before_data=full previous person snapshot
after_data=full updated person snapshot with pending_review status

changeType=person_delete
before_data=full previous person snapshot
after_data=full person snapshot with deletedAt and pending_review status
```

其他对象可按相同模式扩展：

```text
branch_create/update/delete
source_create/update/delete
relationship_create/update/delete
generation_scheme_create/update/delete
```

## 8. 数据处理脚本

历史状态通过 Flyway 脚本统一迁移：

```text
backend/genealogy-backend/src/main/resources/db/migration/V24__normalize_review_object_status.sql
```

迁移规则：

| 历史状态 | 新状态 |
|---|---|
| `active` | `official` |
| `approved` | `official` |
| `verified` | `official` |
| `pending` | `pending_review` |
| `unverified` | `draft` |
| `reject` | `rejected` |
| `null / 空值` | `official` |

该脚本覆盖以下字段：

```text
person.data_status
relationship.data_status
branch.status
generation_scheme.status
source.verification_status
```

## 9. Review traceability

可追溯数据存储在：

```text
revision.before_data / audit_record.old_payload
revision.after_data / audit_record.new_payload
revision.diff_summary / audit_record.diff_summary
review_task.review_comment
audit_record.rejected_reason
source_binding records for evidence references
```

> 注：当前项目中审核记录实体命名存在 `revision` / `audit_record` 两套上下文，文档统一表达为审核记录快照。实际表结构以当前迁移脚本和实体为准。

## 10. 已实现范围

### 10.1 Person create/update/delete

人物创建、修改、删除应通过审核闭环进入正式数据：

```text
POST   /api/v1/clans/{clanId}/persons
PUT    /api/v1/persons/{personId}
DELETE /api/v1/persons/{personId}
```

行为：

```text
1. Mutation request builds before/after snapshots.
2. Service writes or marks a draft/pending_review object only.
3. Service creates revision/audit_record + review_task.
4. Search defaults to official data, so pending_review changes are not treated as formal data.
5. Approve calls RevisionApplyService.apply and writes official data.
6. Reject calls RevisionApplyService.reject and writes rejected status.
```

### 10.2 Person import

人物 CSV 导入应为每一行有效数据生成草稿/待审核对象：

```text
CSV row -> draft person -> revision/audit_record(person_create) -> review_task
```

导入成功不代表正式入谱，只有审核通过后才进入 `official`。

### 10.3 Generic review targets

`RevisionApplyService` 当前支持以下 target type 的审核生效和驳回：

```text
person
relationship
source
branch
generation_scheme
```

## 11. 后续增强项

### P1：批量提交审核

支持按范围批量提交：

```text
本次创建对象
当前支派草稿
当前宗族草稿
```

批量提交可按对象类型分组：

```text
人物：N 条
关系：N 条
来源：N 条
支派：N 条
字辈方案：N 条
```

### P2：审核批次

引入 `review_batch`，允许一组人物、关系、来源、字辈方案、支派作为同一个修谱批次提交审核。

目标：

```text
批次内连续录入
批次外不污染正式族谱
审核通过后一批对象整体生效
驳回时整批退回或部分退回
```

### P3：正式数据变更审核

`official` 对象不应重复走新增审核。后续应区分：

```text
新增审核：draft/rejected -> pending_review
变更审核：official -> change_revision -> pending_review -> official
```

Merge 可引入为：

```text
changeType=merge_person
before_data contains source/target snapshots
after_data contains canonical merged person snapshot
```
