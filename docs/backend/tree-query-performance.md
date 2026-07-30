# Tree Query Performance Baseline

## Scope

This document defines the repeatable PostgreSQL baseline for person lineage,
ancestor, descendant and branch graph queries. It does not raise the product
limits of depth 20, nodes 2,000 or edges 4,000.

## Data sets

Generate deterministic CSV fixtures with:

```bash
python scripts/generate-tree-performance-data.py --people 10000 --output target/tree-10k
python scripts/generate-tree-performance-data.py --people 100000 --output target/tree-100k
python scripts/generate-tree-performance-data.py --people 1000000 --output target/tree-1m
```

The graph contains a bounded-width parent-child tree and deterministic spouse
edges. Use PostgreSQL `COPY` into a dedicated benchmark clan after translating
`external_id` values to database IDs. Do not run the million-row generator in
normal pull-request CI.

## Query architecture

Graph-specific JPQL is owned by Spring Data repository fragments under
`com.genealogy.tree.repository`:

- `TreeRelationshipQueryRepository`
- `TreePersonQueryRepository`

The ordinary repositories retain CRUD and domain lookup responsibilities.
Outgoing, incoming and within-people queries share the same clan, data status,
soft-delete and relation-category predicates. Traversal frontiers and person ID
lookups are split into deterministic batches of 500 IDs, preventing unbounded
bind parameter lists. Branch graph queries remain bounded by the configured
node limit before loading relationships.

## Required measurements

Record each scenario three times after one warm-up run:

| Metric | Definition |
| --- | --- |
| SQL count | Statements executed for one API request |
| SQL time | Sum and p95 database execution time |
| Response time | End-to-end controller response time |
| Peak memory | Maximum process RSS or JVM committed heap delta |
| Result size | Returned nodes, edges and applied depth |
| Truncation | `hasMore` and warning codes |

The optimized result is acceptable when SQL count, mean response time and peak
memory do not regress against the same commit with repository batching disabled.

## EXPLAIN ANALYZE templates

Replace the sample IDs and statuses with values from the benchmark clan.

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)
SELECT *
FROM relationship
WHERE clan_id = :clan_id
  AND from_person_id = ANY(:frontier_ids)
  AND data_status = ANY(:statuses)
  AND deleted_at IS NULL
  AND relation_category = ANY(:categories)
ORDER BY from_person_id, to_person_id, id;
```

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)
SELECT *
FROM relationship
WHERE clan_id = :clan_id
  AND to_person_id = ANY(:frontier_ids)
  AND data_status = ANY(:statuses)
  AND deleted_at IS NULL
  AND relation_category = ANY(:categories)
ORDER BY to_person_id, from_person_id, id;
```

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)
SELECT *
FROM person
WHERE clan_id = :clan_id
  AND branch_id = ANY(:branch_ids)
  AND data_status = ANY(:statuses)
  AND deleted_at IS NULL
ORDER BY generation_no NULLS LAST, person_code, id
LIMIT :node_limit_plus_one;
```

Expected access paths are the partial composite indexes introduced by
`V20260729093000__optimize_tree_query_indexes.sql`. Save the JSON or text plan
with the benchmark result and verify that large-clan scenarios do not fall back
to an unbounded full-clan load.

## Stable truncation semantics

- **Depth limit**: traversal completes all visible edges in the current layer;
  if a visible next layer exists, `hasMore=true` and a depth-limit warning is
  emitted.
- **Node limit**: the root and previously accepted nodes remain stable. The edge
  that would introduce a node beyond the cap is not returned. `hasMore=true`
  and a node-limit warning are emitted.
- **Edge limit**: accepted nodes remain in the response; additional edges are
  omitted once the cap is reached. `hasMore=true` and an edge-limit warning are
  emitted.
- **Permission filtering**: filtered people and relationships are not counted as
  capacity truncation. They continue to use the partial-visibility warning.
- **Branch queries**: candidate people are loaded with `maxNodes + 1`, allowing
  the graph accumulator to distinguish an exact fit from a truncated result.

Pagination or batching must never remove a legal path inside the applied depth
and capacity limits. Batch results are deduplicated by entity ID and sorted by
the same deterministic keys used before the refactor.
