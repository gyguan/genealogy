-- Issue #124: stable correlation across revision -> review -> apply/reject -> operation log.
-- Historical rows deliberately remain NULL when no trustworthy relation can be derived.
-- Lock impact: metadata-only column additions plus partial indexes; no full-table backfill of revision/log data.

alter table revision
    add column if not exists trace_id uuid;

alter table review_task
    add column if not exists trace_id uuid;

alter table operation_log
    add column if not exists trace_id uuid,
    add column if not exists revision_id bigint,
    add column if not exists review_task_id bigint,
    add column if not exists business_target_type varchar(50),
    add column if not exists business_target_id bigint,
    add column if not exists event_result varchar(32);

-- Only copy a trace when the linked revision already has a trustworthy trace id.
update review_task task
set trace_id = revision.trace_id
from revision
where task.revision_id = revision.id
  and task.trace_id is null
  and revision.trace_id is not null;

create unique index if not exists uq_revision_trace_id
    on revision(trace_id)
    where trace_id is not null;

create index if not exists idx_review_task_trace_created
    on review_task(trace_id, created_at, id)
    where trace_id is not null;

create index if not exists idx_operation_log_trace_created
    on operation_log(trace_id, created_at, id)
    where trace_id is not null;

create index if not exists idx_operation_log_revision_created
    on operation_log(revision_id, created_at, id)
    where revision_id is not null;

create index if not exists idx_operation_log_review_task_created
    on operation_log(review_task_id, created_at, id)
    where review_task_id is not null;

create index if not exists idx_operation_log_business_target_created
    on operation_log(clan_id, business_target_type, business_target_id, created_at desc, id desc)
    where business_target_type is not null and business_target_id is not null;

comment on column revision.trace_id is 'Stable id for one revision lifecycle. Historical unknown rows remain null.';
comment on column review_task.trace_id is 'Copied from revision.trace_id; not an authorization credential.';
comment on column operation_log.trace_id is 'Optional stable lifecycle correlation id.';
comment on column operation_log.event_result is 'submitted, approved, rejected, applied or failed lifecycle result.';
