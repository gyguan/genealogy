# Issue #796 execution

## Implemented

- Added workbench quality check APIs for QUERY, DRAFT_IDS and WORKBENCH_SESSION scopes.
- Reused the shared quality rule engine introduced by #795.
- Persisted status, summary, rules, blocking result and audit information in the existing quality-check store.
- Added a server-side submission-gate endpoint that always reruns REVIEW_GATE rules and rejects blocked submissions.
- Connected the workbench overview to current-query, selected-draft, session and submission-gate checks.
- Added rule-level affected subject navigation and preserved URL/query/page context.
- Added loading, empty, failure, permission/conflict feedback paths.
- Added OpenAPI overlay and focused frontend contract tests.

## Safety boundary

Quality checks read workbench tasks and draft-oriented data only. They do not mutate formal genealogy records.
