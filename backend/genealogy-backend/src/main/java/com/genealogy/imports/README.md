# Imports module

## Main call chain

```text
Controller
  -> ImportAsyncApplicationService        upload validation, idempotency and job submission
  -> ImportJobExecutionApplicationService compatibility facade and execution query mapping
       -> ImportJobCommandService          pause, resume, cancel and manual retry
       -> ImportJobStateMachine            authoritative state transitions
  -> ImportJobExecutionCoordinatorService claim, lease validation, release and failure recovery
  -> chunk processors / publisher          bounded parsing, draft creation and official-data publication
```

## Transaction and concurrency boundaries

- Submission persists the job and recoverable payload in one application use case.
- Commands authorize the actor before invoking the state machine and saving the result.
- Worker claims use PostgreSQL `FOR UPDATE SKIP LOCKED` with stable ordering.
- Progress, release and failure writes require the current unexpired `leaseOwner`.
- A stale worker must receive a stable business error and must not update the task.
- Review and publication remain separate from parsing so failed publication can resume from its own stage.

## Required validation

```bash
mvn test
mvn verify
```

Changes to claims, leases, retries or state transitions must run the state-machine, coordinator and PostgreSQL integration suites.
