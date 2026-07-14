-- Issue #108: retain exclusion evidence for bulk import-row remediation.
-- Risk: low. Adds nullable columns and a partial lookup index; no historical data rewrite.
-- Lock impact: short ACCESS EXCLUSIVE lock while adding columns to import_job_row.
-- Compatibility: historical rows remain unchanged and are treated as not excluded.
-- Rollback: keep additive columns/index when rolling back application code, or use a reviewed higher-version compensation migration.
-- Verification: Flyway governance, PostgreSQL startup, exclusion/version-conflict tests, and review-summary tests.

alter table import_job_row
    add column if not exists excluded_reason text,
    add column if not exists excluded_by bigint,
    add column if not exists excluded_at timestamp;

create index if not exists idx_import_job_row_failed_selection
    on import_job_row(job_id, row_status, row_no)
    where row_status in ('invalid', 'retry_failed');
