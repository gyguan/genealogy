# Review Tasks API Contract

New API paths:

```text
POST /api/v1/clans/{clanId}/review-tasks
GET  /api/v1/clans/{clanId}/review-tasks/pending
GET  /api/v1/review-tasks/my-submissions
GET  /api/v1/review-tasks/{reviewTaskId}
GET  /api/v1/review-tasks/{reviewTaskId}/diff
POST /api/v1/review-tasks/{reviewTaskId}/approve
POST /api/v1/review-tasks/{reviewTaskId}/reject
```

Legacy compatibility paths:

```text
POST /api/v1/reviews/tasks?clanId={clanId}
GET  /api/v1/reviews/tasks?clanId={clanId}
GET  /api/v1/reviews/my-submissions
GET  /api/v1/reviews/tasks/{reviewTaskId}
GET  /api/v1/reviews/tasks/{reviewTaskId}/diff
POST /api/v1/reviews/tasks/{reviewTaskId}/approve
POST /api/v1/reviews/tasks/{reviewTaskId}/reject
```

New frontend code should use `/api/v1/review-tasks` routes only.
