-- Re-versioned from V5__source_binding_review_indexes.sql.
-- Purpose: add source binding review query indexes.
-- Issue/PR: #150 / PR #151
-- Risk: low
-- Lock impact: creates indexes on revision, review_task and source_binding.
-- Data volume: index build scans the affected tables.
-- Compatibility: executes after source binding status fields are available.
-- Rollback/Compensation: drop indexes in a reviewed forward compensation migration if required.
-- Verification: run the Flyway uniqueness check and PostgreSQL startup check.

create index if not exists idx_revision_source_binding_pending
    on revision (target_type, target_id, status)
    where target_type = 'source_binding';

create index if not exists idx_review_task_revision_status
    on review_task (revision_id, status);

create index if not exists idx_source_binding_active_target
    on source_binding (source_id, target_type, target_id, binding_status);
