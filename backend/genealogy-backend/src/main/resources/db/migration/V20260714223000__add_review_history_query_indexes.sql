-- Issue #109: support paged review center queries and target review history.
-- Risk: low. Adds concurrent-read indexes only; no data rewrite or column changes.
-- Lock impact: short SHARE locks while each index is created.
-- Rollback: keep indexes when rolling back application code, or drop them in a reviewed higher-version compensation migration.

create index if not exists idx_revision_clan_submitter_time
    on revision(clan_id, submitter_id, submit_time desc, id desc);

create index if not exists idx_revision_clan_target_time
    on revision(clan_id, target_type, target_id, submit_time desc, id desc);

create index if not exists idx_review_task_clan_status_created
    on review_task(clan_id, status, created_at desc, id desc);

create index if not exists idx_review_task_clan_reviewer_reviewed
    on review_task(clan_id, reviewer_id, reviewed_at desc, id desc)
    where reviewed_at is not null;

create index if not exists idx_review_task_clan_branch_status_created
    on review_task(clan_id, branch_id, status, created_at desc, id desc);
