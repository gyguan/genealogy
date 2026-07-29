# Backend Repository Performance and Module Quality Baseline

## Scope

This baseline applies to Tree, Import, Review, Source, Member, Attachment, Culture and Audit Log repositories.

## Query rules

1. User-facing lists must accept `Pageable`, use `Page`/`Slice`, or enforce a documented hard limit.
2. Stable ordering must end with a unique key, normally `id`.
3. Collection parameters larger than 500 IDs must use a shared deterministic batcher.
4. Repository calls must not execute inside loops unless the loop is explicitly bounded and the query count is asserted.
5. Filtering, sorting and truncation that can be expressed by PostgreSQL must not be deferred to unbounded in-memory processing.
6. Tree queries use field-level detached read snapshots; normal CRUD repositories remain entity based.

## Tree read model

Tree person queries select only graph rendering, visibility, privacy and deterministic ordering fields. Tree relationship queries select only edge rendering, status and lineage fields. The snapshots are detached and are never persisted.

Existing semantics remain unchanged:

- ID collections are partitioned into batches of 500.
- Results are deduplicated by primary key.
- Person order is `generation_no`, `person_code`, `id`.
- Relationship order is endpoint pair followed by `id`.
- Branch candidates use `maxNodes + 1`; relationship candidates use `maxEdges + 1`.
- Depth, node and edge truncation warnings remain stable.

## Reproducible performance evidence

Use `scripts/generate-tree-performance-data.py` with 10,000, 100,000 and 1,000,000 person profiles. Save evidence under an issue or workflow artifact with:

- dataset seed and scale;
- PostgreSQL version and configuration;
- exact `EXPLAIN (ANALYZE, BUFFERS, WAL, FORMAT JSON)` output;
- SQL count and cumulative SQL time;
- total response duration;
- returned node/edge/list size;
- peak process heap delta;
- truncation and warning values.

A change is acceptable when result semantics are identical and p95 response duration, SQL count and peak heap do not regress by more than 10% against the same dataset and environment.

## Module test gates

`mvn verify` enforces three levels:

- global bundle line coverage: 10%;
- core policy/query packages: line 25%, branch 15%;
- key application packages: line 12%.

Core logic must be tested as pure unit tests. Repository behavior is validated primarily with PostgreSQL integration tests, deterministic ordering assertions and query-contract tests. CI publishes the standard JaCoCo HTML/XML/CSV report, whose package rows identify the regressed module.
