-- Applicable migration: V20260715094500__add_operation_risk_audit_fields.sql
-- Preconditions:
-- 1. Deploy application code that no longer writes or reads operation risk fields.
-- 2. Export risk audit evidence if it must be retained outside operation_log.
-- Risk: dropping columns permanently removes risk classification and disposition metadata, but not original operation logs.
-- Verification: confirm the four columns, constraints and indexes are absent after execution.

DROP INDEX IF EXISTS idx_operation_log__risk_branch_recent;
DROP INDEX IF EXISTS idx_operation_log__risk_type_recent;
DROP INDEX IF EXISTS idx_operation_log__risk_level_recent;
DROP INDEX IF EXISTS idx_operation_log__risk_recent;

ALTER TABLE operation_log
    DROP CONSTRAINT IF EXISTS ck_operation_log__disposition_status,
    DROP CONSTRAINT IF EXISTS ck_operation_log__risk_event_type,
    DROP CONSTRAINT IF EXISTS ck_operation_log__risk_level,
    DROP COLUMN IF EXISTS branch_id,
    DROP COLUMN IF EXISTS disposition_status,
    DROP COLUMN IF EXISTS risk_event_type,
    DROP COLUMN IF EXISTS risk_level;

-- Permission rows and historical role grants are intentionally retained to avoid destructive RBAC rollback.
-- A later forward migration may retire operation_risk.view after all application references are removed.
