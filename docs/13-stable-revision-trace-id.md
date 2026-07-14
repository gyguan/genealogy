# 13. 稳定 revision trace_id 设计

> 对应 Issue #124。本文定义一次业务变更从 revision 创建、审核任务、审核决策、正式生效到操作日志的稳定关联规则。

## 1. 目标与非目标

### 1.1 目标

- 每个新 revision 获得唯一、不可变的 `trace_id`。
- 该 revision 派生的 review task、通过/驳回、正式 apply 和 operation log 复用同一 `trace_id`。
- 同一业务对象的多次修改始终形成多条独立链路。
- 历史数据无法可靠关联时明确标记兼容状态，不伪造 trace。

### 1.2 非目标

- `trace_id` 不是权限凭证，不替代宗族、支派、隐私和功能权限校验。
- 不改变 `revision → review_task → approve/reject → apply` 规则。
- 不允许绕过审核直接更新正式数据。
- 不强制回填所有历史 revision 或日志。

## 2. 生命周期规则

```text
创建 revision
  ├─ 生成 trace_id = UUID
  ├─ 创建 review_task，复制 revision.trace_id
  └─ 写入 submitted 日志

审核通过
  ├─ review_task = approved
  ├─ 执行 RevisionApplyService / 专用 apply
  ├─ 写入 applied 日志
  └─ 写入 approved 日志

审核驳回
  ├─ review_task = rejected
  ├─ revision = rejected
  └─ 写入 rejected 日志

驳回后重提
  └─ 新 revision + 新 trace_id，不复用旧链路
```

`trace_id` 在 revision 生命周期内不可修改。若 review task 的 trace 与其 revision 不一致，追踪接口返回 `inconsistent`，而不是静默合并。

## 3. 数据模型

### 3.1 revision

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `trace_id` | UUID | 新数据非空、唯一部分索引 | 单次变更生命周期标识；历史记录允许为空 |

应用通过 JPA `@PrePersist` 生成 UUID。数据库迁移不对历史 revision 执行随机回填，因为随机值只能证明“有 ID”，不能证明真实关联。

### 3.2 review_task

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `trace_id` | UUID | 可空、普通索引 | 创建任务时从 revision 复制 |

迁移仅对“revision 已有可信 trace”的任务补齐，历史空 revision 不回填。

### 3.3 operation_log

新增：

- `trace_id`
- `revision_id`
- `review_task_id`
- `business_target_type`
- `business_target_id`
- `event_result`

`operation_log` 不增加 revision/review task 外键。日志服务使用 `REQUIRES_NEW`，主事务中的 revision/task 可能尚未提交；外键会让独立日志事务错误依赖父事务可见性。关联字段用于检索与取证，真实性由应用写入和追踪一致性校验保证。

## 4. 索引

- `revision(trace_id)`：唯一部分索引。
- `review_task(trace_id, created_at, id)`：按链路读取审核过程。
- `operation_log(trace_id, created_at, id)`：按链路时间排序。
- `operation_log(revision_id, created_at, id)`。
- `operation_log(review_task_id, created_at, id)`。
- `operation_log(clan_id, business_target_type, business_target_id, created_at desc, id desc)`：对象追踪检索。

所有 trace 索引均使用 `WHERE ... IS NOT NULL`，避免历史空值放大索引。

## 5. 追踪聚合

统一追踪详情新增 `changeChains`：

- `complete`：revision 与所有任务 trace 一致。
- `legacy_partial`：历史 revision 无 trace；使用 `legacy-revision:<id>` 独立成链。
- `inconsistent`：revision 与 task trace 缺失或不一致。
- `orphan_partial`：存在 trace 日志，但当前可见 revision 不在返回窗口或不可用。

聚合优先级：

1. `trace_id`；
2. `revision_id`；
3. `review_task_id`；
4. 历史 revision 按自身 ID 独立展示。

绝不使用对象 ID + 时间相近或日志文本推断历史关联。

## 6. 历史兼容与补偿

### 6.1 上线时

- 迁移只新增可空字段和部分索引。
- 新版本应用写入 trace。
- 历史无 trace 的记录继续可读，覆盖范围返回 `traceIds` 缺失说明。

### 6.2 可执行补偿

仅允许确定性补偿：

```sql
update review_task task
set trace_id = revision.trace_id
from revision
where task.revision_id = revision.id
  and task.trace_id is null
  and revision.trace_id is not null;
```

不允许根据对象、操作者、时间窗口或文本相似度批量猜测 operation log 的 trace。

## 7. 发布与回滚

### 7.1 发布顺序

1. 执行向前兼容迁移；
2. 发布写入 trace 的应用；
3. 观察空 trace 新增率和不一致链路；
4. 启用前端单次变更链路视图。

### 7.2 回滚

应用回滚后新增列保持可空，不影响旧版本读写。数据库列和索引不在紧急回滚中删除，避免长表 DDL 和已写 trace 丢失；后续确认无依赖后再通过新迁移清理。

## 8. 安全与审计

- trace 查询仍先执行 `operation_log.view`、宗族、支派和对象隐私校验。
- trace ID 不允许扩大可见对象集合。
- 403/404 不返回 trace、revision、task 或业务摘要。
- CSV 技术导出可以包含关联字段，但继续受 `operation_log.export` 控制。
