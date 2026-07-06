# Revision Review Closed Loop

## Goal

Formal data must be written through this path only:

```text
business mutation -> revision -> review_task -> approve/reject -> RevisionApplyService
```

## Implemented scope

### Person create/update/delete

Existing person mutation endpoints now route through `PersonRevisionApplicationService`:

```text
POST   /api/v1/clans/{clanId}/persons
PUT    /api/v1/persons/{personId}
DELETE /api/v1/persons/{personId}
```

Behavior:

```text
1. Mutation request builds before/after snapshots.
2. Service writes or marks a draft/pending_review object only.
3. Service creates revision + review_task through RevisionWorkflowApplicationService.
4. Search defaults to official data, so pending_review changes are not treated as formal data.
5. Approve calls RevisionApplyService.apply and writes official data from revision.after_data.
6. Reject calls RevisionApplyService.reject and rolls back from revision.before_data, or keeps new records as draft.
```

### Person import

Person CSV import now calls `PersonRevisionApplicationService.create` for every valid row.

```text
CSV row -> draft person -> revision(person_create) -> review_task
```

Import success means a pending revision was generated. The row becomes formal data only after approval.

## Revision payload semantics

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

## Review traceability

Traceable data is stored in:

```text
revision.before_data
revision.after_data
revision.diff_summary
review_task.review_comment
revision.rejected_reason
source_binding records for evidence references
```

## Extension points

`RevisionApplyService` now supports applying and rolling back payload snapshots for these target types:

```text
person
relationship
source
branch
generation_scheme
```

Relationship/source/branch/generation mutation endpoints should be migrated to `RevisionWorkflowApplicationService.submitRevision` in the same pattern as person mutations.

Merge can be introduced as `changeType=merge_person`, with before_data containing the source/target snapshots and after_data containing the canonical merged person snapshot.
