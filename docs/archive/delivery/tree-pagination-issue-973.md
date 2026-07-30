# Issue #973 — Tree 查询排序、分页与截断契约

## 查询分类

Tree 查询分为两类：

1. **图谱有界查询**：人物 ID、关系 outgoing/incoming 等遍历路径。允许按 500 个 ID 分批查询，但批次合并后必须按稳定唯一键恢复全局顺序，并由上层统一执行节点、边上限与 truncated/warning 语义。
2. **标准列表分页**：分支范围人物列表。过滤、全局排序、offset 和 limit 必须在同一条数据库查询中完成，不允许每批限流后在服务层 `subList`。

## 稳定排序

- 人物 ID 查询：`id`。
- 分支人物分页：`generation_no NULLS LAST, person_code, id`。
- outgoing 关系：`from_person_id, to_person_id, id`。
- incoming 关系：`to_person_id, from_person_id, id`。

所有排序均以唯一主键 `id` 作为最终兜底，输入 ID 顺序和 batch size 不得影响结果。

## 分页策略

分支人物查询使用单条 JPQL constructor projection：

- `branch_id IN (:branchIds)` 完成全局过滤；
- 数据库执行稳定排序；
- `setFirstResult(offset)` 与 `setMaxResults(pageSize)` 完成分页；
- 不执行无边界内存聚合或 `subList` 分页。

图谱遍历不是传统总量分页。调用方使用统一配置计算 `maxNodes + 1`、`maxEdges + 1`，多取一条判断截断，再返回稳定的 warning/truncated 标识。

## PostgreSQL 性能验证

在 1 万、10 万和 100 万人物数据集上执行：

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT ...
FROM person
WHERE clan_id = ?
  AND branch_id = ANY (?)
  AND data_status = ANY (?)
  AND deleted_at IS NULL
ORDER BY generation_no NULLS LAST, person_code, id
OFFSET ? LIMIT ?;
```

使用现有 Tree 人物组合索引，记录实际行数、排序方式、buffer hit/read、执行时间与返回条数。相同数据、不同 branch ID 输入顺序必须产生完全相同的结果页。

## 回归门禁

`TreeReadModelQueryContractTest` 阻止以下模式重新出现：

- 每个 branch batch 单独 `setMaxResults`；
- 合并后 `subList` 分页；
- 缺少 offset/limit 的数据库分页；
- batched ID 查询不恢复全局确定性排序。
