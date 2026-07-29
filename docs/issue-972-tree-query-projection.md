# Issue #972 — Tree Query Projection Boundary

## Goal

Tree high-volume queries return immutable, Tree-owned read models instead of partially populated JPA entities. The public fragment contracts expose `TreePersonSnapshot` and `TreeRelationshipSnapshot` only.

## Query model

- `TreePersonSnapshot` contains identity, branch, display, ordering, status, privacy and ownership metadata required by graph rendering and visibility checks.
- `TreeRelationshipSnapshot` contains endpoints, relationship display fields, category, lineage flags, status and ownership metadata required by traversal and edge assembly.
- Both models are Java records and are not JPA entities.
- JPQL uses constructor expressions and typed queries; positional `Object[]` mapping is prohibited.

## Data minimization

Tree topology queries do not load narrative or detail-only person fields such as biography, epitaph, tomb place, education, occupation or title/honor. Those fields remain available through the person detail use case when explicitly requested.

## Compatibility boundary

The existing graph policy and assembly chain continues to receive detached compatibility objects from default CRUD repository adapters. The dedicated Tree query fragment itself remains projection-only and cannot return persistence entities. This keeps the API, privacy rules, ordering, batching and warning semantics stable while removing entity construction from the high-volume query implementation.

## Governance

`TreeReadModelQueryContractTest` enforces:

- constructor projection and typed query usage;
- no `Object[]` positional mapping;
- no persistence entity type in Tree query fragment contracts;
- no large narrative fields in topology queries;
- immutable record-based snapshots;
- retained batching, bounded result size and deterministic ordering.

## Compatibility

No Tree API path, request parameter, response field, privacy rule, status rule, batching threshold, pagination behavior or graph warning is changed by this issue.
