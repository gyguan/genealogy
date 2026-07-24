-- Purpose: persist review quality-check execution, scope, result and audit metadata.
-- Lock impact: creates a new table and indexes only; no existing table rewrite.
-- Historical data: no backfill is required because pre-existing review tasks return NOT_CHECKED.
-- Compatibility: additive migration; existing approval/rejection data remains unchanged.
-- Verification: trigger a check, query it by UUID, and confirm approval is blocked for BLOCKING results.
-- Rollback/compensation: deploy a forward migration that disables writes first, then drops the table and indexes if required.

CREATE TABLE review_quality_check (
    id uuid PRIMARY KEY,
    clan_id bigint NOT NULL,
    scope_type varchar(32) NOT NULL,
    mode varchar(32) NOT NULL,
    status varchar(32) NOT NULL,
    scope_fingerprint varchar(128) NOT NULL,
    task_ids_json text NOT NULL,
    query_json text,
    rule_codes_json text,
    summary_json text,
    rules_json text,
    review_blocked boolean NOT NULL DEFAULT false,
    triggered_by bigint NOT NULL,
    queued_at timestamp without time zone NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    failure_code varchar(80),
    failure_message varchar(500),
    CONSTRAINT ck_review_quality_scope_type CHECK (scope_type IN ('TASK_IDS', 'QUERY')),
    CONSTRAINT ck_review_quality_mode CHECK (mode IN ('INCREMENTAL', 'FULL', 'REVIEW_GATE')),
    CONSTRAINT ck_review_quality_status CHECK (status IN ('QUEUED', 'RUNNING', 'PASSED', 'ISSUES_FOUND', 'FAILED'))
);

CREATE INDEX idx_review_quality_check_clan_time
    ON review_quality_check (clan_id, queued_at DESC);

CREATE UNIQUE INDEX uk_review_quality_check_active_scope
    ON review_quality_check (clan_id, scope_fingerprint)
    WHERE status IN ('QUEUED', 'RUNNING');
